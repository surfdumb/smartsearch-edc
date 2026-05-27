"use client";

import { ReactNode } from "react";

interface DeckNavigationProps {
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleSplit?: () => void;
  currentIndex: number;
  totalCount: number;
  splitActive?: boolean;
  roleTitle?: string;
  /** Slot appended to the left cluster after "Back to Deck", separated by a
   *  thin vertical rule. Used by DeckEDCView in edit mode to host StatusPill. */
  leftExtras?: ReactNode;
  /** Slot prepended to the right cluster before "CV Split View", separated by
   *  a thin vertical rule. Used by DeckEDCView in edit mode to host Reset Edits
   *  and Copy Link. */
  rightExtras?: ReactNode;
}

const ruleStyle: React.CSSProperties = {
  display: "inline-block",
  width: "1px",
  height: "16px",
  background: "rgba(197,165,114,0.20)",
  flexShrink: 0,
};

export default function DeckNavigation({
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
  currentIndex,
  totalCount,
  splitActive,
  roleTitle: _roleTitle,
  leftExtras,
  rightExtras,
}: DeckNavigationProps) {
  return (
    <div
      className="deck-navigation"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "12px 24px",
        maxWidth: "1200px",
        margin: "0 auto 8px",
        gap: "16px",
      }}
    >
      {/* Left — back button + optional extras */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ss-gold)",
            fontSize: "0.9rem",
            cursor: "pointer",
            padding: "8px 0",
            textAlign: "left",
          }}
        >
          ← Back to Deck
        </button>
        {leftExtras && (
          <>
            <span aria-hidden="true" style={ruleStyle} />
            {leftExtras}
          </>
        )}
      </div>

      {/* Centre — Executive Decision Card wordmark */}
      <span
        className="deck-nav-role font-cormorant"
        style={{
          fontSize: "1.5rem",
          fontWeight: 400,
          color: "rgba(197,165,114,0.75)",
          letterSpacing: "0.5px",
          whiteSpace: "nowrap",
        }}
      >
        Executive Decision
        <span style={{ fontWeight: 600, color: "var(--ss-gold)", marginLeft: "6px" }}>Card</span>
      </span>

      {/* Right — optional extras + controls */}
      <div className="deck-nav-right" style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
        {rightExtras && (
          <>
            {rightExtras}
            <span aria-hidden="true" style={ruleStyle} />
          </>
        )}
        {onToggleSplit && (
          <button
            className="deck-nav-split-btn"
            onClick={onToggleSplit}
            style={{
              background: splitActive ? "rgba(197, 165, 114, 0.15)" : "transparent",
              border: "1px solid rgba(197, 165, 114, 0.3)",
              color: "var(--ss-gold)",
              fontSize: "0.8rem",
              padding: "6px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            CV Split
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onPrev && (
            <button
              onClick={onPrev}
              style={{
                background: "transparent",
                border: "1px solid rgba(197, 165, 114, 0.2)",
                color: "var(--ss-gold)",
                fontSize: "0.8rem",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ←
            </button>
          )}
          <span style={{ color: "rgba(var(--deck-text-rgb),0.5)", fontSize: "0.85rem" }}>
            {currentIndex + 1} / {totalCount}
          </span>
          {onNext && (
            <button
              onClick={onNext}
              style={{
                background: "transparent",
                border: "1px solid rgba(197, 165, 114, 0.2)",
                color: "var(--ss-gold)",
                fontSize: "0.8rem",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
