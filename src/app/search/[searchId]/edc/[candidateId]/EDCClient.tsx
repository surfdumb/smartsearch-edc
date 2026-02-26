"use client";

import { useState } from "react";
import EDCCard from "@/components/edc/EDCCard";
import { type EDCData } from "@/lib/types";

interface EDCClientProps {
  initialData: EDCData;
}

export default function EDCClient({ initialData }: EDCClientProps) {
  const [data, setData] = useState<EDCData>(initialData);

  return (
    <main className="min-h-screen pt-page-top px-5 pb-page-bottom bg-ss-page-bg">
      <EDCCard
        data={data}
        isConsultantView={true}
        onOurTakeGenerated={(result) => {
          setData({
            ...data,
            our_take: {
              text: result.text,
              recommendation: result.recommendation,
              discussion_points: result.discussion_points,
              original_note: result.original_note,
              ai_rationale: result.ai_rationale,
            },
          });
        }}
      />
    </main>
  );
}
