import type { EDCData } from './types';
import { canonicalText } from './criteria-canonical';

type Criterion = EDCData['key_criteria'][number];

export interface MergeCriteriaContext {
  candidateId?: string;
  reason?: 'count' | 'name-mismatch';
}

/**
 * Merge Engine-generated criteria (authoritative structure) with
 * consultant-edited criteria (potentially modified evidence/context_anchor).
 *
 * For each Engine criterion, if a matching edc_data criterion (by canonical
 * name) has different evidence or context_anchor (also canonicalized), the
 * consultant edited it — keep the edc_data version. Otherwise use the Engine
 * version.
 *
 * Canonical comparison avoids whitespace / Unicode asymmetry between
 * Engine-written names (un-sanitized) and consultant-supplied names
 * (stripArtifactsDeep has already trimmed them). Without this, Florian's
 * save on pnx-gm-se silently dropped consultant evidence because edcMap was
 * keyed by trimmed names and looked up by un-trimmed Engine names.
 *
 * NOTE: comparison uses canonical form; the value returned is always the
 * raw edc/eng object — consultant text lands as typed, never rewritten.
 */
export function mergeKeyCriteria(
  engineCriteria: Criterion[],
  edcCriteria: Criterion[] | undefined | null,
  ctx?: MergeCriteriaContext,
): Criterion[] {
  if (!edcCriteria || edcCriteria.length === 0) {
    return engineCriteria;
  }

  const edcMap = new Map<string, Criterion>();
  for (const c of edcCriteria) {
    const key = canonicalText(c.name);
    if (key) edcMap.set(key, c);
  }

  const fellBackToEngine: number[] = [];
  const merged = engineCriteria.map((eng, i) => {
    const edc = edcMap.get(canonicalText(eng.name));
    if (!edc) {
      fellBackToEngine.push(i);
      return eng;
    }

    // Canonical comparison for edit detection — whitespace-only diffs
    // (nbsp, doubled spaces, trailing space) should not count as edits.
    // `edc.evidence &&` short-circuit preserved intentionally: empty-string
    // consultant clears still lose to engine baseline in this version. That
    // edge case is addressed in the Layer 2 position-based merge rewrite
    // (rides with the /api/edits/save durable fix PR).
    const evidenceEdited = edc.evidence && canonicalText(edc.evidence) !== canonicalText(eng.evidence);
    const anchorEdited = canonicalText(edc.context_anchor) !== canonicalText(eng.context_anchor);

    return (evidenceEdited || anchorEdited) ? edc : eng;
  });

  if (ctx) {
    console.log(
      `[edits] criteria-merge fired candidate=${ctx.candidateId ?? '?'} ` +
      `reason=${ctx.reason ?? '?'} ` +
      `indices-using-engine-fallback=[${fellBackToEngine.join(',')}]`
    );
  }

  return merged;
}
