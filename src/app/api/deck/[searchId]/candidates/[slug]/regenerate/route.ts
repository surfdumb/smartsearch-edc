import { NextRequest, NextResponse } from 'next/server';
import { regenerateCandidate, type RegenerateOptions } from '@/lib/regenerate-candidate';

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { searchId: string; slug: string } },
): Promise<NextResponse> {
  const { searchId, slug } = params;

  if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(slug)) {
    return NextResponse.json({ error: 'Invalid searchId or slug' }, { status: 400 });
  }

  let options: RegenerateOptions = {};
  try {
    const body = await req.json();
    if (body && typeof body === 'object') options = body as RegenerateOptions;
  } catch {
    // No body — fine, use defaults.
  }

  const result = await regenerateCandidate(searchId, slug, options);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, candidate_slug: result.candidate_slug ?? slug },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    candidate_id: result.candidate_id,
    candidate_slug: result.candidate_slug,
    candidate_name: result.candidate_name,
    generation_version: result.generation_version,
    ai_generated_edc: result.ai_generated_edc,
    merged_edc_data: result.merged_edc_data,
    conflicts: result.conflicts,
  });
}
