interface ContextAnchorPillProps {
  text: string;
}

export default function ContextAnchorPill({ text }: ContextAnchorPillProps) {
  return (
    <span
      className="inline-block font-semibold"
      style={{
        fontSize: "0.68rem",
        padding: "4px 11px",
        borderRadius: "12px",
        background: "rgba(74, 106, 140, 0.10)",
        color: "#4a6a8c",
        whiteSpace: "normal",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        maxWidth: "220px",
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}
