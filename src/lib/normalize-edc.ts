import type { EDCData } from './types';

/**
 * Self-heal layer for legacy formatting artifacts in stored EDC data.
 *
 * Two known defects, both produced by earlier generations of the Engine /
 * regen prompt and still present in stored rows and Blob overlays:
 *
 *   1. `motivation_hook` prefixed with the "Motivation — " label that the
 *      renderer adds itself (MotivationStrip strips it on edit, but stored
 *      data stays dirty for PDF/export/dashboard consumers).
 *   2. `scope_match[].scope` carrying the whole "Name — role requirement"
 *      string because the prompt used to list dimensions in that joined form.
 *
 * Applied once per candidate at the finalization point of every read path
 * (supabase-data.ts and data.ts), AFTER edit overlays — overlays saved from a
 * dirty render carry the same artifacts. Deliberately does nothing else: no
 * trimming, no enum validation, no reordering. Pure and non-mutating — clean
 * input is returned unchanged (same reference).
 */

const MOTIVATION_PREFIX = /^\s*motivation\s*[—–-]\s*/i;
const SCOPE_SEPARATOR = /[—–:]/;

// Minimum tail length for prefix (non-equality) matching, so a degenerate
// short tail like "P&L: G" can never match a long requirement by prefix.
const MIN_PREFIX_MATCH_LENGTH = 12;

/** Lowercase, collapse whitespace, and unify dash variants (— – -) so a
 *  hyphen-vs-en-dash mismatch between scope tail and role_requirement
 *  (e.g. "$3-5M" vs "$3–5M") still compares equal. */
function comparable(s: string): string {
  return s.toLowerCase().replace(/[—–-]/g, '-').replace(/\s+/g, ' ').trim();
}

function tailMatchesRequirement(tail: string, roleRequirement: string | undefined): boolean {
  if (!roleRequirement) return false;
  const t = comparable(tail);
  const r = comparable(roleRequirement);
  if (!t || !r) return false;
  if (t === r) return true;
  if (t.length < MIN_PREFIX_MATCH_LENGTH) return false;
  return r.startsWith(t) || t.startsWith(r);
}

/** Strip a leading "Motivation — " label. Undefined passes through. */
export function stripMotivationPrefix(hook: string | undefined): string | undefined {
  if (typeof hook !== 'string' || !MOTIVATION_PREFIX.test(hook)) return hook;
  return hook.replace(MOTIVATION_PREFIX, '');
}

/**
 * Reduce a concatenated "Name — role requirement" scope label to the bare
 * dimension name — but ONLY when the tail after the first separator matches
 * this row's role_requirement. A legitimate name containing a separator
 * (e.g. "P&L: Group") whose tail is not the requirement is left alone.
 * Splits at the FIRST separator, mirroring canonKey in ScopeMatch.tsx.
 */
export function normalizeScopeLabel(scope: string, roleRequirement?: string): string {
  const idx = scope.search(SCOPE_SEPARATOR);
  if (idx === -1) return scope;
  const head = scope.slice(0, idx).trim();
  const tail = scope.slice(idx + 1).trim();
  if (!head || !tail) return scope;
  return tailMatchesRequirement(tail, roleRequirement) ? head : scope;
}

export function normalizeEdcData(edc: EDCData): EDCData {
  if (!edc || typeof edc !== 'object') return edc;

  let normalizedHook: string | undefined;
  let hookChanged = false;
  if (typeof edc.motivation_hook === 'string') {
    normalizedHook = stripMotivationPrefix(edc.motivation_hook);
    hookChanged = normalizedHook !== edc.motivation_hook;
  }

  let normalizedScope: EDCData['scope_match'] | undefined;
  let scopeChanged = false;
  if (Array.isArray(edc.scope_match)) {
    const next = edc.scope_match.map((row) => {
      if (!row || typeof row.scope !== 'string') return row;
      const scope = normalizeScopeLabel(row.scope, row.role_requirement);
      if (scope === row.scope) return row;
      scopeChanged = true;
      return { ...row, scope };
    });
    if (scopeChanged) normalizedScope = next;
  }

  if (!hookChanged && !scopeChanged) return edc;

  const out: EDCData = { ...edc };
  if (hookChanged) out.motivation_hook = normalizedHook;
  if (scopeChanged && normalizedScope) out.scope_match = normalizedScope;
  return out;
}
