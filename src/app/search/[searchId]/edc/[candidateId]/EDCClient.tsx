"use client";

import EDCCard from "@/components/edc/EDCCard";
import { type EDCData } from "@/lib/types";

interface EDCClientProps {
  initialData: EDCData;
  searchDimensions?: { name: string; role_requirement: string }[];
  scopeCanonicalFirst?: boolean;
}

export default function EDCClient({ initialData, searchDimensions, scopeCanonicalFirst }: EDCClientProps) {
  return (
    <main className="min-h-screen pt-page-top px-5 pb-page-bottom bg-ss-page-bg">
      <EDCCard
        data={initialData}
        searchDimensions={searchDimensions}
        scopeCanonicalFirst={scopeCanonicalFirst}
      />
    </main>
  );
}
