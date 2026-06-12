import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadSearchRoomData } from "@/app/searchroom/load";
import { SEARCHROOM_COOKIE, verifySearchRoomToken } from "@/lib/searchroomAccess";

/**
 * Search Room board data — read from Supabase (canonical), mapped to the board
 * shape in `src/app/searchroom/load.ts`. Falls back to the static snapshot if
 * Supabase is unconfigured or the read fails.
 *
 * Serves real client + candidate PII, so it is gated server-side by the
 * internal Search Room session cookie (see /api/searchroom/auth).
 *
 * Response shape: { synced_at, searches, candidates }.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(SEARCHROOM_COOKIE)?.value;
  if (!(await verifySearchRoomToken(token))) {
    return NextResponse.json({ error: "access_required" }, { status: 401 });
  }
  const data = await loadSearchRoomData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
