"use client";

import EDCCard from "@/components/edc/EDCCard";
import { type EDCData } from "@/lib/types";

interface EDCClientProps {
  initialData: EDCData;
}

export default function EDCClient({ initialData }: EDCClientProps) {
  return (
    <main className="min-h-screen pt-page-top px-5 pb-page-bottom bg-ss-page-bg">
      <EDCCard data={initialData} />
    </main>
  );
}
