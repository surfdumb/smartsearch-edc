import { describe, it, expect } from 'vitest';
import { detectJobSpecIngest } from '../phantom-guard';

function makeInput(overrides: {
  candidate_name?: unknown;
  granola_title?: unknown;
  edc_data?: unknown;
} = {}) {
  return {
    candidate_name: 'Finney',
    granola_title: 'IV - Finney - Foo Corp',
    edc_data: {
      candidate_name: 'Finney',
      current_title: 'VP Business Development',
      current_company: 'Foo Corp',
    },
    ...overrides,
  };
}

describe('detectJobSpecIngest — candidate_name rule', () => {
  it('skips when name is "JS"', () => {
    expect(detectJobSpecIngest(makeInput({ candidate_name: 'JS' }))).toEqual({
      skip: true,
      reason: 'candidate_name_is_js',
    });
  });

  it('skips lowercase and whitespace-padded variants', () => {
    expect(detectJobSpecIngest(makeInput({ candidate_name: 'js' })).reason).toBe('candidate_name_is_js');
    expect(detectJobSpecIngest(makeInput({ candidate_name: ' js ' })).reason).toBe('candidate_name_is_js');
  });

  it('skips empty, whitespace-only, and missing names', () => {
    expect(detectJobSpecIngest(makeInput({ candidate_name: '' })).reason).toBe('empty_candidate_name');
    expect(detectJobSpecIngest(makeInput({ candidate_name: '   ' })).reason).toBe('empty_candidate_name');
    expect(detectJobSpecIngest(makeInput({ candidate_name: undefined })).reason).toBe('empty_candidate_name');
    expect(detectJobSpecIngest(makeInput({ candidate_name: null })).reason).toBe('empty_candidate_name');
  });

  it('passes real names through', () => {
    expect(detectJobSpecIngest(makeInput({ candidate_name: 'Finney' })).skip).toBe(false);
    expect(detectJobSpecIngest(makeInput({ candidate_name: 'J. Smith' })).skip).toBe(false);
    expect(detectJobSpecIngest(makeInput({ candidate_name: 'Jasmine' })).skip).toBe(false);
  });
});

describe('detectJobSpecIngest — granola_title rule', () => {
  it('skips "JS" prefixed titles with hyphen, en dash, and em dash', () => {
    expect(detectJobSpecIngest(makeInput({ granola_title: 'JS - Foo Corp Role' })).reason).toBe('granola_title_js_prefix');
    expect(detectJobSpecIngest(makeInput({ granola_title: 'JS – Foo Corp Role' })).reason).toBe('granola_title_js_prefix');
    expect(detectJobSpecIngest(makeInput({ granola_title: 'JS — Foo Corp Role' })).reason).toBe('granola_title_js_prefix');
    expect(detectJobSpecIngest(makeInput({ granola_title: ' js- Foo' })).reason).toBe('granola_title_js_prefix');
  });

  it('passes IV-style and dashless titles through', () => {
    expect(detectJobSpecIngest(makeInput({ granola_title: 'IV - Finney - Foo Corp' })).skip).toBe(false);
    // No dash after JS — conservative, locked-ticket regex
    expect(detectJobSpecIngest(makeInput({ granola_title: 'JS Foo Corp' })).skip).toBe(false);
    // "js" must be followed by a dash, not a letter
    expect(detectJobSpecIngest(makeInput({ granola_title: 'JSON Workshop - notes' })).skip).toBe(false);
  });

  it('ignores a missing granola_title', () => {
    expect(detectJobSpecIngest(makeInput({ granola_title: undefined })).skip).toBe(false);
  });
});

describe('detectJobSpecIngest — title/company rule', () => {
  function makeEdc(current_title: unknown, current_company: unknown) {
    const edc: Record<string, unknown> = { candidate_name: 'Real Person' };
    if (current_title !== undefined) edc.current_title = current_title;
    if (current_company !== undefined) edc.current_company = current_company;
    return makeInput({ candidate_name: 'Real Person', edc_data: edc });
  }

  it('skips when title AND company are both "Not mentioned"', () => {
    expect(detectJobSpecIngest(makeEdc('Not mentioned', 'Not mentioned')).reason).toBe('no_title_no_company');
  });

  it('skips case variants of the sentinel', () => {
    expect(detectJobSpecIngest(makeEdc('not mentioned', 'NOT MENTIONED')).reason).toBe('no_title_no_company');
  });

  it('skips when both are empty or absent', () => {
    expect(detectJobSpecIngest(makeEdc('', '')).reason).toBe('no_title_no_company');
    expect(detectJobSpecIngest(makeEdc(undefined, undefined)).reason).toBe('no_title_no_company');
    expect(detectJobSpecIngest(makeEdc(null, '  ')).reason).toBe('no_title_no_company');
  });

  it('one real value rescues the ingest', () => {
    expect(detectJobSpecIngest(makeEdc('', 'Acme')).skip).toBe(false);
    expect(detectJobSpecIngest(makeEdc('VP Sales', '')).skip).toBe(false);
    expect(detectJobSpecIngest(makeEdc('VP Sales', 'Not mentioned')).skip).toBe(false);
  });

  it('does NOT match other missing-data spellings (conservative)', () => {
    expect(detectJobSpecIngest(makeEdc('Not available', 'Not available')).skip).toBe(false);
    expect(detectJobSpecIngest(makeEdc('N/A', 'N/A')).skip).toBe(false);
  });

  it('non-string values count as present', () => {
    expect(detectJobSpecIngest(makeEdc(42, { nested: true })).skip).toBe(false);
  });

  it('fires regardless of a real candidate_name (ticket: skip on ANY rule)', () => {
    expect(detectJobSpecIngest(makeEdc('Not mentioned', '')).reason).toBe('no_title_no_company');
  });
});

describe('detectJobSpecIngest — malformed edc_data falls through to the 400', () => {
  it('never skips when edc_data is not a plain object, even with an empty name', () => {
    for (const edc_data of [undefined, null, 'a string', [], 42]) {
      expect(detectJobSpecIngest(makeInput({ candidate_name: '', edc_data }))).toEqual({
        skip: false,
        reason: null,
      });
    }
  });
});

describe('detectJobSpecIngest — valid candidate', () => {
  it('passes a fully valid input', () => {
    expect(detectJobSpecIngest(makeInput())).toEqual({ skip: false, reason: null });
  });
});
