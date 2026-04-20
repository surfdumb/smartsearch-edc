import type { EDCData } from './types';

type Criterion = EDCData['key_criteria'][number];

/**
 * Canonical form for comparing criterion text across the save pipeline.
 *
 * COMPARISON-ONLY — never use this to rewrite what gets stored. Consultant
 * content lands in `edc_data` exactly as typed; canonicalText only decides
 * whether two strings should be treated as equal for edit-detection.
 *
 *   - `normalize('NFKC')` canonicalizes Unicode compatibility forms
 *     (smart quotes, ligatures, full/half-width variants).
 *   - `\s+` in JS regex matches U+00A0 (nbsp), tabs, newlines — collapse
 *     every run of whitespace (regular or otherwise) to a single space.
 *   - `.trim()` removes leading/trailing whitespace.
 *
 * Symmetric usage — miss any one site and whitespace noise leaks back in:
 *   1. `/api/edits/save` stale-criteria guard (name comparison, every index).
 *   2. `mergeKeyCriteria` — edcMap key, edcMap lookup, evidenceEdited /
 *      anchorEdited internal checks.
 *   3. `/api/edits/save` diff loop — `key_criteria` edit detection so
 *      `manually_edited_fields` doesn't accumulate whitespace-only saves.
 */
export function canonicalText(s: string | undefined | null): string {
  if (!s) return '';
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * Position-based canonical equality for key_criteria arrays.
 *
 * Returns true only if both arrays have the same length AND every
 * index-aligned pair has canonically equal name, evidence, and
 * context_anchor. Used by the save handler's diff loop to decide whether a
 * key_criteria payload is a real edit vs. a whitespace-noise round-trip.
 */
export function keyCriteriaCanonicallyEqual(
  a: Criterion[],
  b: Criterion[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (canonicalText(a[i]?.name) !== canonicalText(b[i]?.name)) return false;
    if (canonicalText(a[i]?.evidence) !== canonicalText(b[i]?.evidence)) return false;
    if (canonicalText(a[i]?.context_anchor) !== canonicalText(b[i]?.context_anchor)) return false;
  }
  return true;
}
