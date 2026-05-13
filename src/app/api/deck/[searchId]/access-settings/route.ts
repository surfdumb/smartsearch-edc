import { NextResponse } from 'next/server';
import { getServiceClient, SUPABASE_ENABLED } from '@/lib/supabase';
import { SLUG_REGEX } from '@/lib/edcAccess';

// Plain-text password storage is intentional: consultants need to read it back
// from the UI to paste into client emails. Threat model: polite gate, not
// anti-determined-attacker.

export async function GET(
  _request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  const { searchId } = params;
  if (!SLUG_REGEX.test(searchId)) {
    return NextResponse.json({ error: 'Invalid searchId' }, { status: 400 });
  }
  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('searches')
    .select('access_password, is_complete, completed_at')
    .eq('search_key', searchId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 });
  }

  return NextResponse.json({
    access_password: data.access_password ?? null,
    is_complete: Boolean(data.is_complete),
    completed_at: data.completed_at ?? null,
  });
}

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

  let body: { password?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let nextValue: string | null;
  if (body.password === null) {
    nextValue = null;
  } else if (typeof body.password === 'string' && body.password.length > 0) {
    nextValue = body.password;
  } else {
    return NextResponse.json(
      { error: 'password must be a non-empty string or null' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('searches')
    .update({ access_password: nextValue })
    .eq('search_key', searchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ access_password: nextValue });
}
