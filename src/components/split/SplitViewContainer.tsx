"use client";

import { ReactNode } from "react";
import CVPanel from "./CVPanel";

interface SplitViewContainerProps {
  active: boolean;
  cvUrl?: string;
  candidateId?: string;
  children: ReactNode;
}

export default function SplitViewContainer({
  active,
  cvUrl,
  candidateId,
  children,
}: SplitViewContainerProps) {
  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        gap: 0,
      }}
    >
      {/* CV Panel — Left */}
      <div
        style={{
          width: "40%",
          overflowY: "auto",
          borderRight: "1px solid rgba(197, 165, 114, 0.15)",
          background: "#111111",
          animation: "slideInLeft 0.4s ease-out",
        }}
      >
        <CVPanel cvUrl={cvUrl} candidateId={candidateId} />
      </div>

      {/* EDC Panel — Right */}
      <div
        style={{
          width: "60%",
          overflowY: "auto",
          padding: "24px",
          background: "#0a0a0a",
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        {children}
      </div>

      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
