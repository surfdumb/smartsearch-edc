/**
 * Seed all active searches from the production Google Sheets config into Supabase staging.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-active-searches.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Production config string (from Google Sheets Active Searches, cell A2) ──

const CONFIG_STRING = `aon-partner:::aon,partner,compensation,exec comp:::|||hitachi-md-korea:::hitachi,managing director,south korea,korea:::|||triton-ocean:::triton,chairman,board member,swiss it,project ocean:::|||kennametal-legal:::kennametal,legal counsel,emea legal:::|||adama-finance:::adama,finance,head of finance,cfo emea:::|||norican-sales:::norican,sales director,global sales:::|||doncasters-vp:::doncasters,vice president,vp north america:::|||norican-hr:::norican,vp hr,hr north:::|||hitachi-re-mea:::hitachi,middle east,africa,mea,real estate:::JS - Hitachi Energy Real Estate Manager (2 roles: Middle East Africa and Southern Europe)|||hitachi-re-se:::hitachi,southern europe,switzerland,real estate:::JS - Hitachi Energy Real Estate Manager (2 roles: Middle East Africa and Southern Europe)|||assertio-hr:::assertio,vp hr,vphr,group vp hr:::|||norican-aftermarket:::norican,aftermarket:::|||borgwarner-sales:::borgwarner,bw,sales director,industrial business:::|||prenax-sales:::prenax,sales director,us sales:::|||norican-engineering:::norican,engineering,vp engineering,air oem:::|||bfc-commercial:::bfc,commercial leader,commercial,spain:::|||prenax-cto:::prenax,cto,group cto:::|||triton-flokk:::triton,flokk,board member:::|||stada-bd:::stada,business development,head of bd,bd specialty:::JS - Business Development US Specialty - STADA|||kennametal-tungsten:::kennametal,tungsten,carbide,talent map:::|||doncasters-securities:::doncasters,securities,counsel,securities counsel:::|||lea-finance:::lea,chamaleon,chameleon,head of finance:::|||doncasters-engineering:::doncasters,engineering leader,engineering oxford:::|||doncasters-facilities:::doncasters,facilities director,facilities oxford:::|||doncasters-layout:::doncasters,layout,cmm,programmer oxford:::|||borgwarner-torreon:::borgwarner,bw,torreon,torreón,plant controller,finance controller:::JS - BorgWarner Torreón Plant Controller|||pbv-comp-bens:::pbv,pepsi,pepsi bottling,comp & bens,comp&bens,comp and bens,compensation,benefits,director:::JS - Comp & Bens Director - PBV|||nor-swf-svp:::norican,strikowestofen,strico,svp,striko:::JS Norican Group SVP StrikoWestofen|||cvw-aer-ops:::crestview,chemco,kemco,aerospace,operations director,operations,kirkwood,st louis:::JS - Crestview Aerospace Operations Director|||don-gtc-mgr:::doncasters,trade compliance,global trade,compliance manager,gtcm,trade:::JS v1.3 - Doncasters Global Trade Compliance Manager|||ktj-cor-ctl:::ketjen,ketjin,financial controller,corporate controller,houston,clear lake:::JS - Qualifying Call/Poss Job Spec - Ketjen Financial Controller|||prenax-hub:::prenax,hub manager,france,spain,southern europe:::`;

// ─── Search key mapping (Sheets key → Supabase key) ──────────────────────────

const KEY_MAP: Record<string, string> = {
  'cvw-aer-ops': 'cvw-ops-dir', // Crestview uses cvw-ops-dir in Supabase
  'pbv-comp-bens': 'pbv-dcb',   // PBV uses pbv-dcb in Supabase
  'stada-bd': 'stada-head-bd',  // STADA uses stada-head-bd in Supabase
};

// ─── Client name derivation from search key ─────────────────────────────────

const CLIENT_NAMES: Record<string, string> = {
  'aon': 'Aon',
  'hitachi': 'Hitachi Energy',
  'triton': 'Triton',
  'kennametal': 'Kennametal',
  'adama': 'ADAMA',
  'norican': 'Norican Group',
  'doncasters': 'Doncasters',
  'assertio': 'Assertio',
  'borgwarner': 'BorgWarner',
  'prenax': 'Prenax',
  'bfc': 'BFC',
  'stada': 'STADA',
  'lea': 'LEA / Chameleon',
  'ktj': 'Ketjen',
  'pbv': 'Pepsi Bottling Ventures',
  'nor': 'Norican Group',
  'cvw': 'Crestview Aerospace',
  'don': 'Doncasters',
  'fer': 'Fertiberia',
  'dyw': 'Dywidag',
  'demo': 'Demo Company',
};

function deriveClient(searchKey: string): string {
  const prefix = searchKey.split('-')[0];
  return CLIENT_NAMES[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function derivePosition(searchKey: string): string {
  // Take everything after the first dash segment (client prefix)
  const parts = searchKey.split('-');
  if (parts.length <= 1) return searchKey;
  return parts
    .slice(1)
    .map((p) => p.toUpperCase())
    .join(' ');
}

// ─── Searches that already have full data in staging (preserve them) ─────────

const PRESERVED_KEYS = new Set([
  'nor-swf-svp',
  'cvw-ops-dir',
  'pbv-dcb',
  'don-gtc-mgr',
  'fer-cco',
  'dyw-fd',
  'stada-head-bd',
  'demo-coo',
]);

interface ParsedSearch {
  search_key: string;
  match_keywords_arr: string[];
  js_search_name: string | null;
}

function parseConfigString(config: string): ParsedSearch[] {
  const entries = config.split('|||').filter(Boolean);
  const results: ParsedSearch[] = [];

  for (const entry of entries) {
    const parts = entry.split(':::');
    if (parts.length < 2) continue;

    const rawKey = parts[0].trim();
    if (!rawKey) continue;

    const keywords = parts[1]
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const jsName = parts[2]?.trim() || null;

    // Apply key mapping
    const searchKey = KEY_MAP[rawKey] || rawKey;

    // Merge keywords if key was remapped (keep both sets)
    const existing = results.find((r) => r.search_key === searchKey);
    if (existing) {
      // Merge keywords without duplicates
      for (const kw of keywords) {
        if (!existing.match_keywords_arr.includes(kw)) {
          existing.match_keywords_arr.push(kw);
        }
      }
      if (jsName && !existing.js_search_name) {
        existing.js_search_name = jsName;
      }
      continue;
    }

    results.push({
      search_key: searchKey,
      match_keywords_arr: keywords,
      js_search_name: jsName,
    });
  }

  return results;
}

async function seed() {
  const searches = parseConfigString(CONFIG_STRING);
  console.log(`Parsed ${searches.length} searches from config string`);

  let upserted = 0;
  let skipped = 0;

  for (const search of searches) {
    if (PRESERVED_KEYS.has(search.search_key)) {
      // Update only match_keywords_arr and js_search_name — preserve all other data
      const { error } = await supabase
        .from('searches')
        .update({
          match_keywords_arr: search.match_keywords_arr,
          js_search_name: search.js_search_name,
        })
        .eq('search_key', search.search_key);

      if (error) {
        console.log(`  SKIP ${search.search_key} — update failed: ${error.message}`);
        skipped++;
      } else {
        console.log(`  UPDATE ${search.search_key} — keywords + JS name only (preserved)`);
        upserted++;
      }
      continue;
    }

    // For new searches: upsert minimal row
    const { error } = await supabase.from('searches').upsert(
      {
        search_key: search.search_key,
        match_keywords_arr: search.match_keywords_arr,
        js_search_name: search.js_search_name,
        client: deriveClient(search.search_key),
        position: derivePosition(search.search_key),
        status: 'active',
      },
      { onConflict: 'search_key' }
    );

    if (error) {
      console.log(`  FAIL ${search.search_key}: ${error.message}`);
      skipped++;
    } else {
      console.log(`  UPSERT ${search.search_key} — ${search.match_keywords_arr.length} keywords`);
      upserted++;
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${skipped} skipped`);
}

seed().catch(console.error);
