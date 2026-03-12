"use client";

import { ReactNode, useState } from "react";
import CVPanel from "./CVPanel";

interface SplitViewContainerProps {
  active: boolean;
  cvUrl?: string;
  candidateId?: string;
  searchId?: string;
  children: ReactNode;
}

export default function SplitViewContainer({
  active,
  cvUrl,
  candidateId,
  searchId,
  children,
}: SplitViewContainerProps) {
  const [fullPageCV, setFullPageCV] = useState(false);

  if (!active) {
    return <>{children}</>;
  }

  // Full-page CV mode — CV fills the entire viewport
  if (fullPageCV) {
    return (
      <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "8px 16px",
            background: "#111111",
            borderBottom: "1px solid rgba(197, 165, 114, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setFullPageCV(false)}
            style={{
              background: "transparent",
              border: "1px solid rgba(197,165,114,0.25)",
              color: "var(--ss-gold)",
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "5px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            ← Back to Split View
          </button>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px" }}>
            Full CV View
          </span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CVPanel cvUrl={cvUrl} candidateId={candidateId} searchId={searchId} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        gap: 0,
      }}
    >
      {/* CV Panel — Left (60% = majority of screen) */}
      <div
        style={{
          width: "60%",
          minWidth: "400px",
          overflowY: "auto",
          borderRight: "1px solid rgba(197, 165, 114, 0.15)",
          background: "#111111",
          animation: "slideInLeft 0.4s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CVPanel cvUrl={cvUrl} candidateId={candidateId} searchId={searchId} />
        </div>
        {/* Full-page toggle */}
        <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(197,165,114,0.1)", textAlign: "center" }}>
          <button
            onClick={() => setFullPageCV(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(197,165,114,0.15)",
              color: "rgba(197,165,114,0.6)",
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.3px",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.4)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.6)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.15)";
            }}
          >
            Expand CV Full Page
          </button>
        </div>
      </div>

      {/* EDC Panel — Right (40%) */}
      <div
        style={{
          width: "40%",
          overflowY: "auto",
          padding: "0 16px",
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
