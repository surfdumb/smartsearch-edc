import Link from "next/link";
import { getSearchCandidates } from "@/lib/data";

export default async function SearchPage({
  params,
}: {
  params: { searchId: string };
}) {
  const candidates = await getSearchCandidates(params.searchId);

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-xl font-semibold text-ss-dark mb-4">
        Search: {params.searchId}
      </h1>
      <ul className="space-y-2">
        {candidates.map((id) => (
          <li key={id}>
            <Link
              href={`/search/${params.searchId}/edc/${id}`}
              className="text-ss-gold hover:text-ss-gold-deep underline"
            >
              {id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
