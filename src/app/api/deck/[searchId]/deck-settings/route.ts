import { NextResponse } from 'next/server';
import { getServiceClient, SUPABASE_ENABLED } from '@/lib/supabase';
import { SLUG_REGEX } from '@/lib/edcAccess';
import { modeToLegacyFields, type OurTakeMode } from '@/lib/our-take-mode';

const VALID_MODES: ReadonlyArray<OurTakeMode> = ['leading', 'button', 'hidden'];

export async function POST(
  request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  const { searchId } = params;
  if (!SLUG_REGEX.test(searchId)) {
    return NextResponse.json({ error: 'Invalid searchId' }, { status: 400 });
  }
  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let body: { our_take_mode?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.our_take_mode !== undefined) {
    if (
      typeof body.our_take_mode !== 'string' ||
      !VALID_MODES.includes(body.our_take_mode as OurTakeMode)
    ) {
      return NextResponse.json(
        { error: `our_take_mode must be one of: ${VALID_MODES.join(', ')}` },
        { status: 400 }
      );
    }
  }

  const supabase = getServiceClient();

  const { data: row, error: readErr } = await supabase
    .from('searches')
    .select('deck_settings')
    .eq('search_key', searchId)
    .maybeSingle();

  if (readErr || !row) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 });
  }

  const current = (row.deck_settings as Record<string, unknown> | null) || {};
  const next = { ...current };

  if (body.our_take_mode !== undefined) {
    const mode = body.our_take_mode as OurTakeMode;
    next.our_take_mode = mode;
    const legacy = modeToLegacyFields(mode);
    next.our_take_display = legacy.our_take_display;
    next.our_take_landing = legacy.our_take_landing;
  }

  const { error: writeErr } = await supabase
    .from('searches')
    .update({ deck_settings: next })
    .eq('search_key', searchId);

  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ deck_settings: next });
}
