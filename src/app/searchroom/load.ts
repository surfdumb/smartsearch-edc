// Server-only: imported solely by the API route + the server page component.
// (No `server-only` guard package in this repo; keep this module off client imports.)
import { getServiceClient, SUPABASE_ENABLED } from "@/lib/supabase";
import snapshot from "./data.json";
import { mapToBoard, type DbCandidate, type DbSearch } from "./map";
import type { Dataset } from "./lib";

function maxUpdatedAt(rows: { updated_at?: string | null }[]): number {
  let max = 0;
  for (const r of rows) {
    if (!r.updated_at) continue;
    const t = Date.parse(r.updated_at);
    if (!isNaN(t) && t > max) max = t;
  }
  return max;
}

/**
 * Load the board dataset from Supabase (canonical). Falls back to the static
 * snapshot if Supabase is unconfigured or the read fails, so the board always
 * renders. `synced_at` = the freshest row `updated_at` (honest "as-of").
 *
 * Note on `brief`: there is no clean "role brief generated" column in Supabase
 * (every search has key_criteria/scope_dims), so the Role-brief chip is always
 * enabled; the /{key}/brief route handles the rest. Revisit if a real signal
 * (e.g. a brief Blob existence check) is wanted.
 */
export async function loadSearchRoomData(): Promise<Dataset> {
  if (!SUPABASE_ENABLED) return snapshot as Dataset;
  try {
    const sb = getServiceClient();
    const [searchesRes, candsRes] = await Promise.all([
      sb
        .from("searches")
        .select(
          "id,search_key,client,client_display_name,position,role_title,industry,location,kam,candidate_generator,client_contact,engine_version,access_password,status,priority,updated_at",
        ),
      sb
        .from("candidates")
        .select(
          "search_id,candidate_name,current_title,current_company,location,deck_status,candidate_slug,consultant,updated_at",
        ),
    ]);
    if (searchesRes.error) throw searchesRes.error;
    if (candsRes.error) throw candsRes.error;

    const dbSearches = (searchesRes.data || []) as DbSearch[];
    const dbCands = (candsRes.data || []) as DbCandidate[];
    const { searches, candidates } = mapToBoard(dbSearches, dbCands);
    const max = Math.max(maxUpdatedAt(dbSearches), maxUpdatedAt(dbCands));
    const synced_at = max ? new Date(max).toISOString() : new Date().toISOString();
    return { synced_at, searches, candidates };
  } catch (err) {
    // Any failure (unconfigured project, missing column, network) → static snapshot.
    // Log loudly so a prod fallback can't masquerade as live data.
    console.error("[searchroom] Supabase load failed, serving static snapshot:", err);
    return snapshot as Dataset;
  }
}
