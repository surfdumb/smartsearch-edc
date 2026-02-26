import { getDeckData } from "@/lib/data";
import { notFound } from "next/navigation";
import DeckClient from "./DeckClient";

export default async function DeckPage({
  params,
}: {
  params: { searchId: string };
}) {
  const data = await getDeckData(params.searchId);

  if (!data) {
    notFound();
  }

  return <DeckClient data={data} searchId={params.searchId} />;
}
