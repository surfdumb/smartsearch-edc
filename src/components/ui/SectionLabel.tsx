interface SectionLabelProps {
  label: string;
  /** Reserve right-side space so the line doesn't collide with overlaid elements */
  lineInsetRight?: string;
  /** When true and hasEdits is true, show "↺ Reset section" link */
  isEditable?: boolean;
  /** Whether any field in this section has been edited */
  hasEdits?: boolean;
  /** Called when "↺ Reset section" is clicked */
  onResetSection?: () => void;
}

export default function SectionLabel({ label, lineInsetRight, isEditable, hasEdits, onResetSection }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-[10px] mb-3" style={lineInsetRight ? { paddingRight: lineInsetRight } : undefined}>
      <span
        className="uppercase font-semibold whitespace-nowrap"
        style={{
          fontSize: "0.65rem",
          letterSpacing: "2.5px",
          color: "#8a8a8a",
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "#eeebe6" }}
      />
      {isEditable && hasEdits && onResetSection && (
        <button
          onClick={onResetSection}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.62rem",
            color: "var(--ss-gold)",
            opacity: 0.6,
            whiteSpace: "nowrap",
            padding: "0 2px",
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; }}
        >
          ↺ Reset section
        </button>
      )}
    </div>
  );
}
