import type { CandStatus, RawCandidate, RawSearch, SearchStatus } from "./lib";

// ── Priority band ─────────────────────────────────────────────────────────
// NOTE: the board no longer maps a stored `searches.priority` seed into a band.
// Effective priority is computed at read time in buildSearches() (see lib.ts)
// from status + the live candidate pipeline, so the board is self-maintaining
// and no search is ever orphaned by a stale seed. The `priority` column is still
// selected by the loader and kept on DbSearch as a future manual-override hook.

const VALID_DS: CandStatus[] = ["none", "new", "active", "hold", "rejected"];

// Raw DB row shapes (only the columns the loader selects).
export interface DbSearch {
  id: string;
  search_key: string;
  client: string | null;
  client_display_name: string | null;
  position: string | null;
  role_title: string | null;
  industry: string | null;
  location: string | null;
  kam: string | null;
  candidate_generator: string | null;
  client_contact: string | null;
  engine_version: string | null;
  access_password: string | null;
  status: SearchStatus;
  priority: string | null;
  updated_at?: string | null;
}
export interface DbCandidate {
  search_id: string;
  candidate_name: string | null;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  deck_status: string | null;
  candidate_slug: string | null;
  consultant: string | null;
  updated_at?: string | null;
}

/**
 * Pure mapper: DB rows → the board's `{ searches, candidates }` shape.
 * Side-effect-free so it can be unit-tested without Supabase.
 */
export function mapToBoard(
  searches: DbSearch[],
  candidates: DbCandidate[],
): { searches: RawSearch[]; candidates: Record<string, RawCandidate[]> } {
  const keyById: Record<string, string> = {};
  searches.forEach((s) => {
    keyById[s.id] = s.search_key;
  });

  const cands: Record<string, RawCandidate[]> = {};
  candidates.forEach((c) => {
    const k = keyById[c.search_id];
    if (!k) return; // orphaned candidate (no parent search) — skip
    const ds = (VALID_DS.includes(c.deck_status as CandStatus) ? c.deck_status : "none") as CandStatus;
    (cands[k] ||= []).push({
      n: c.candidate_name || "—",
      t: c.current_title,
      c: c.current_company,
      loc: c.location,
      ds,
      sl: c.candidate_slug,
      cons: c.consultant,
    });
  });

  const outSearches: RawSearch[] = searches.map((s) => ({
    k: s.search_key,
    co: s.client_display_name || s.client || s.search_key,
    r: s.role_title || s.position || "",
    st: s.status,
    loc: s.location,
    ind: s.industry,
    brief: true, // no clean "brief generated" signal in Supabase; chip always enabled
    pw: s.access_password != null,
    kam: s.kam,
    cg: s.candidate_generator,
    cc: s.client_contact,
    ev: s.engine_version || "—",
    // pri omitted — derived at read time by buildSearches (see lib.ts).
  }));

  return { searches: outSearches, candidates: cands };
}
