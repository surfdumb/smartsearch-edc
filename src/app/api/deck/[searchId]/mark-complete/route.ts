import { NextResponse } from 'next/server';
import { getServiceClient, SUPABASE_ENABLED } from '@/lib/supabase';
import { SLUG_REGEX } from '@/lib/edcAccess';

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

  let body: { complete?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.complete !== 'boolean') {
    return NextResponse.json({ error: 'complete must be a boolean' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const update = body.complete
    ? { is_complete: true, completed_at: new Date().toISOString() }
    : { is_complete: false, completed_at: null };

  // TODO(v1.4): trigger Live Searches → Completed Projects spreadsheet move
  // (Sheets API direct call or Make webhook — pending spreadsheet ID + tab
  // names + row-match key). Until then, the row is moved manually.

  const { error } = await supabase
    .from('searches')
    .update(update)
    .eq('search_key', searchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    is_complete: update.is_complete,
    completed_at: update.completed_at,
  });
}
