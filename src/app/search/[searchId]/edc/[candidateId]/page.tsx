import { getCandidateData } from "@/lib/data";
import { notFound } from "next/navigation";
import EDCClient from "./EDCClient";

export const dynamic = 'force-dynamic';

export default async function CandidateEDCPage({
  params,
}: {
  params: { searchId: string; candidateId: string };
}) {
  const data = await getCandidateData(params.searchId, params.candidateId);

  if (!data) {
    notFound();
  }

  return <EDCClient initialData={data} />;
}
