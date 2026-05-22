import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const maxDuration = 30;

const DERIVED_COLUMNS: Array<{ edcField: string; column: string }> = [
  { edcField: 'current_title', column: 'current_title' },
  { edcField: 'current_company', column: 'current_company' },
  { edcField: 'location', column: 'location' },
  { edcField: 'headline', column: 'headline' },
  { edcField: 'flash_summary', column: 'flash_summary' },
  { edcField: 'compensation_alignment', column: 'compensation_alignment' },
  { edcField: 'status', column: 'deck_status' },
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

interface ApplyBody {
  accept_fields?: string[];
  reject_fields?: string[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: { searchId: string; slug: string } },
): Promise<NextResponse> {
  const { searchId, slug } = params;

  if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(slug)) {
    return NextResponse.json({ error: 'Invalid searchId or slug' }, { status: 400 });
  }

  let body: ApplyBody = {};
  try {
    body = (await req.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const acceptFields = Array.isArray(body.accept_fields) ? body.accept_fields : [];
  const rejectFields = Array.isArray(body.reject_fields) ? body.reject_fields : [];

  const supabase = getServiceClient();

  // Resolve search
  const { data: search } = await supabase
    .from('searches')
    .select('id')
    .eq('search_key', searchId)
    .maybeSingle();
  if (!search) {
    return NextResponse.json({ error: `Search "${searchId}" not found` }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchId_uuid = (search as any).id as string;

  // Load candidate — select * to avoid PostgREST stale-schema column errors.
  const { data: candidateRaw } = await supabase
    .from('candidates')
    .select('*')
    .eq('search_id', searchId_uuid)
    .eq('candidate_slug', slug)
    .maybeSingle();

  if (!candidateRaw) {
    return NextResponse.json({ error: `Candidate "${slug}" not found` }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidate = candidateRaw as any;
  const edcData: Record<string, unknown> = isPlainObject(candidate.edc_data) ? { ...candidate.edc_data } : {};
  const aiGenerated: Record<string, unknown> = isPlainObject(candidate.ai_generated_edc) ? candidate.ai_generated_edc : {};
  const existingEdits: string[] = Array.isArray(candidate.manually_edited_fields) ? candidate.manually_edited_fields : [];

  // Apply accept_fields: copy AI value into edc_data, drop from manually_edited_fields.
  for (const field of acceptFields) {
    if (field in aiGenerated) {
      edcData[field] = aiGenerated[field];
    }
  }
  const acceptSet = new Set(acceptFields);
  const nextEdits = existingEdits.filter((f) => !acceptSet.has(f));

  // Build update — also re-mirror derived columns based on the new edited set.
  const update: Record<string, unknown> = {
    edc_data: edcData,
    manually_edited_fields: nextEdits,
    updated_at: new Date().toISOString(),
  };

  const editedSet = new Set(nextEdits);
  for (const { edcField, column } of DERIVED_COLUMNS) {
    if (acceptSet.has(edcField) && !editedSet.has(edcField)) {
      // Re-derive the column from the accepted AI value.
      const aiVal = aiGenerated[edcField];
      if (aiVal !== undefined && aiVal !== null) {
        update[column] = aiVal;
      }
    }
  }

  // our_take mirror — if accepting our_take, push the AI text into the top-level column.
  if (acceptSet.has('our_take')) {
    const ot = aiGenerated.our_take;
    const otText = typeof ot === 'string' ? ot : isPlainObject(ot) && typeof ot.text === 'string' ? ot.text : null;
    if (otText !== null) {
      update.our_take = otText;
    }
  }

  const { error: updateErr } = await supabase
    .from('candidates')
    .update(update)
    .eq('id', candidate.id);

  if (updateErr) {
    console.error('[apply-regeneration] update failed for', slug, updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  console.log(
    `[apply-regeneration] ${slug}: accepted=[${acceptFields.join(',') || 'none'}], rejected=[${rejectFields.join(',') || 'none'}], nextEdits=[${nextEdits.join(',') || 'none'}]`,
  );

  return NextResponse.json({
    success: true,
    candidate_slug: slug,
    edc_data: edcData,
    manually_edited_fields: nextEdits,
  });
}
