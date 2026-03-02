import { getDeckData } from "@/lib/data";
import { notFound } from "next/navigation";
import DeckClient from "./DeckClient";
import PasswordGate from "@/components/deck/PasswordGate";

export default async function DeckPage({
  params,
}: {
  params: { searchId: string };
}) {
  const data = await getDeckData(params.searchId);

  if (!data) {
    notFound();
  }

  return (
    <PasswordGate>
      <DeckClient data={data} searchId={params.searchId} />
    </PasswordGate>
  );
}
