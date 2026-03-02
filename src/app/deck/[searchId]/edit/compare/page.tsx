import { getDeckData } from "@/lib/data";
import { notFound } from "next/navigation";
import ComparisonView from "@/components/deck/ComparisonView";

export default async function EditComparePage({
  params,
}: {
  params: { searchId: string };
}) {
  const data = await getDeckData(params.searchId);

  if (!data) {
    notFound();
  }

  return <ComparisonView data={data} searchId={params.searchId} isEditRoute={true} />;
}
