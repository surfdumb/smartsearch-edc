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

  const payload = await req.json();
  const {
    search_id,
    search_key,
    // Structured JS output from Claude (47 fields)
    key_criteria,
    scope_dimensions,
    budget_base,
    budget_bonus,
    budget_lti,
    budget_di,
    role_title,
    remit,
    core_mission,
    why_open,
    confidentiality,
    key_responsibilities,
    // Internal intelligence
    red_flag_title,
    red_flag_detail,
    predecessor_context,
    candidate_messaging,
    additional_internal_notes,
    // Pipeline metadata
    granola_title,
    sharepoint_urls,
  } = payload;

  if (!search_id) {
    return NextResponse.json({ error: 'Missing search_id' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Build update object — only include fields that were provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    js_last_synced_at: new Date().toISOString(),
    js_sync_status: 'current',
  };

  if (key_criteria !== undefined) updates.key_criteria = key_criteria;
  if (scope_dimensions !== undefined) updates.scope_dimensions = scope_dimensions;
  if (budget_base !== undefined) updates.budget_base = budget_base;
  if (budget_bonus !== undefined) updates.budget_bonus = budget_bonus;
  if (budget_lti !== undefined) updates.budget_lti = budget_lti;
  if (budget_di !== undefined) updates.budget_di = budget_di;
  if (role_title !== undefined) updates.role_title = role_title;
  if (remit !== undefined) updates.remit = remit;
  if (core_mission !== undefined) updates.core_mission = core_mission;
  if (why_open !== undefined) updates.why_open = why_open;
  if (confidentiality !== undefined) updates.confidentiality = confidentiality;
  if (key_responsibilities !== undefined) updates.key_responsibilities = key_responsibilities;
  if (red_flag_title !== undefined) updates.red_flag_title = red_flag_title;
  if (red_flag_detail !== undefined) updates.red_flag_detail = red_flag_detail;
  if (predecessor_context !== undefined) updates.predecessor_context = predecessor_context;
  if (candidate_messaging !== undefined) updates.candidate_messaging = candidate_messaging;
  if (additional_internal_notes !== undefined)
    updates.additional_internal_notes = additional_internal_notes;
  if (sharepoint_urls !== undefined) {
    if (sharepoint_urls.js_url) updates.js_sharepoint_url = sharepoint_urls.js_url;
    if (sharepoint_urls.internal_notes_url)
      updates.internal_notes_sharepoint_url = sharepoint_urls.internal_notes_url;
  }

  // Update searches table
  const { error: updateErr } = await supabase
    .from('searches')
    .update(updates)
    .eq('id', search_id);

  if (updateErr) {
    console.error('[pipeline/js] update error:', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Cascade criteria names to existing candidates
  const cascadeResult: { candidate_name: string }[] = [];
  if (key_criteria) {
    // Get all candidates for this search
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, candidate_name, edc_data')
      .eq('search_id', search_id);

    if (candidates && candidates.length > 0) {
      const criteriaNames = key_criteria.map(
        (c: { name: string }) => c.name
      );

      for (const cand of candidates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const edcData = (cand.edc_data || {}) as Record<string, any>;
        const existingCriteria = edcData.key_criteria || [];

        // Re-align criteria: keep evidence for matching names, add empty for new ones
        const updatedCriteria = criteriaNames.map((name: string) => {
          const existing = existingCriteria.find(
            (c: { name: string }) =>
              c.name?.toLowerCase() === name.toLowerCase()
          );
          return existing || { name, evidence: '', context_anchor: '' };
        });

        const updatedEdc = { ...edcData, key_criteria: updatedCriteria };

        await supabase
          .from('candidates')
          .update({ edc_data: updatedEdc })
          .eq('id', cand.id);

        cascadeResult.push({ candidate_name: cand.candidate_name });
      }
    }
  }

  // Log to pipeline_log
  await supabase.from('pipeline_log').insert({
    note_type: 'js',
    granola_title: granola_title || `JS sync for ${search_key || search_id}`,
    matched_search_id: search_id,
    matched_search_key: search_key || null,
    pipeline_status: 'complete',
  });

  return NextResponse.json({
    success: true,
    search_id,
    criteria_cascaded: cascadeResult.length,
    cascade_details: cascadeResult,
  });
}
