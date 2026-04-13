import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pipeline/log?search_key=nor-swf-svp&limit=20
 *
 * Returns recent pipeline_log entries. Optionally filter by search_key.
 * Protected by PIPELINE_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-pipeline-secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const searchKey = searchParams.get('search_key');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  const supabase = getServiceClient();

  let query = supabase
    .from('pipeline_log')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (searchKey) {
    query = query.eq('matched_search_key', searchKey);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length || 0,
    entries: data || [],
  });
}
