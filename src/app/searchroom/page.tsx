import type { Metadata } from "next";
import SearchRoom from "./SearchRoom";
import { loadSearchRoomData } from "./load";
import "./search-room.css";

export const metadata: Metadata = {
  title: "The Search Room · SmartSearch",
  description: "Every live search and deck, in one place — SmartSearch internal operations board.",
  robots: { index: false, follow: false },
};

// Live data from Supabase on first paint (snapshot fallback inside the loader).
export const dynamic = "force-dynamic";

export default async function SearchRoomPage() {
  const initial = await loadSearchRoomData();
  return <SearchRoom initial={initial} />;
}
