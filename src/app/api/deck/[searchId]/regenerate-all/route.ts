import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { regenerateCandidate } from '@/lib/regenerate-candidate';

export const maxDuration = 300;

interface BulkResultEntry {
  candidate_slug: string;
  candidate_name?: string;
  generation_version?: number;
  conflicts?: {
    field: string;
    field_label: string;
    consultant_value: unknown;
    ai_value: unknown;
  }[];
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { searchId: string } },
): Promise<NextResponse> {
  const { searchId } = params;

  if (!/^[a-z0-9-]+$/i.test(searchId)) {
    return NextResponse.json({ error: 'Invalid searchId' }, { status: 400 });
  }

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
  const searchUUID = (search as any).id as string;

  const { data: candidates, error: candErr } = await supabase
    .from('candidates')
    .select('candidate_slug, candidate_name, raw_manual_notes')
    .eq('search_id', searchUUID)
    .order('candidate_name');

  if (candErr) {
    return NextResponse.json({ error: candErr.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      success: true,
      candidates_processed: 0,
      candidates_with_conflicts: 0,
      results: [],
      skipped: [],
      failed: [],
    });
  }

  const results: BulkResultEntry[] = [];
  const skipped: { candidate_slug: string; reason: string }[] = [];
  const failed: { candidate_slug: string; error: string }[] = [];

  // Serial loop — Anthropic rate limits + simpler bulk progress semantics.
  for (const c of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = c as any;
    const slug = row.candidate_slug as string;
    const notes = (row.raw_manual_notes as string | null) || '';

    if (notes.trim().length === 0) {
      skipped.push({ candidate_slug: slug, reason: 'no raw_manual_notes' });
      continue;
    }

    try {
      const result = await regenerateCandidate(searchId, slug);
      if (result.ok) {
        results.push({
          candidate_slug: result.candidate_slug,
          candidate_name: result.candidate_name,
          generation_version: result.generation_version,
          conflicts: result.conflicts.map((cf) => ({
            field: cf.field,
            field_label: cf.field_label,
            consultant_value: cf.consultant_value,
            ai_value: cf.ai_value,
          })),
        });
      } else {
        if (result.status === 422) {
          skipped.push({ candidate_slug: slug, reason: result.error });
        } else {
          failed.push({ candidate_slug: slug, error: result.error });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[regenerate-all] candidate failed:', slug, msg);
      failed.push({ candidate_slug: slug, error: msg });
    }
  }

  const candidatesWithConflicts = results.filter((r) => (r.conflicts?.length ?? 0) > 0).length;

  return NextResponse.json({
    success: true,
    candidates_processed: results.length,
    candidates_with_conflicts: candidatesWithConflicts,
    results,
    skipped,
    failed,
  });
}
