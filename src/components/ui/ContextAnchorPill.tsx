interface ContextAnchorPillProps {
  text: string;
}

export default function ContextAnchorPill({ text }: ContextAnchorPillProps) {
  return (
    <span
      className="inline-block font-semibold whitespace-nowrap"
      style={{
        fontSize: "0.68rem",
        padding: "4px 11px",
        borderRadius: "12px",
        background: "rgba(74, 106, 140, 0.10)",
        color: "#4a6a8c",
      }}
    >
      {text}
    </span>
  );
}
