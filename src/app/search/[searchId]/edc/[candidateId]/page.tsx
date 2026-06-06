import { getCandidateData, getDeckData } from "@/lib/data";
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

  // Pull the search context so the standalone card can render Scope Match
  // canonical-first when the search opts in (deck_settings.scope_canonical_first).
  const ctx = await getDeckData(params.searchId);

  return (
    <EDCClient
      initialData={data}
      searchDimensions={ctx?.scope_match_dimensions}
      scopeCanonicalFirst={ctx?.deck_settings?.scope_canonical_first === true}
    />
  );
}
