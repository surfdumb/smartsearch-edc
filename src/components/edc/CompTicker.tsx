interface CompTickerProps {
  currentTotal?: string;
  expectedTotal?: string;
  onNavigateToComp: () => void;
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

export default function CompTicker({
  currentTotal,
  expectedTotal,
  onNavigateToComp,
}: CompTickerProps) {
  if (isEmpty(currentTotal) && isEmpty(expectedTotal)) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "6px 32px 2px",
        background: "white",
        flexShrink: 0,
        gap: "8px",
      }}
    >
      <span
        style={{
          fontSize: "8.5px",
          fontWeight: 600,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--ss-gray-light)",
        }}
      >
        Comp
      </span>
      <button
        onClick={onNavigateToComp}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "2px 0",
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        {!isEmpty(currentTotal) && (
          <span
            className="font-cormorant"
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--ss-gray)" }}
          >
            {currentTotal}
          </span>
        )}
        <span style={{ fontSize: "11px", color: "var(--ss-gold)" }}>→</span>
        {!isEmpty(expectedTotal) && (
          <span
            className="font-cormorant"
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--ss-dark)" }}
          >
            {expectedTotal}
          </span>
        )}
      </button>
    </div>
  );
}
