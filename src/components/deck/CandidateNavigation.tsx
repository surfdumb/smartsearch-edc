interface CandidateNavigationProps {
  currentIndex: number;
  totalCount: number;
  prevName?: string;
  nextName?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function CandidateNavigation({
  currentIndex,
  totalCount,
  prevName,
  nextName,
  onPrev,
  onNext,
}: CandidateNavigationProps) {
  return (
    <div
      className="font-outfit"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "820px",
        margin: "12px auto 0",
        padding: "0 8px",
      }}
    >
      {/* Previous */}
      <button
        onClick={onPrev}
        disabled={!onPrev}
        style={{
          background: "none",
          border: "none",
          cursor: onPrev ? "pointer" : "default",
          fontSize: "12px",
          fontWeight: 400,
          color: onPrev ? "var(--ss-gray-light)" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 0",
          transition: "color 0.15s",
          fontFamily: "inherit",
        }}
        onMouseOver={(e) => {
          if (onPrev) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
        }}
        onMouseOut={(e) => {
          if (onPrev) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)";
        }}
      >
        <span style={{ fontSize: "14px" }}>←</span>
        {prevName}
      </button>

      {/* Counter */}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "rgba(var(--deck-text-rgb),0.3)",
          letterSpacing: "0.5px",
        }}
      >
        {currentIndex + 1} / {totalCount}
      </span>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={!onNext}
        style={{
          background: "none",
          border: "none",
          cursor: onNext ? "pointer" : "default",
          fontSize: "12px",
          fontWeight: 400,
          color: onNext ? "var(--ss-gray-light)" : "transparent",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 0",
          transition: "color 0.15s",
          fontFamily: "inherit",
        }}
        onMouseOver={(e) => {
          if (onNext) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
        }}
        onMouseOut={(e) => {
          if (onNext) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)";
        }}
      >
        {nextName}
        <span style={{ fontSize: "14px" }}>→</span>
      </button>
    </div>
  );
}
