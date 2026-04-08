"use client";

import { ReactNode, useState, useEffect } from "react";
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
  const [cvCollapsed, setCvCollapsed] = useState(false);
  const [edcCollapsed, setEdcCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobile: default to EDC only (CV collapsed)
  useEffect(() => {
    if (isMobile && active) {
      setCvCollapsed(true);
      setEdcCollapsed(false);
    }
  }, [isMobile, active]);

  // Reset collapse state when split is toggled off then on, or candidate changes
  useEffect(() => {
    if (active && !isMobile) {
      setCvCollapsed(false);
      setEdcCollapsed(false);
      setFullPageCV(false);
    }
  }, [active, candidateId, isMobile]);

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

  // Chevron button style helper
  const chevronBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "rgba(197,165,114,0.5)",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: "4px",
    transition: "all 0.15s",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // Both collapsed: show both tab handles
  if (cvCollapsed && edcCollapsed) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 120px)", background: "#0a0a0a" }}>
        <button
          onClick={() => setCvCollapsed(false)}
          style={{
            writingMode: "vertical-lr",
            padding: "16px 8px",
            background: "#111111",
            border: "none",
            borderRight: "1px solid rgba(197,165,114,0.1)",
            color: "rgba(197,165,114,0.5)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
        >
          CV ▸
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.82rem" }}>Both panels collapsed</span>
        </div>
        <button
          onClick={() => setEdcCollapsed(false)}
          style={{
            writingMode: "vertical-lr",
            padding: "16px 8px",
            background: "#111111",
            border: "none",
            borderLeft: "1px solid rgba(197,165,114,0.1)",
            color: "rgba(197,165,114,0.5)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
        >
          ◂ EDC
        </button>
      </div>
    );
  }

  // CV collapsed → EDC full width
  if (cvCollapsed) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>
        <button
          onClick={() => setCvCollapsed(false)}
          style={{
            writingMode: "vertical-lr",
            padding: "16px 8px",
            background: "#111111",
            border: "none",
            borderRight: "1px solid rgba(197,165,114,0.1)",
            color: "rgba(197,165,114,0.5)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
        >
          CV ▸
        </button>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 16px",
            background: "#0a0a0a",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {children}
        </div>
        <style jsx>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  // EDC collapsed → CV full width
  if (edcCollapsed) {
    return (
      <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#111111",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            <CVPanel cvUrl={cvUrl} candidateId={candidateId} searchId={searchId} />
          </div>
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
        <button
          onClick={() => setEdcCollapsed(false)}
          style={{
            writingMode: "vertical-lr",
            padding: "16px 8px",
            background: "#111111",
            border: "none",
            borderLeft: "1px solid rgba(197,165,114,0.1)",
            color: "rgba(197,165,114,0.5)",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
        >
          ◂ EDC
        </button>
        <style jsx>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  // Both panels open — default split view
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
        {/* CV panel header with collapse control */}
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid rgba(197,165,114,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
            CV
          </span>
          <button
            onClick={() => setCvCollapsed(true)}
            title="Collapse CV panel"
            style={chevronBtnStyle}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
          >
            ◂
          </button>
        </div>
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
          background: "#0a0a0a",
          animation: "fadeIn 0.4s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* EDC panel header with collapse control */}
        <div
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid rgba(197,165,114,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
            EDC
          </span>
          <button
            onClick={() => setEdcCollapsed(true)}
            title="Collapse EDC panel"
            style={chevronBtnStyle}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
          >
            ▸
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          {children}
        </div>
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
