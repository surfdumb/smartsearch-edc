import type { Metadata } from "next";
import SearchRoom from "./SearchRoom";
import "./search-room.css";

export const metadata: Metadata = {
  title: "The Search Room · SmartSearch",
  description: "Every live search and deck, in one place — SmartSearch internal operations board.",
  robots: { index: false, follow: false },
};

export default function SearchRoomPage() {
  return <SearchRoom />;
}
