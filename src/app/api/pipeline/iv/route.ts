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
    candidate_name,
    edc_data,
    consultant,
    granola_title,
    eds_date,
    raw_transcript,
    raw_enhanced_notes,
    raw_manual_notes,
    sharepoint_url,
    invenias_note_id,
  } = payload;

  if (!search_id || !candidate_name || !edc_data) {
    return NextResponse.json(
      { error: 'Missing required fields: search_id, candidate_name, edc_data' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Generate slug from candidate name
  const slug = candidate_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Generate initials
  const parts = candidate_name.split(' ');
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : candidate_name.slice(0, 2).toUpperCase();

  // Upsert candidate (match on search_id + candidate_slug)
  const { data, error } = await supabase
    .from('candidates')
    .upsert(
      {
        search_id,
        candidate_name,
        candidate_slug: slug,
        current_title: edc_data.current_title || '',
        current_company: edc_data.current_company || '',
        location: edc_data.location || '',
        initials,
        headline:
          edc_data.headline ||
          `${edc_data.current_title || ''} at ${edc_data.current_company || ''}`,
        flash_summary: edc_data.flash_summary || null,
        compensation_alignment: edc_data.compensation_alignment || 'not_set',
        edc_data,
        ai_generated_edc: edc_data,
        manually_edited_fields: [],
        generation_version: 1,
        data_status: 'draft',
        deck_status: 'new',
        consultant: consultant || null,
        granola_title: granola_title || null,
        eds_date: eds_date || new Date().toISOString(),
        raw_transcript: raw_transcript || null,
        raw_enhanced_notes: raw_enhanced_notes || null,
        raw_manual_notes: raw_manual_notes || null,
        sharepoint_url: sharepoint_url || null,
        invenias_note_id: invenias_note_id || null,
      },
      {
        onConflict: 'search_id,candidate_slug',
        ignoreDuplicates: false,
      }
    )
    .select('id, candidate_slug')
    .single();

  if (error) {
    console.error('[pipeline/iv] upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update pipeline_log
  if (granola_title) {
    await supabase
      .from('pipeline_log')
      .update({ pipeline_status: 'complete' })
      .eq('granola_title', granola_title)
      .eq('pipeline_status', 'matched');
  }

  return NextResponse.json({
    success: true,
    candidate_id: data.id,
    candidate_slug: data.candidate_slug,
    search_key: search_key || null,
  });
}

// PATCH — update an existing candidate with SharePoint URL / Invenias ID
export async function PATCH(req: NextRequest) {
  if (!validatePipelineAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { candidate_id, sharepoint_url, invenias_note_id } = await req.json();

  if (!candidate_id) {
    return NextResponse.json({ error: 'Missing candidate_id' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const updates: Record<string, string> = {};
  if (sharepoint_url) updates.sharepoint_url = sharepoint_url;
  if (invenias_note_id) updates.invenias_note_id = invenias_note_id;

  const { error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', candidate_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
