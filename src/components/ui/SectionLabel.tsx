interface SectionLabelProps {
  label: string;
  /** Reserve right-side space so the line doesn't collide with overlaid elements */
  lineInsetRight?: string;
}

export default function SectionLabel({ label, lineInsetRight }: SectionLabelProps) {
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
    </div>
  );
}
