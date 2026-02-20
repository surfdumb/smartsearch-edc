"use client";

interface DeckNavigationProps {
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleSplit?: () => void;
  currentIndex: number;
  totalCount: number;
  splitActive?: boolean;
}

export default function DeckNavigation({
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
  currentIndex,
  totalCount,
  splitActive,
}: DeckNavigationProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        maxWidth: "1200px",
        margin: "0 auto 16px",
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--ss-gold)",
          fontSize: "0.9rem",
          cursor: "pointer",
          padding: "8px 0",
        }}
      >
        ← Back to Deck
      </button>

      <div className="flex items-center gap-4">
        {onToggleSplit && (
          <button
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

        <div className="flex items-center gap-3">
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
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
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
