import type { Metadata } from "next";
import { cookies } from "next/headers";
import SearchRoom from "./SearchRoom";
import { loadSearchRoomData } from "./load";
import { SEARCHROOM_COOKIE, verifySearchRoomToken } from "@/lib/searchroomAccess";
import "./search-room.css";

export const metadata: Metadata = {
  title: "The Search Room · SmartSearch",
  description: "Every live search and deck, in one place — SmartSearch internal operations board.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SearchRoomPage() {
  // Server-side gate: only fetch + send the (PII-bearing) board data once the
  // internal session cookie is present. Unauthed visitors get the gate only.
  const token = (await cookies()).get(SEARCHROOM_COOKIE)?.value;
  const authed = await verifySearchRoomToken(token);
  const initial = authed ? await loadSearchRoomData() : null;
  return <SearchRoom authed={authed} initial={initial} />;
}
