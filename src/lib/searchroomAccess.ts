import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqualString } from "./edcAccess";

// Server-side gate for the internal Search Room (/searchroom + its data API).
// Shared-secret cookie (JWT via jose), consistent with the per-search edcAccess
// gate. This is the real boundary — the in-page password screen is just UX.

export const SEARCHROOM_COOKIE = "searchroom_access";

function getSecret(): Uint8Array | null {
  const secret = process.env.EDC_COOKIE_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

// Internal password. Defaults to the legacy value so nothing breaks if the env
// var isn't set; set SEARCHROOM_PASSWORD in prod to rotate to something stronger.
export function searchRoomPassword(): string {
  return process.env.SEARCHROOM_PASSWORD || "edc2026";
}

export function checkSearchRoomPassword(input: string): boolean {
  return timingSafeEqualString(input || "", searchRoomPassword());
}

export async function signSearchRoomToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("EDC_COOKIE_SECRET is not set");
  return new SignJWT({ room: "searchroom" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySearchRoomToken(token: string | undefined | null): Promise<boolean> {
  const secret = getSecret();
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.room === "searchroom";
  } catch {
    return false;
  }
}
