"use client";

import { useState, useRef } from "react";
import OurTakePopover from "@/components/edc/OurTakePopover";

interface EDCFooterProps {
  search_name: string;
  roleTitle?: string;
  ourTakeFragments?: string[];
  ourTakeText?: string;
  consultantName?: string;
}

export default function EDCFooter({
  search_name,
  roleTitle,
  ourTakeFragments,
  ourTakeText,
  consultantName,
}: EDCFooterProps) {
  const [ourTakeOpen, setOurTakeOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasOurTake = (ourTakeFragments && ourTakeFragments.length > 0) ||
    (ourTakeText && ourTakeText.trim().length > 0);

  return (
    <footer
      className="font-outfit"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 32px",
        background: "var(--ss-cream)",
        borderTop: "1px solid var(--ss-border)",
        borderRadius: "0 0 var(--edc-card-radius) var(--edc-card-radius)",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Left: search info */}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 400,
          color: "var(--ss-gray)",
          letterSpacing: "0.3px",
        }}
      >
        {search_name}
        {roleTitle && (
          <>
            <span style={{ color: "var(--ss-gold)", margin: "0 6px", opacity: 0.4 }}>·</span>
            {roleTitle}
          </>
        )}
      </span>

      {/* Right: Confidential badge + Our Take trigger */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            fontSize: "8px",
            fontWeight: 500,
            letterSpacing: "1.5px",
            textTransform: "uppercase" as const,
            color: "var(--ss-gray-light)",
            border: "1px solid rgba(160,160,160,0.15)",
            borderRadius: "10px",
            padding: "3px 10px",
          }}
        >
          Confidential
        </span>

        {hasOurTake && (
          <button
            ref={triggerRef}
            onClick={() => setOurTakeOpen(v => !v)}
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--ss-gold)",
              background: "rgba(197,165,114,0.06)",
              border: "1px solid rgba(197,165,114,0.15)",
              borderRadius: "14px",
              padding: "5px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.3)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.15)";
            }}
          >
            <span style={{ animation: "ourTakeShimmer 2s ease-in-out infinite" }}>✦</span>
            Our Take
          </button>
        )}
      </div>

      {/* Our Take Popover — portal rendered */}
      {ourTakeOpen && hasOurTake && (
        <OurTakePopover
          fragments={ourTakeFragments}
          text={ourTakeText}
          consultantName={consultantName}
          triggerRef={triggerRef}
          onClose={() => setOurTakeOpen(false)}
        />
      )}
    </footer>
  );
}
