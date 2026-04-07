import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function validatePipelineAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-pipeline-secret');
  return secret === process.env.PIPELINE_SECRET;
}

export async function POST(req: NextRequest) {
  if (!validatePipelineAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title } = await req.json();
  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const lowerTitle = title.toLowerCase().trim();

  // Determine note type from prefix
  let noteType = 'unknown';
  if (lowerTitle.startsWith('iv ') || lowerTitle.startsWith('iv-')) noteType = 'iv';
  else if (lowerTitle.startsWith('js ') || lowerTitle.startsWith('js-')) noteType = 'js';
  else if (lowerTitle.startsWith('ac ') || lowerTitle.includes('alignment call')) noteType = 'ac';

  // Get all active searches
  const { data: searches } = await supabase
    .from('searches')
    .select('id, search_key, js_search_name, match_keywords_arr, key_criteria, scope_dimensions, budget_base, budget_bonus, budget_lti, role_title, location, client, remit, core_mission, confidentiality, why_open')
    .eq('status', 'active');

  if (!searches || searches.length === 0) {
    await supabase.from('pipeline_log').insert({
      note_type: noteType,
      granola_title: title,
      pipeline_status: 'no_match',
      error_message: 'No active searches found',
    });
    return NextResponse.json({ matched: false, note_type: noteType });
  }

  // Keyword matching — score by cumulative keyword character length
  let bestMatch: typeof searches[0] | null = null;
  let bestScore = 0;

  for (const search of searches) {
    const keywords = (search.match_keywords_arr || []) as string[];
    let score = 0;
    for (const kw of keywords) {
      if (kw && lowerTitle.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = search;
    }
  }

  if (!bestMatch || bestScore === 0) {
    await supabase.from('pipeline_log').insert({
      note_type: noteType,
      granola_title: title,
      match_score: 0,
      pipeline_status: 'no_match',
    });
    return NextResponse.json({ matched: false, note_type: noteType, score: 0 });
  }

  // Extract candidate name (IV notes only)
  let candidateName = '';
  if (noteType === 'iv') {
    const afterPrefix = title.replace(/^IV\s*-?\s*/i, '').trim();
    const dashParts = afterPrefix.split(' - ');
    if (dashParts.length >= 2) {
      candidateName = dashParts[0].trim();
    } else {
      // Use keywords to find where name ends
      const lowerAfter = afterPrefix.toLowerCase();
      let earliest = afterPrefix.length;
      for (const kw of (bestMatch.match_keywords_arr || []) as string[]) {
        const pos = lowerAfter.indexOf(kw.toLowerCase());
        if (pos > 0 && pos < earliest) earliest = pos;
      }
      if (earliest < afterPrefix.length) {
        candidateName = afterPrefix.substring(0, earliest).trim();
      }
    }
  }

  // Log successful match
  await supabase.from('pipeline_log').insert({
    note_type: noteType,
    granola_title: title,
    matched_search_id: bestMatch.id,
    matched_search_key: bestMatch.search_key,
    match_score: bestScore,
    candidate_name_extracted: candidateName || null,
    pipeline_status: 'matched',
  });

  return NextResponse.json({
    matched: true,
    note_type: noteType,
    score: bestScore,
    candidate_name: candidateName,
    search: bestMatch,
  });
}
