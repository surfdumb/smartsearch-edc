import { SignJWT, jwtVerify } from 'jose';

export const SLUG_REGEX = /^[a-z0-9-]+$/;

export function cookieName(searchId: string): string {
  return `edc_access_${searchId}`;
}

function getCookieSecret(): Uint8Array {
  const secret = process.env.EDC_COOKIE_SECRET;
  if (!secret) throw new Error('EDC_COOKIE_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(searchId: string): Promise<string> {
  return new SignJWT({ searchId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h')
    .sign(getCookieSecret());
}

export async function verifyAccessToken(token: string, searchId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getCookieSecret());
    return payload.searchId === searchId;
  } catch {
    return false;
  }
}

// ASCII-only assumption — padding counts characters but encoding produces bytes.
// Multi-byte Unicode would silently undercount. Both the manual SQL value and
// the Stage 2 generator produce ASCII-only passwords, so this is fine; do not
// feed Unicode passwords through here.
export function timingSafeEqualString(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length, 32);
  const ab = new TextEncoder().encode(a.padEnd(len, '\0'));
  const bb = new TextEncoder().encode(b.padEnd(len, '\0'));
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= ab[i] ^ bb[i];
  return diff === 0 && a.length === b.length;
}
