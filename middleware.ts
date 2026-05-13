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

  // ───────────────────────────────────────────────────────────────────────
  // PATH EXEMPTIONS — never check the cookie/password for these routes.
  //
  // Two categories:
  //
  //   1. Infrastructure of the gate itself (must be reachable without a
  //      cookie or the user can never get one):
  //        /deck/[slug]/access      — the password entry page
  //        /deck/[slug]/closed      — terminal page for completed searches
  //
  //   2. Consultant-only surfaces. These have no real auth today
  //      (src/lib/auth.ts is a stub returning consultant=true). Path-
  //      exempting them is the pragmatic Stage 1 stance — anyone who knows
  //      the slug can reach these routes. v1.4 follow-up: introduce a real
  //      consultant session, drop every exemption in this category, and
  //      replace it with a session check at the top of this function.
  //        /deck/[slug]/edit                  — edit-mode deck UI
  //        /deck/[slug]/settings(/*)          — settings panel
  //        /api/deck/[slug]/access-settings   — password toggle/save
  //        /api/deck/[slug]/mark-complete     — search status flip
  //
  // Other consultant write APIs (/api/deck/[slug]/hidden, /order, /brief,
  // /criteria-visibility, /sync-criteria, /pdf, /api/edits/save, etc.) are
  // intentionally NOT exempted. Edit mode reaches them via the cookie the
  // consultant gets after entering the password — so they stay protected
  // from un-cookied clients while still working in normal consultant flows.
  // ───────────────────────────────────────────────────────────────────────
  if (
    pathname === `/deck/${slug}/access` ||
    pathname === `/deck/${slug}/closed` ||
    pathname === `/deck/${slug}/edit` ||
    pathname.startsWith(`/deck/${slug}/edit/`) ||
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
