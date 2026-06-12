/**
 * Stable scope-dimension identity.
 *
 * Scope Match joins per-candidate `edc_data.scope_match` rows to canonical
 * `searches.scope_match_dimensions`. Historically that join was by dimension
 * NAME — so renaming a dimension in the Scope Editor orphaned every candidate
 * row keyed to the old name (blank render, no recovery path). See the
 * "Fix Scope Editor Renames Orphaning Per-Candidate Scope Data" ticket.
 *
 * The fix: every canonical dimension carries a stable `id` (uuid) minted at
 * creation and never changed by renames; every per-candidate row carries
 * `dimension_id`; the join is by id, the display name always comes from
 * canonical. This module is the single source of truth for (a) minting/
 * preserving those ids and (b) resolving legacy/Engine name-keyed rows to an
 * id via EXACT name match — deterministic, never fuzzy. A wrong silent match
 * is worse than a logged miss (Quality Rule: never infer).
 */

export interface CanonicalDimension {
  id?: string;
  name: string;
  role_requirement?: string;
}

export interface ScopeMatchRow {
  scope: string;
  candidate_actual?: string;
  role_requirement?: string;
  alignment?: 'strong' | 'partial' | 'gap' | 'not_assessed';
  dimension_id?: string;
  [k: string]: unknown;
}

/** A uuid. Uses the platform crypto (Node 18+, edge runtime, browsers).
 *  Exported as `newDimensionId` for the editor, which must mint the id when a
 *  dimension is first added so it stays stable across the session's debounced
 *  saves (a dim that reached the server without an id would get a fresh id on
 *  every save, defeating rename stability). */
export function newDimensionId(): string {
  return mintId();
}

function mintId(): string {
  // globalThis.crypto.randomUUID is available in every runtime this app targets
  // (Node 18+, Vercel edge, modern browsers). Kept behind a guard so a missing
  // global degrades to a still-unique fallback rather than throwing.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback: timestamp-free, collision-resistant enough for a backstop. Avoids
  // Math.random-only ids. Practically never hit.
  return 'dim_' + Array.from({ length: 16 }, (_, i) => ((i * 2654435761) >>> 0).toString(36)).join('').slice(0, 24);
}

/** Trimmed, case-sensitive name key for EXACT matching. Consultant-authored
 *  names are matched verbatim (minus surrounding whitespace) — no lowercasing,
 *  no punctuation stripping, no fuzzy normalisation. */
export function dimNameKey(name: unknown): string {
  return typeof name === 'string' ? name.trim() : '';
}

/**
 * Returns the dimensions with a stable `id` on every entry. Existing ids are
 * preserved verbatim (this is what makes a rename a rename and not a
 * delete+create). Entries that store the name under the legacy `scope` key are
 * read through to `name`. Returns the same array reference when nothing changed
 * so callers can cheaply detect a no-op.
 */
export function ensureDimensionIds<T extends CanonicalDimension>(
  dims: unknown,
): (T & { id: string })[] {
  if (!Array.isArray(dims)) return [];
  let changed = false;
  const out = (dims as (T & { scope?: string })[]).map((d) => {
    const existing = typeof d?.id === 'string' && d.id.trim().length > 0 ? d.id : null;
    const name = typeof d?.name === 'string' ? d.name : (typeof d?.scope === 'string' ? d.scope : '');
    if (existing) {
      // Still normalise the name field so a legacy `scope`-keyed dim repairs on
      // first save, but keep the id untouched.
      if (d.name !== name) { changed = true; return { ...d, name } as T & { id: string }; }
      return d as T & { id: string };
    }
    changed = true;
    return { ...d, id: mintId(), name } as T & { id: string };
  });
  return changed ? out : (dims as (T & { id: string })[]);
}

/**
 * Build an exact-name → id index from canonical dimensions. Only dimensions
 * that have an id are indexed (you can't resolve to an id that doesn't exist).
 * On duplicate names the FIRST wins and the collision is logged — a duplicate
 * name is itself a data problem and we must not pick non-deterministically.
 */
export function buildNameToIdIndex(
  dims: CanonicalDimension[] | undefined | null,
  context?: string,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const d of dims ?? []) {
    const id = typeof d?.id === 'string' ? d.id : '';
    const key = dimNameKey(d?.name);
    if (!id || !key) continue;
    if (index.has(key)) {
      console.warn(
        `[scope-dimension-id] duplicate canonical dimension name ${JSON.stringify(key)}` +
          (context ? ` (${context})` : '') + ' — keeping first id, ignoring later',
      );
      continue;
    }
    index.set(key, id);
  }
  return index;
}

/**
 * Stamp `dimension_id` onto per-candidate scope_match rows by EXACT name match
 * against canonical dimensions. Used by the read/regen shim so legacy
 * (name-keyed) and future (id-keyed) Engine output both resolve to a stable id.
 *
 * Rules:
 *  - A row that already has a `dimension_id` is left untouched (trusted).
 *  - Otherwise resolve `scope` against the canonical name→id index.
 *  - No exact match → leave `dimension_id` unset and emit a logged warning.
 *    NEVER guess, never fuzzy-match, never drop the row.
 *
 * Returns a new array; never mutates the input. `changed` reports whether any
 * row gained an id (so callers can skip a no-op write).
 */
export function stampDimensionIds(
  rows: ScopeMatchRow[] | undefined | null,
  dims: CanonicalDimension[] | undefined | null,
  context?: string,
): { rows: ScopeMatchRow[]; changed: boolean; unmatched: string[] } {
  if (!Array.isArray(rows)) return { rows: [], changed: false, unmatched: [] };
  const index = buildNameToIdIndex(dims, context);
  // No usable canonical (no ids yet) → nothing to resolve against. Leave rows
  // as-is rather than wiping anything.
  if (index.size === 0) return { rows, changed: false, unmatched: [] };

  let changed = false;
  const unmatched: string[] = [];
  const out = rows.map((r) => {
    if (typeof r?.dimension_id === 'string' && r.dimension_id.length > 0) return r;
    const id = index.get(dimNameKey(r?.scope));
    if (id) { changed = true; return { ...r, dimension_id: id }; }
    const label = dimNameKey(r?.scope) || '(empty)';
    unmatched.push(label);
    console.warn(
      `[scope-dimension-id] no exact canonical match for scope ${JSON.stringify(label)}` +
        (context ? ` (${context})` : '') + ' — leaving dimension_id unset (logged miss, not a guess)',
    );
    return r;
  });
  return { rows: changed ? out : rows, changed, unmatched };
}
