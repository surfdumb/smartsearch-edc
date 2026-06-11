import { describe, it, expect } from 'vitest';
import { normalizeEdcData, normalizeScopeLabel, stripMotivationPrefix } from '../normalize-edc';
import type { EDCData } from '../types';

function makeEdc(overrides: Partial<EDCData> = {}): EDCData {
  return {
    candidate_name: 'Test Candidate',
    current_title: 'VP Sales',
    current_company: 'Acme',
    location: 'London, UK',
    scope_match: [],
    key_criteria: [],
    compensation: {
      current_base: '',
      current_total: '',
      expected_base: '',
      expected_total: '',
      flexibility: '',
    },
    notice_period: '3 months',
    why_interested: [],
    potential_concerns: [],
    our_take: { text: '' },
    search_name: 'Test Search',
    role_title: 'Test Role',
    generated_date: '2026-06-11',
    consultant_name: 'Test',
    ...overrides,
  };
}

describe('stripMotivationPrefix', () => {
  it('strips a leading "Motivation — " label (em dash)', () => {
    expect(stripMotivationPrefix('Motivation — Seeking growth')).toBe('Seeking growth');
  });

  it('strips en dash and hyphen variants, case-insensitively', () => {
    expect(stripMotivationPrefix('motivation – ready to move')).toBe('ready to move');
    expect(stripMotivationPrefix('MOTIVATION - exploring options')).toBe('exploring options');
  });

  it('leaves a clean hook untouched', () => {
    expect(stripMotivationPrefix('Seeking growth')).toBe('Seeking growth');
  });

  it('leaves a hook merely containing the word motivation untouched', () => {
    expect(stripMotivationPrefix('High motivation — wants impact')).toBe('High motivation — wants impact');
  });

  it('passes undefined through', () => {
    expect(stripMotivationPrefix(undefined)).toBeUndefined();
  });
});

describe('normalizeScopeLabel', () => {
  const req = 'Must consistently sell $3-5M annually in California';

  it('reduces "Name — role_requirement" to the bare name', () => {
    expect(normalizeScopeLabel(`Revenue Target — ${req}`, req)).toBe('Revenue Target');
  });

  it('matches across dash variants (hyphen tail vs en-dash requirement)', () => {
    // The live Jeffrey Green case: tail says $3-5M, requirement says $3–5M.
    expect(
      normalizeScopeLabel(
        'Revenue Target — Must consistently sell $3-5M annually in California',
        'Must consistently sell $3–5M annually in California',
      ),
    ).toBe('Revenue Target');
  });

  it('splits at the FIRST separator only (tail itself contains an em dash)', () => {
    const longReq =
      'Clinical supplies for clinical trials (primary and secondary packaging) — biotech primary, pharma secondary';
    expect(normalizeScopeLabel(`Industry Segment — ${longReq}`, longReq)).toBe('Industry Segment');
  });

  it('matches when the tail is a truncated prefix of the requirement', () => {
    expect(
      normalizeScopeLabel('Geography — California-based, within one hour of SF', 'California-based, within one hour of SF or San Diego biotech hubs'),
    ).toBe('Geography');
  });

  it('leaves a legitimate name with a colon alone when the tail is not the requirement', () => {
    expect(normalizeScopeLabel('P&L: Group', 'Full group P&L ownership across EMEA')).toBe('P&L: Group');
  });

  it('never prefix-matches a degenerate short tail', () => {
    expect(normalizeScopeLabel('P&L: G', 'Global P&L ownership across EMEA')).toBe('P&L: G');
  });

  it('leaves separators alone when there is no role_requirement to compare', () => {
    expect(normalizeScopeLabel('Revenue Target — $3-5M annually', undefined)).toBe(
      'Revenue Target — $3-5M annually',
    );
    expect(normalizeScopeLabel('Revenue Target — $3-5M annually', '')).toBe(
      'Revenue Target — $3-5M annually',
    );
  });

  it('leaves separator-free names untouched', () => {
    expect(normalizeScopeLabel('Revenue Target', req)).toBe('Revenue Target');
  });
});

describe('normalizeEdcData', () => {
  it('returns clean input unchanged — same reference', () => {
    const edc = makeEdc({
      motivation_hook: 'Seeking growth',
      scope_match: [
        { scope: 'Geography', candidate_actual: 'California', role_requirement: 'California-based', alignment: 'strong' },
      ],
    });
    expect(normalizeEdcData(edc)).toBe(edc);
  });

  it('strips the motivation prefix without touching anything else', () => {
    const edc = makeEdc({ motivation_hook: 'Motivation — Seeking growth' });
    const out = normalizeEdcData(edc);
    expect(out).not.toBe(edc);
    expect(out.motivation_hook).toBe('Seeking growth');
    expect(out.scope_match).toBe(edc.scope_match);
    expect(edc.motivation_hook).toBe('Motivation — Seeking growth'); // input not mutated
  });

  it('reduces polluted scope labels and keeps role_requirement populated', () => {
    const req = '$3-5M annual revenue in California territory';
    const edc = makeEdc({
      scope_match: [
        { scope: `Revenue Target — ${req}`, candidate_actual: '$4M', role_requirement: req, alignment: 'strong' },
        { scope: 'Geography', candidate_actual: 'San Diego', role_requirement: 'California-based', alignment: 'strong' },
      ],
    });
    const out = normalizeEdcData(edc);
    expect(out.scope_match[0].scope).toBe('Revenue Target');
    expect(out.scope_match[0].role_requirement).toBe(req);
    expect(out.scope_match[1]).toBe(edc.scope_match[1]); // untouched row keeps its reference
    expect(edc.scope_match[0].scope).toBe(`Revenue Target — ${req}`); // input not mutated
  });

  it('does not add a motivation_hook key when one was absent', () => {
    const req = 'California-based within one hour of SF biotech hubs';
    const edc = makeEdc({
      scope_match: [
        { scope: `Geography — ${req}`, candidate_actual: 'SF', role_requirement: req, alignment: 'strong' },
      ],
    });
    const out = normalizeEdcData(edc);
    expect(out.scope_match[0].scope).toBe('Geography');
    expect('motivation_hook' in out).toBe(false);
  });

  it('tolerates missing or malformed fields', () => {
    const edc = makeEdc();
    delete (edc as Record<string, unknown>).scope_match;
    expect(normalizeEdcData(edc)).toBe(edc);
    expect(normalizeEdcData(null as unknown as EDCData)).toBeNull();
    const withBadRow = makeEdc({
      scope_match: [null as unknown as EDCData['scope_match'][number]],
    });
    expect(normalizeEdcData(withBadRow)).toBe(withBadRow);
  });
});
