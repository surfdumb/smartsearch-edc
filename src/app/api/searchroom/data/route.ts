import { NextResponse } from "next/server";
import { loadSearchRoomData } from "@/app/searchroom/load";

/**
 * Search Room board data — read from Supabase (canonical), mapped to the board
 * shape in `src/app/searchroom/load.ts`. Falls back to the static snapshot if
 * Supabase is unconfigured or the read fails.
 *
 * Response shape: { synced_at, searches, candidates }. This is the data source
 * for the "Sync" button and the "Synced N ago" indicator on /searchroom.
 *
 * NOTE: this serves real client + candidate PII. /searchroom is currently
 * behind only a client-side gate — gate this route server-side before exposing
 * the board on a public URL.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadSearchRoomData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
