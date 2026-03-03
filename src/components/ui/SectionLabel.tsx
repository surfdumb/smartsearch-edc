interface SectionLabelProps {
  label: string;
}

export default function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-[10px] mb-3">
      <span
        className="uppercase font-semibold whitespace-nowrap"
        style={{
          fontSize: "0.65rem",
          letterSpacing: "2.5px",
          color: "var(--ss-gray-light)",
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
