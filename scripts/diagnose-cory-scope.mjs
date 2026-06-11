/**
 * READ-ONLY diagnostic for the Cory / cgn-vp-bd-csm Portfolio orphan.
 *
 * Does NOT mutate anything — only .select() calls. Safe to run against any env.
 * Connects with whatever NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * are in .env.local (currently the ngtuhkdrkzxmwfjprfco / staging project).
 *
 * Usage: dotenv -e .env.local -- node scripts/diagnose-cory-scope.mjs
 *    or: node --env-file=.env.local scripts/diagnose-cory-scope.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}
console.log("Project URL:", url);

const supabase = createClient(url, key);

const canonKey = (s) =>
  (s || "").split(/[—–:]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  // 1. Resolve the search
  const { data: searches, error: sErr } = await supabase
    .from("searches")
    .select("id, search_key, client_display_name, scope_match_dimensions, updated_at")
    .eq("search_key", "cgn-vp-bd-csm");

  if (sErr) { console.error("search query error:", sErr.message); process.exit(1); }
  if (!searches?.length) {
    console.log("\n>>> No search with search_key='cgn-vp-bd-csm' in THIS project.");
    process.exit(0);
  }
  const search = searches[0];
  console.log("\n=== SEARCH ===");
  console.log("id:", search.id, "| client:", search.client_display_name, "| updated_at:", search.updated_at);
  console.log("canonical scope_match_dimensions:");
  const dims = Array.isArray(search.scope_match_dimensions) ? search.scope_match_dimensions : [];
  for (const d of dims) {
    console.log(`  - name=${JSON.stringify(d?.name ?? d?.scope)} id=${JSON.stringify(d?.id)} role_req=${JSON.stringify((d?.role_requirement ?? "").slice(0,40))} canonKey=${canonKey(d?.name ?? d?.scope)}`);
  }

  // 2. All candidates on this search
  const { data: cands, error: cErr } = await supabase
    .from("candidates")
    .select("id, candidate_name, candidate_slug, deck_status, edc_data, ai_generated_edc, updated_at")
    .eq("search_id", search.id);
  if (cErr) { console.error("candidate query error:", cErr.message); process.exit(1); }

  console.log(`\n=== CANDIDATES (${cands?.length ?? 0}) ===`);
  const canonKeys = new Set(dims.map((d) => canonKey(d?.name ?? d?.scope)));

  for (const c of cands ?? []) {
    const edcRows = Array.isArray(c.edc_data?.scope_match) ? c.edc_data.scope_match : [];
    const aiRows = Array.isArray(c.ai_generated_edc?.scope_match) ? c.ai_generated_edc.scope_match : [];
    console.log(`\n--- ${c.candidate_name} (${c.candidate_slug}) | status=${c.deck_status} | updated=${c.updated_at} ---`);
    console.log("  edc_data.scope_match rows:");
    for (const r of edcRows) {
      const k = canonKey(r?.scope);
      const matched = canonKeys.has(k);
      console.log(`    scope=${JSON.stringify(r?.scope)} canonKey=${k} matchesCanonical=${matched} dimension_id=${JSON.stringify(r?.dimension_id)} alignment=${JSON.stringify(r?.alignment)} actual=${JSON.stringify((r?.candidate_actual ?? "").slice(0,50))}`);
    }
    console.log("  ai_generated_edc.scope_match rows:");
    for (const r of aiRows) {
      console.log(`    scope=${JSON.stringify(r?.scope)} canonKey=${canonKey(r?.scope)} alignment=${JSON.stringify(r?.alignment)} actual=${JSON.stringify((r?.candidate_actual ?? "").slice(0,50))}`);
    }
    // Flag orphans: canonical dims with no matching edc row
    const edcKeys = new Set(edcRows.map((r) => canonKey(r?.scope)));
    const missing = dims.filter((d) => !edcKeys.has(canonKey(d?.name ?? d?.scope)));
    if (missing.length) {
      console.log("  >>> ORPHAN: canonical dims with NO matching edc_data row:", missing.map((d) => d?.name ?? d?.scope));
    }
    const stale = edcRows.filter((r) => !canonKeys.has(canonKey(r?.scope)));
    if (stale.length) {
      console.log("  >>> STALE: edc_data rows that no longer match any canonical dim:", stale.map((r) => r?.scope));
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
