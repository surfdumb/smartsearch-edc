import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureDimensionIds,
  stampDimensionIds,
  buildNameToIdIndex,
  dimNameKey,
  newDimensionId,
} from '../scope-dimension-id';

describe('newDimensionId', () => {
  it('mints distinct ids', () => {
    const a = newDimensionId();
    const b = newDimensionId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('dimNameKey', () => {
  it('trims but does NOT lowercase or strip punctuation (exact match only)', () => {
    expect(dimNameKey('  Portfolio  ')).toBe('Portfolio');
    expect(dimNameKey('Portfolio')).not.toBe(dimNameKey('portfolio'));
    expect(dimNameKey(undefined)).toBe('');
    expect(dimNameKey(42 as unknown)).toBe('');
  });
});

describe('ensureDimensionIds', () => {
  it('mints an id for dims that lack one', () => {
    const out = ensureDimensionIds([{ name: 'Portfolio', role_requirement: 'X' }]);
    expect(out).toHaveLength(1);
    expect(typeof out[0].id).toBe('string');
    expect(out[0].id.length).toBeGreaterThan(0);
    expect(out[0].name).toBe('Portfolio');
  });

  it('preserves an existing id verbatim — a rename keeps identity', () => {
    const dims = [{ id: 'fixed-id-123', name: 'Portfolio Size', role_requirement: 'X' }];
    const renamed = [{ id: 'fixed-id-123', name: 'Portfolio', role_requirement: 'X' }];
    expect(ensureDimensionIds(dims)[0].id).toBe('fixed-id-123');
    expect(ensureDimensionIds(renamed)[0].id).toBe('fixed-id-123');
  });

  it('returns the same reference when nothing changed (no-op detection)', () => {
    const dims = [{ id: 'a', name: 'Portfolio', role_requirement: 'X' }];
    expect(ensureDimensionIds(dims)).toBe(dims);
  });

  it('reads a legacy `scope`-keyed name through to `name` and mints an id', () => {
    const out = ensureDimensionIds([{ scope: 'Geography', role_requirement: 'Y' } as never]);
    expect(out[0].name).toBe('Geography');
    expect(out[0].id).toBeTruthy();
  });

  it('returns [] for non-array input', () => {
    expect(ensureDimensionIds(undefined)).toEqual([]);
    expect(ensureDimensionIds(null)).toEqual([]);
    expect(ensureDimensionIds('nope' as unknown)).toEqual([]);
  });
});

describe('buildNameToIdIndex', () => {
  it('indexes id-bearing dims by trimmed name', () => {
    const idx = buildNameToIdIndex([
      { id: 'p1', name: 'Portfolio' },
      { id: 'g1', name: ' Geography ' },
    ]);
    expect(idx.get('Portfolio')).toBe('p1');
    expect(idx.get('Geography')).toBe('g1');
  });

  it('skips dims without an id (cannot resolve to a non-existent id)', () => {
    const idx = buildNameToIdIndex([{ name: 'Portfolio' }]);
    expect(idx.size).toBe(0);
  });

  it('keeps the FIRST id on a duplicate name and warns (deterministic)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const idx = buildNameToIdIndex([
      { id: 'first', name: 'Portfolio' },
      { id: 'second', name: 'Portfolio' },
    ]);
    expect(idx.get('Portfolio')).toBe('first');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('stampDimensionIds', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warn.mockRestore(); });

  const dims = [
    { id: 'port-1', name: 'Portfolio' },
    { id: 'geo-1', name: 'Geography' },
  ];

  it('stamps dimension_id by exact name match', () => {
    const { rows, changed, unmatched } = stampDimensionIds(
      [{ scope: 'Portfolio', candidate_actual: '£5bn AUM', alignment: 'strong' }],
      dims,
    );
    expect(changed).toBe(true);
    expect(unmatched).toEqual([]);
    expect(rows[0].dimension_id).toBe('port-1');
    // candidate content untouched
    expect(rows[0].candidate_actual).toBe('£5bn AUM');
    expect(rows[0].alignment).toBe('strong');
  });

  it('leaves dimension_id unset and logs a miss when no exact match (never guesses)', () => {
    const { rows, changed, unmatched } = stampDimensionIds(
      [{ scope: 'Portfolio Size', candidate_actual: 'x', alignment: 'partial' }],
      dims,
    );
    expect(rows[0].dimension_id).toBeUndefined();
    expect(changed).toBe(false);
    expect(unmatched).toEqual(['Portfolio Size']);
    expect(warn).toHaveBeenCalled();
  });

  it('never fuzzy-matches (case / punctuation differences are misses)', () => {
    const { rows } = stampDimensionIds([{ scope: 'portfolio', candidate_actual: 'x' }], dims);
    expect(rows[0].dimension_id).toBeUndefined();
  });

  it('trusts an already-present dimension_id (id-keyed Engine output passthrough)', () => {
    const { rows, changed } = stampDimensionIds(
      [{ scope: 'Renamed Later', dimension_id: 'port-1', candidate_actual: 'x' }],
      dims,
    );
    expect(rows[0].dimension_id).toBe('port-1');
    expect(changed).toBe(false);
  });

  it('is a no-op when canonical has no ids yet (pre-backfill) — never wipes rows', () => {
    const rowsIn = [{ scope: 'Portfolio', candidate_actual: 'x' }];
    const { rows, changed } = stampDimensionIds(rowsIn, [{ name: 'Portfolio' }]);
    expect(changed).toBe(false);
    expect(rows).toBe(rowsIn);
  });

  it('handles empty / non-array rows safely', () => {
    expect(stampDimensionIds(undefined, dims).rows).toEqual([]);
    expect(stampDimensionIds([], dims).rows).toEqual([]);
  });
});
