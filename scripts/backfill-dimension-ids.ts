/**
 * One-time backfill: stable dimension_id for Scope Match.
 *
 * See the "Fix Scope Editor Renames Orphaning Per-Candidate Scope Data" ticket.
 *
 * Two passes, idempotent:
 *   1. searches.scope_match_dimensions — mint a uuid for every dimension that
 *      lacks an `id`. Existing ids are preserved verbatim.
 *   2. candidates.edc_data.scope_match  — stamp `dimension_id` onto each row by
 *      EXACT name match against its search's (now id'd) canonical dimensions.
 *
 * Pre-existing-orphan recovery (per Baz decision #5):
 *   Rows whose `scope` no longer matches current canonical (names drifted
 *   before this fix) are retried against ai_generated_edc.scope_match history —
 *   if the historical name maps to a current canonical dim, we recover the id.
 *   Anything still unmatched lands in a RECONCILIATION REPORT for human
 *   sign-off. NOTHING is fuzzy-matched and NOTHING is silently dropped.
 *
 * Safety:
 *   - DRY RUN by default. Prints every intended write + the full reconciliation
 *     report. Pass --commit to actually write.
 *   - ai_generated_edc is NEVER written.
 *   - STAGING FIRST. Point the env file at staging (ngtuhkdrkzxmwfjprfco),
 *     verify, then prod (nliftfmbsnplhrrdxqnx) — only with explicit go-ahead.
 *   - Re-reads (RETURNING-style) and diffs after a committed write.
 *
 * Usage:
 *   npx tsx --env-file=.env.prod.local scripts/backfill-dimension-ids.ts            # dry run
 *   npx tsx --env-file=.env.prod.local scripts/backfill-dimension-ids.ts --commit   # writes
 *   npx tsx --env-file=.env.prod.local scripts/backfill-dimension-ids.ts --search cgn-vp-bd-csm
 */
import { createClient } from "@supabase/supabase-js";
import {
  ensureDimensionIds,
  buildNameToIdIndex,
  dimNameKey,
  type CanonicalDimension,
  type ScopeMatchRow,
} from "../src/lib/scope-dimension-id";

const COMMIT = process.argv.includes("--commit");
const SEARCH_FILTER = (() => {
  const i = process.argv.indexOf("--search");
  return i !== -1 ? process.argv[i + 1] : null;
})();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env vars"); process.exit(1); }

const supabase = createClient(url, key);

const log = (...a: unknown[]) => console.log(...a);
const banner = (s: string) => log(`\n${"=".repeat(72)}\n${s}\n${"=".repeat(72)}`);

interface Unmatched { search_key?: string; candidate?: string; scope: string; reason: string; }

async function main() {
  banner(`Backfill dimension_id — ${COMMIT ? "COMMIT (writes enabled)" : "DRY RUN (no writes)"}`);
  log("Project:", url);
  if (SEARCH_FILTER) log("Scoped to search_key:", SEARCH_FILTER);

  // ── Load searches ─────────────────────────────────────────────────────────
  let q = supabase.from("searches").select("id, search_key, scope_match_dimensions");
  if (SEARCH_FILTER) q = q.eq("search_key", SEARCH_FILTER);
  const { data: searches, error: sErr } = await q;
  if (sErr) { console.error("searches read error:", sErr.message); process.exit(1); }

  const reconciliation: Unmatched[] = [];
  const dimsBySearchId = new Map<string, (CanonicalDimension & { id: string })[]>();
  const searchById = new Map((searches ?? []).map((s) => [s.id, s]));

  // ── PASS 1: mint dimension ids on searches ──────────────────────────────────
  banner("PASS 1 — searches.scope_match_dimensions");
  for (const s of searches ?? []) {
    const before = Array.isArray(s.scope_match_dimensions) ? s.scope_match_dimensions : [];
    const after = ensureDimensionIds<CanonicalDimension>(before);
    dimsBySearchId.set(s.id, after);
    if (after === before) { log(`  [skip] ${s.search_key} — all ${before.length} dims already have ids`); continue; }
    const minted = after.filter((d, i) => !before[i]?.id).length;
    log(`  [mint] ${s.search_key} — ${minted}/${after.length} dims need ids`);
    for (const d of after) log(`           ${JSON.stringify(d.name)} -> id=${d.id}`);
    if (COMMIT) {
      const { error } = await supabase.from("searches").update({ scope_match_dimensions: after }).eq("id", s.id);
      if (error) { console.error(`  [ERR] ${s.search_key}:`, error.message); continue; }
      const { data: verify } = await supabase.from("searches").select("scope_match_dimensions").eq("id", s.id).single();
      const vDims = (verify?.scope_match_dimensions ?? []) as CanonicalDimension[];
      log(`  [verify] ${s.search_key} — all dims have ids: ${vDims.every((d) => typeof d.id === "string")}`);
    }
  }

  // ── PASS 2: stamp candidates.edc_data.scope_match ────────────────────────────
  banner("PASS 2 — candidates.edc_data.scope_match");
  let cq = supabase.from("candidates").select("id, candidate_name, candidate_slug, search_id, edc_data, ai_generated_edc");
  if (searches?.length) cq = cq.in("search_id", searches.map((s) => s.id));
  const { data: cands, error: cErr } = await cq;
  if (cErr) { console.error("candidates read error:", cErr.message); process.exit(1); }

  for (const c of cands ?? []) {
    const s = searchById.get(c.search_id);
    const dims = dimsBySearchId.get(c.search_id) ?? [];
    const index = buildNameToIdIndex(dims, s?.search_key);
    const rows = (Array.isArray(c.edc_data?.scope_match) ? c.edc_data.scope_match : []) as ScopeMatchRow[];
    if (!rows.length || index.size === 0) continue;

    // Recovery source: ai_generated_edc rows (clean, historical names), matched
    // by row position to the edc_data row whose name drifted.
    const aiRows = (Array.isArray(c.ai_generated_edc?.scope_match) ? c.ai_generated_edc.scope_match : []) as ScopeMatchRow[];

    let changed = false;
    const newRows = rows.map((r, rowIdx) => {
      if (typeof r?.dimension_id === "string" && r.dimension_id) return r;
      let id = index.get(dimNameKey(r?.scope));
      let how = "exact";
      if (!id && aiRows[rowIdx]) {
        const recovered = index.get(dimNameKey(aiRows[rowIdx]?.scope));
        if (recovered) { id = recovered; how = `recovered-from-ai_generated_edc("${dimNameKey(aiRows[rowIdx]?.scope)}")`; }
      }
      if (id) {
        changed = true;
        log(`  [stamp] ${s?.search_key}/${c.candidate_slug} row="${dimNameKey(r?.scope)}" -> ${id} (${how})`);
        return { ...r, dimension_id: id };
      }
      reconciliation.push({
        search_key: s?.search_key, candidate: c.candidate_slug,
        scope: dimNameKey(r?.scope) || "(empty)", reason: "no exact canonical match (and no ai_generated_edc recovery)",
      });
      return r;
    });

    if (changed && COMMIT) {
      const nextEdc = { ...c.edc_data, scope_match: newRows };
      const { error } = await supabase.from("candidates").update({ edc_data: nextEdc }).eq("id", c.id);
      if (error) { console.error(`  [ERR] ${c.candidate_slug}:`, error.message); continue; }
      const { data: v } = await supabase.from("candidates").select("edc_data").eq("id", c.id).single();
      const stampedCount = ((v?.edc_data?.scope_match ?? []) as ScopeMatchRow[]).filter((x) => x.dimension_id).length;
      log(`  [verify] ${c.candidate_slug} — ${stampedCount} rows now carry dimension_id`);
    }
  }

  // ── Reconciliation report ───────────────────────────────────────────────────
  banner(`RECONCILIATION REPORT — ${reconciliation.length} unmatched row(s)`);
  if (reconciliation.length === 0) {
    log("  All candidate scope rows resolved to a dimension_id. ✅");
  } else {
    log("  These rows could NOT be resolved and were left UNTOUCHED (no fuzzy match, no drop).");
    log("  Human sign-off required before the backfill is declared done:\n");
    for (const r of reconciliation) {
      log(`   - ${r.search_key} / ${r.candidate} : scope=${JSON.stringify(r.scope)} — ${r.reason}`);
    }
  }
  banner(COMMIT ? "DONE (writes committed)" : "DONE (dry run — re-run with --commit to write)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
