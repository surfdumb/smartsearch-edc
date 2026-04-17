import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { resolveSearchId } from '@/lib/supabase-data';
import { stripArtifactsDeep } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

/** Allowed fields that can be updated via the Brief editor. */
const ALLOWED_FIELDS = new Set([
  'position',
  'location',
  'client_display_name',
  'remit',
  'core_mission',
  'why_open',
  'key_responsibilities',
  'key_criteria',
  'budget_base',
  'budget_bonus',
  'budget_lti',
  'budget_di',
  'red_flag_title',
  'red_flag_detail',
  'predecessor_context',
  'candidate_messaging',
  'additional_internal_notes',
  'confidentiality',
  'revenue',
  'team_size',
  'line_manager',
  'kam',
  'js_source_url',
  'scope_match_dimensions',
]);

export async function POST(
  request: Request,
  { params }: { params: { searchId: string } }
) {
  const { searchId } = params;

  try {
    const body = await request.json();

    // searchId is the search_key (e.g. 'htc-sem-ghq'), not the UUID
    const searchUUID = await resolveSearchId(searchId);
    if (!searchUUID) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Build update object from allowed fields only.
    // Strip browser-extension artifacts (e.g., "Say more") from every value.
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = stripArtifactsDeep(value);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('searches')
      .update(updates)
      .eq('id', searchUUID);

    if (error) {
      console.error('[api/brief] Supabase update error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true, fields: Object.keys(updates).filter(k => k !== 'updated_at') });
  } catch (err) {
    console.error('[api/brief] error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
