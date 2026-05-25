/**
 * /api/narrative/[candidateId]
 *
 * Narrative CRUD endpoint. Separate from /api/edits/save (card-side) by
 * design — physical source quarantine.
 *
 * GET    Returns merged narrative (engine baseline + consultant overlay).
 * PUT    Writes one consultant edit to candidate_narratives.
 * DELETE Resets a single edited field (revives engine baseline; for
 *        our_take_narrative, revives the pristine ai_generated_narrative.our_take_narrative).
 *
 * Auth posture: open like /api/edits/save (consultant-facing, deck password
 * is the perimeter). Hardening is a separate session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type NarrativeRow = {
  candidate_id: string;
  search_id: string | null;
  narrative_data: Record<string, unknown> | null;
  ai_generated_narrative: Record<string, unknown> | null;
  our_take_narrative: { text?: string } | null;
  our_take_source: string | null;
  narrative_manually_edited_fields: string[] | null;
  narrative_generation_version: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const supabase = getServiceClient();
  const { candidateId } = params;

  const [candidateResult, narrativeResult] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, candidate_name, edc_data, our_take_source')
      .eq('id', candidateId)
      .maybeSingle(),
    supabase
      .from('candidate_narratives')
      .select('*')
      .eq('candidate_id', candidateId)
      .maybeSingle(),
  ]);

  if (candidateResult.error) {
    return NextResponse.json(
      { error: 'Failed to load candidate', detail: candidateResult.error.message },
      { status: 500 }
    );
  }

  if (!candidateResult.data) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  const candidate = candidateResult.data as {
    id: string;
    candidate_name: string;
    edc_data: { narrative?: Record<string, unknown> } | null;
    our_take_source: string | null;
  };
  const narrativeRow = (narrativeResult.data ?? null) as NarrativeRow | null;

  // Base from edc_data.narrative (engine output, transitional fallback)
  const edcNarrative = (candidate.edc_data?.narrative ?? {}) as Record<string, unknown>;
  const { our_take_narrative: edcOurTake, our_take_source: edcSource, ...edcRest } = edcNarrative as {
    our_take_narrative?: { text?: string } | null;
    our_take_source?: string;
    [k: string]: unknown;
  };

  // Overlay from candidate_narratives (consultant edits)
  const overlayData = (narrativeRow?.narrative_data ?? {}) as Record<string, unknown>;
  const editedFields = (narrativeRow?.narrative_manually_edited_fields ?? []) as string[];

  // Merge:
  //  - When candidate_narratives row exists, narrative_data IS the source of
  //    truth (it was upserted by the IV engine in Phase 3). The edc_data
  //    fallback only kicks in when no narrative row exists yet.
  //  - editedFields tracks which fields the consultant has touched (used by
  //    the IV merge-aware path to preserve consultant edits on re-fire).
  const merged: Record<string, unknown> = narrativeRow
    ? { ...edcRest, ...overlayData }
    : { ...edcRest };

  const ourTake = narrativeRow ? narrativeRow.our_take_narrative : edcOurTake ?? null;
  const source = narrativeRow ? narrativeRow.our_take_source : edcSource ?? null;

  return NextResponse.json({
    candidate_id: candidateId,
    candidate_name: candidate.candidate_name,
    narrative: merged,
    our_take_narrative: ourTake,
    our_take_source: source,
    narrative_generation_version: narrativeRow?.narrative_generation_version ?? 0,
    narrative_manually_edited_fields: editedFields,
    has_narrative_row: !!narrativeRow,
    source_of_truth: narrativeRow ? 'candidate_narratives' : 'edc_data.narrative',
  });
}

type PutBody = {
  field_path: string;
  value: unknown;
  our_take_text?: string;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const supabase = getServiceClient();
  const { candidateId } = params;

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { field_path, value, our_take_text } = body;
  if (!field_path) {
    return NextResponse.json({ error: 'field_path required' }, { status: 400 });
  }

  const { data: candidate, error: candErr } = await supabase
    .from('candidates')
    .select('id, search_id')
    .eq('id', candidateId)
    .maybeSingle();

  if (candErr) {
    return NextResponse.json(
      { error: 'Failed to load candidate', detail: candErr.message },
      { status: 500 }
    );
  }
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  const { data: existingRaw } = await supabase
    .from('candidate_narratives')
    .select('*')
    .eq('candidate_id', candidateId)
    .maybeSingle();
  const existing = existingRaw as NarrativeRow | null;

  const existingData = (existing?.narrative_data ?? {}) as Record<string, unknown>;
  let nextData: Record<string, unknown>;
  let nextOurTake: { text?: string } | null = existing?.our_take_narrative ?? null;

  if (field_path === 'our_take_narrative') {
    nextData = existingData;
    if (our_take_text !== undefined) {
      nextOurTake = { text: our_take_text };
    } else if (value && typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
      nextOurTake = value as { text?: string };
    } else if (typeof value === 'string') {
      nextOurTake = { text: value };
    } else {
      nextOurTake = value as { text?: string } | null;
    }
  } else if (field_path.startsWith('our_take_narrative.')) {
    const sub = field_path.slice('our_take_narrative.'.length);
    nextData = existingData;
    nextOurTake = { ...(nextOurTake ?? {}), [sub]: value } as { text?: string };
  } else {
    nextData = { ...existingData, [field_path]: value };
  }

  const existingEdits = (existing?.narrative_manually_edited_fields ?? []) as string[];
  const nextEdits = Array.from(new Set([...existingEdits, field_path]));

  const candidateRow = candidate as { id: string; search_id: string };

  const { data: upserted, error: upErr } = await supabase
    .from('candidate_narratives')
    .upsert(
      {
        candidate_id: candidateId,
        search_id: candidateRow.search_id,
        narrative_data: nextData,
        our_take_narrative: nextOurTake,
        narrative_manually_edited_fields: nextEdits,
        narrative_generation_version: (existing?.narrative_generation_version ?? 0) + 1,
      },
      { onConflict: 'candidate_id' }
    )
    .select()
    .maybeSingle();

  if (upErr) {
    return NextResponse.json(
      { error: 'Failed to save narrative edit', detail: upErr.message },
      { status: 500 }
    );
  }

  const savedRow = upserted as NarrativeRow | null;

  return NextResponse.json({
    saved: true,
    candidate_id: candidateId,
    field_path,
    narrative_generation_version: savedRow?.narrative_generation_version,
    narrative_manually_edited_fields: savedRow?.narrative_manually_edited_fields,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  const url = new URL(req.url);
  const fieldPath = url.searchParams.get('field_path');
  if (!fieldPath) {
    return NextResponse.json({ error: 'field_path query param required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { candidateId } = params;

  const { data: existingRaw } = await supabase
    .from('candidate_narratives')
    .select('*')
    .eq('candidate_id', candidateId)
    .maybeSingle();
  const existing = existingRaw as NarrativeRow | null;

  if (!existing) {
    return NextResponse.json({ reset: true, candidate_id: candidateId });
  }

  const nextData = { ...((existing.narrative_data ?? {}) as Record<string, unknown>) };
  delete nextData[fieldPath];

  const nextEdits = ((existing.narrative_manually_edited_fields ?? []) as string[]).filter(
    (f) => f !== fieldPath
  );

  let nextOurTake = existing.our_take_narrative;
  if (fieldPath === 'our_take_narrative' || fieldPath.startsWith('our_take_narrative.')) {
    // Revive the pristine engine-generated Our Take so the field has
    // something meaningful to fall back to. ai_generated_narrative carries
    // the full incoming narrative (including our_take_narrative) per the
    // Phase 3 patch.
    const pristine = (existing.ai_generated_narrative ?? {}) as {
      our_take_narrative?: { text?: string } | null;
    };
    nextOurTake = pristine.our_take_narrative ?? null;
  }

  await supabase
    .from('candidate_narratives')
    .update({
      narrative_data: nextData,
      our_take_narrative: nextOurTake,
      narrative_manually_edited_fields: nextEdits,
    })
    .eq('candidate_id', candidateId);

  return NextResponse.json({ reset: true, candidate_id: candidateId, field_path: fieldPath });
}
