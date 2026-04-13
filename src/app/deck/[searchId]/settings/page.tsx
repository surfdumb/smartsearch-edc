import { notFound } from "next/navigation";
import { getDeckData } from "@/lib/data";
import DeckSettings from "@/components/deck/DeckSettings";

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  params,
}: {
  params: { searchId: string };
}) {
  const data = await getDeckData(params.searchId);
  if (!data) notFound();

  return <DeckSettings data={data} searchId={params.searchId} />;
}
