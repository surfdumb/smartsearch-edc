/* eslint-disable @next/next/no-img-element */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase';
import {
  cookieName,
  signAccessToken,
  timingSafeEqualString,
  SLUG_REGEX,
} from '@/lib/edcAccess';

export const dynamic = 'force-dynamic';

async function verifyAccess(formData: FormData) {
  'use server';

  const slug = String(formData.get('slug') || '');
  const password = String(formData.get('password') || '');
  const nextParam = String(formData.get('next') || '');

  if (!SLUG_REGEX.test(slug)) redirect('/');

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('searches')
    .select('access_password, is_complete')
    .eq('search_key', slug)
    .maybeSingle();

  if (!data) redirect('/');
  if (data.is_complete) redirect(`/deck/${slug}/closed`);
  if (!data.access_password) redirect(`/deck/${slug}`);

  if (!timingSafeEqualString(password, data.access_password)) {
    const qs = nextParam
      ? `?error=1&next=${encodeURIComponent(nextParam)}`
      : `?error=1`;
    redirect(`/deck/${slug}/access${qs}`);
  }

  const token = await signAccessToken(slug);
  cookies().set(cookieName(slug), token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 48,
  });

  // Open-redirect hygiene: require an exact match or a trailing-slash prefix
  // so that `/deck/abc-attacker` can't masquerade as `/deck/abc/...`.
  const isSafeNextForPrefix = (prefix: string) =>
    nextParam === prefix || nextParam.startsWith(`${prefix}/`);
  const safeNext =
    isSafeNextForPrefix(`/deck/${slug}`) ||
    isSafeNextForPrefix(`/api/deck/${slug}`) ||
    isSafeNextForPrefix(`/api/edc/${slug}`)
      ? nextParam
      : `/deck/${slug}`;
  redirect(safeNext);
}

export default function AccessPage({
  params,
  searchParams,
}: {
  params: { searchId: string };
  searchParams: { error?: string; next?: string };
}) {
  const showError = searchParams.error === '1';
  const nextParam = searchParams.next || '';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background:
            'radial-gradient(ellipse, rgba(197,165,114,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          style={{ height: '26px', opacity: 0.45, marginBottom: '36px' }}
        />

        <h1
          className="font-cormorant"
          style={{
            fontSize: '1.7rem',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '10px',
            fontStyle: 'italic',
            lineHeight: 1.2,
          }}
        >
          This deck is <span style={{ color: 'var(--ss-gold)' }}>confidential</span>
        </h1>
        <p
          style={{
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            marginBottom: '40px',
            fontWeight: 400,
          }}
        >
          Enter the access code shared with you to view the candidate intelligence.
        </p>

        <form action={verifyAccess}>
          <input type="hidden" name="slug" value={params.searchId} />
          <input type="hidden" name="next" value={nextParam} />

          <div style={{ marginBottom: '12px' }}>
            <input
              name="password"
              type="password"
              autoFocus
              autoComplete="off"
              placeholder="Access code"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  showError ? 'rgba(184,84,80,0.5)' : 'rgba(197,165,114,0.2)'
                }`,
                borderRadius: '10px',
                padding: '14px 18px',
                fontSize: '0.95rem',
                color: 'rgba(255,255,255,0.85)',
                outline: 'none',
                letterSpacing: '1px',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            />
          </div>

          <p
            style={{
              fontSize: '0.72rem',
              color: showError ? 'rgba(201,149,58,0.85)' : 'transparent',
              letterSpacing: '0.3px',
              marginBottom: '16px',
              minHeight: '18px',
              lineHeight: 1.5,
            }}
          >
            That code didn&apos;t match. Please check your email or contact your
            SmartSearch consultant.
          </p>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(197,165,114,0.3)',
              borderRadius: '10px',
              padding: '13px 24px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--ss-gold)',
              letterSpacing: '1px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            View Deck
          </button>
        </form>
      </div>
    </main>
  );
}
