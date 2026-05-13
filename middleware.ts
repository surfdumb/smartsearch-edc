import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookieName, verifyAccessToken, SLUG_REGEX } from '@/lib/edcAccess';

export const config = {
  matcher: ['/deck/:slug*', '/api/deck/:slug*', '/api/edc/:slug*'],
};

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

function extractSlug(pathname: string): string | null {
  const m = pathname.match(/^\/(?:api\/)?(?:deck|edc)\/([^\/]+)/);
  if (!m) return null;
  return SLUG_REGEX.test(m[1]) ? m[1] : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const slug = extractSlug(pathname);
  if (!slug) return NextResponse.next();

  // Avoid redirect loops on the gate page and the closed page. Also exempt the
  // consultant settings route + its two admin APIs so password management isn't
  // blocked by the client gate (chicken-and-egg: consultant needs to manage the
  // password before they've entered it). These have no real auth today
  // (src/lib/auth.ts is a stub) — tracked as a v1.4 follow-up.
  if (
    pathname === `/deck/${slug}/access` ||
    pathname === `/deck/${slug}/closed` ||
    pathname === `/deck/${slug}/settings` ||
    pathname.startsWith(`/deck/${slug}/settings/`) ||
    pathname === `/api/deck/${slug}/access-settings` ||
    pathname === `/api/deck/${slug}/mark-complete`
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.next();

  const supabase = createClient(supabaseUrl, serviceKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });

  const { data, error } = await supabase
    .from('searches')
    .select('access_password, is_complete')
    .eq('search_key', slug)
    .maybeSingle();

  if (error || !data) return NextResponse.next();
  if (!data.access_password) return NextResponse.next();

  if (data.is_complete) {
    return isApiPath(pathname)
      ? NextResponse.json({ error: 'search_closed' }, { status: 410 })
      : NextResponse.redirect(new URL(`/deck/${slug}/closed`, req.url));
  }

  const token = req.cookies.get(cookieName(slug))?.value;
  if (token && (await verifyAccessToken(token, slug))) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: 'access_required' }, { status: 401 });
  }
  const url = new URL(`/deck/${slug}/access`, req.url);
  url.searchParams.set('next', pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
