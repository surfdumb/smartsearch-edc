"use client";

interface DeckNavigationProps {
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleSplit?: () => void;
  currentIndex: number;
  totalCount: number;
  splitActive?: boolean;
  roleTitle?: string;
}

export default function DeckNavigation({
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
  currentIndex,
  totalCount,
  splitActive,
  roleTitle,
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
      {/* Left — back button */}
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

      {/* Centre — role title */}
      {roleTitle && (
        <span
          className="deck-nav-role font-cormorant"
          style={{
            fontSize: "1.05rem",
            fontWeight: 400,
            color: "rgba(197,165,114,0.65)",
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
            fontStyle: "italic",
          }}
        >
          {roleTitle}
        </span>
      )}

      {/* Right — controls */}
      <div className="deck-nav-right" style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
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
            CV Split View
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
              ← Prev
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
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
