import { createClient } from '@supabase/supabase-js';

// Server-side client (service role - full access, no RLS)
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server env vars');
  return createClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        return fetch(input, { ...init, cache: 'no-store' });
      },
    },
  });
}

// getServiceClient above is the ONLY Supabase client in this codebase, and it
// pins cache: 'no-store' on every request — regenerated/edited data must be
// visible on the next navigation without a hard refresh. Any future client
// factory must carry an explicit cache policy too. (A getBrowserClient anon
// factory without one used to live here; it had zero callers and was removed.)

export const SUPABASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
