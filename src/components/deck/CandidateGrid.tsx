"use client";

import { ReactNode } from "react";

interface CandidateGridProps {
  children: ReactNode;
}

export default function CandidateGrid({ children }: CandidateGridProps) {
  return (
    <div
      className="candidate-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        perspective: "1200px",
        padding: "0 24px",
      }}
    >
      {children}
    </div>
  );
}
