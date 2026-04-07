/**
 * Seed pipeline_log with test entries for observability verification.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-pipeline-log.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// First resolve search UUIDs for the foreign key references
async function getSearchUUID(searchKey: string): Promise<string | null> {
  const { data } = await supabase
    .from('searches')
    .select('id')
    .eq('search_key', searchKey)
    .single();
  return data?.id || null;
}

async function seed() {
  const norId = await getSearchUUID('nor-swf-svp');
  const cvwId = await getSearchUUID('cvw-ops-dir');

  const entries = [
    {
      note_type: 'iv',
      granola_title: 'IV Sebastian Eickens Norican SVP StrikoWestofen',
      matched_search_id: norId,
      matched_search_key: 'nor-swf-svp',
      match_score: 28,
      candidate_name_extracted: 'Sebastian Eickens',
      pipeline_status: 'complete',
    },
    {
      note_type: 'iv',
      granola_title: 'IV Markus Deimel Norican SVP',
      matched_search_id: norId,
      matched_search_key: 'nor-swf-svp',
      match_score: 15,
      candidate_name_extracted: 'Markus Deimel',
      pipeline_status: 'complete',
    },
    {
      note_type: 'js',
      granola_title: 'JS Norican Group SVP StrikoWestofen',
      matched_search_id: norId,
      matched_search_key: 'nor-swf-svp',
      match_score: 28,
      pipeline_status: 'complete',
    },
    {
      note_type: 'iv',
      granola_title: 'IV Chad Imboden Crestview Aerospace Operations',
      matched_search_id: cvwId,
      matched_search_key: 'cvw-ops-dir',
      match_score: 24,
      candidate_name_extracted: 'Chad Imboden',
      pipeline_status: 'complete',
    },
    {
      note_type: 'iv',
      granola_title: 'IV Random Person Unknown Company',
      matched_search_id: null,
      matched_search_key: null,
      match_score: 0,
      pipeline_status: 'no_match',
    },
    {
      note_type: 'unknown',
      granola_title: 'Meeting with Phil about quarterly review',
      matched_search_id: null,
      matched_search_key: null,
      match_score: 0,
      pipeline_status: 'no_match',
    },
  ];

  const { data, error } = await supabase
    .from('pipeline_log')
    .insert(entries)
    .select('id, note_type, granola_title, pipeline_status');

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data.length} pipeline_log entries:`);
  for (const row of data) {
    console.log(`  [${row.pipeline_status}] ${row.note_type}: ${row.granola_title}`);
  }
}

seed().catch(console.error);
