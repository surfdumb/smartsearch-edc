import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function validatePipelineAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-pipeline-secret');
  return secret === process.env.PIPELINE_SECRET;
}

/**
 * Top-level candidate columns derived from edc_data. When the consultant has
 * edited the corresponding edc_data field (tracked in manually_edited_fields),
 * the Engine must NOT overwrite the mirrored top-level column either.
 *
 * Maps: edc_data field name → top-level column name.
 */
const DERIVED_COLUMNS: Array<{ edcField: string; column: string }> = [
  { edcField: 'current_title', column: 'current_title' },
  { edcField: 'current_company', column: 'current_company' },
  { edcField: 'location', column: 'location' },
  { edcField: 'headline', column: 'headline' },
  { edcField: 'flash_summary', column: 'flash_summary' },
  { edcField: 'compensation_alignment', column: 'compensation_alignment' },
  { edcField: 'status', column: 'deck_status' },
  // our_take is special — handled below because shape varies (string vs {text}).
];

/**
 * Field-level merge: for every field in incoming edc_data, prefer the existing
 * value when that field name is in manually_edited_fields. Returns a new object.
 */
function mergeEdcData(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null,
  manuallyEdited: string[]
): Record<string, unknown> {
  if (!existing) return { ...incoming };
  const out: Record<string, unknown> = { ...incoming };
  for (const field of manuallyEdited) {
    if (field in existing) {
      out[field] = existing[field];
    }
  }
  return out;
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
    flash_summary,
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

  // ─── ENGINE-SAFE MERGE ──────────────────────────────────────────────────
  // Look up existing row first. If it exists, we must respect
  // manually_edited_fields and never reset generation_version.
  const { data: existingRaw, error: lookupError } = await supabase
    .from('candidates')
    .select(
      'id, candidate_name, candidate_slug, edc_data, manually_edited_fields, generation_version, ' +
        'headline, current_title, current_company, location, flash_summary, ' +
        'compensation_alignment, deck_status, our_take, our_take_source'
    )
    .eq('search_id', search_id)
    .eq('candidate_slug', slug)
    .maybeSingle();

  if (lookupError) {
    console.error('[pipeline/iv] lookup error:', lookupError);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  // Cast to a known shape — Supabase's generic inference returns a union
  // including GenericStringError until generated types are wired in.
  type ExistingCandidate = {
    id: string;
    candidate_name: string | null;
    candidate_slug: string;
    edc_data: Record<string, unknown> | null;
    manually_edited_fields: string[] | null;
    generation_version: number | null;
    headline: string | null;
    current_title: string | null;
    current_company: string | null;
    location: string | null;
    flash_summary: string | null;
    compensation_alignment: string | null;
    deck_status: string | null;
    our_take: unknown;
    our_take_source: string | null;
  };
  const existing = existingRaw as ExistingCandidate | null;

  const isNewCandidate = !existing;
  const manuallyEdited: string[] = existing?.manually_edited_fields ?? [];
  const editedSet = new Set(manuallyEdited);
  const existingEdc = (existing?.edc_data ?? null) as Record<string, unknown> | null;
  const nextVersion = (existing?.generation_version ?? 0) + 1;

  // Build the merged edc_data JSONB. Engine's incoming edc_data is the baseline;
  // any field the consultant has edited keeps its existing value.
  const mergedEdcData = mergeEdcData(
    edc_data as Record<string, unknown>,
    existingEdc,
    manuallyEdited
  );

  // Engine-derived headline fallback (only used when consultant hasn't edited
  // headline AND incoming doesn't supply one).
  const engineHeadline =
    (edc_data.headline as string | undefined) ||
    `${edc_data.current_title || ''} at ${edc_data.current_company || ''}`;

  // Build the row to write. Engine values go in first; mirrored top-level
  // columns flip to existing values for any field marked manually edited.
  const row: Record<string, unknown> = {
    search_id,
    candidate_name:
      editedSet.has('candidate_name') && existing
        ? ((existing.candidate_name as string | undefined) ?? candidate_name)
        : candidate_name,
    candidate_slug: slug,
    initials,
    current_title: edc_data.current_title || '',
    current_company: edc_data.current_company || '',
    location: edc_data.location || '',
    headline: engineHeadline,
    flash_summary:
      (edc_data.flash_summary as string | null | undefined) ??
      flash_summary ??
      null,
    compensation_alignment: edc_data.compensation_alignment || 'not_set',
    edc_data: mergedEdcData,
    ai_generated_edc: edc_data, // always overwrite — pristine Engine copy
    manually_edited_fields: manuallyEdited, // preserve, never reset
    generation_version: nextVersion, // monotonic increment
    deck_status: isNewCandidate
      ? 'new'
      : ((existing?.deck_status as string | null) ?? 'new'),
    data_status: isNewCandidate ? 'draft' : undefined,
  };

  // Optional metadata fields. For new candidates, set with sensible defaults.
  // For existing candidates, only overwrite when the Engine actually sends a
  // value — never null out raw_transcript/manual_notes/sharepoint_url etc.
  // just because this particular Engine run didn't pass them through.
  if (isNewCandidate) {
    row.consultant = consultant || null;
    row.granola_title = granola_title || null;
    row.eds_date = eds_date || new Date().toISOString();
    row.raw_transcript = raw_transcript || null;
    row.raw_enhanced_notes = raw_enhanced_notes || null;
    row.raw_manual_notes = raw_manual_notes || null;
    row.sharepoint_url = sharepoint_url || null;
    row.invenias_note_id = invenias_note_id || null;
  } else {
    if (consultant) row.consultant = consultant;
    if (granola_title) row.granola_title = granola_title;
    if (eds_date) row.eds_date = eds_date;
    if (raw_transcript) row.raw_transcript = raw_transcript;
    if (raw_enhanced_notes) row.raw_enhanced_notes = raw_enhanced_notes;
    if (raw_manual_notes) row.raw_manual_notes = raw_manual_notes;
    if (sharepoint_url) row.sharepoint_url = sharepoint_url;
    if (invenias_note_id) row.invenias_note_id = invenias_note_id;
  }

  // For each derived top-level column, restore the existing value if the
  // corresponding edc_data field is in manually_edited_fields. This keeps
  // the mirror in sync with the consultant's intent.
  if (existing) {
    for (const { edcField, column } of DERIVED_COLUMNS) {
      if (editedSet.has(edcField)) {
        const preserved = (existing as Record<string, unknown>)[column];
        if (preserved !== undefined && preserved !== null) {
          row[column] = preserved;
        }
      }
    }

    // our_take — special-cased because shape varies. If consultant edited
    // our_take, keep both the existing top-level column AND the existing
    // edc_data.our_take (already preserved by mergeEdcData).
    if (editedSet.has('our_take')) {
      row.our_take = existing.our_take;
      row.our_take_source = existing.our_take_source;
    }
  }

  // Strip `undefined` values so upsert doesn't write nulls into a fresh row
  // (data_status was deliberately undefined for existing rows to preserve state).
  for (const k of Object.keys(row)) {
    if (row[k] === undefined) delete row[k];
  }

  const { data, error } = await supabase
    .from('candidates')
    .upsert(row, {
      onConflict: 'search_id,candidate_slug',
      ignoreDuplicates: false,
    })
    .select('id, candidate_slug')
    .single();

  if (error) {
    console.error('[pipeline/iv] upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(
    `[pipeline/iv] ${isNewCandidate ? 'created' : 'merged'} ${slug}: ` +
      `version ${existing?.generation_version ?? 0}→${nextVersion}, ` +
      `preserved=[${manuallyEdited.join(',') || 'none'}]`
  );

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
    merged: !isNewCandidate,
    generation_version: nextVersion,
    preserved_fields: manuallyEdited,
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
