import type { EDCData } from './types';

type Criterion = EDCData['key_criteria'][number];

/**
 * Merge Engine-generated criteria (authoritative structure) with
 * consultant-edited criteria (potentially modified evidence/context_anchor).
 *
 * For each Engine criterion, if a matching edc_data criterion (by name)
 * has different evidence or context_anchor, the consultant edited it — keep
 * the edc_data version. Otherwise use the Engine version.
 */
export function mergeKeyCriteria(
  engineCriteria: Criterion[],
  edcCriteria: Criterion[] | undefined | null,
): Criterion[] {
  if (!edcCriteria || edcCriteria.length === 0) {
    return engineCriteria;
  }

  const edcMap = new Map<string, Criterion>();
  for (const c of edcCriteria) {
    if (c.name) edcMap.set(c.name, c);
  }

  return engineCriteria.map((eng) => {
    const edc = edcMap.get(eng.name);
    if (!edc) return eng;

    const evidenceEdited = edc.evidence && edc.evidence !== eng.evidence;
    const anchorEdited = (edc.context_anchor ?? '') !== (eng.context_anchor ?? '');

    return (evidenceEdited || anchorEdited) ? edc : eng;
  });
}
