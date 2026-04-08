"use client";

type RAGStatus = 'red' | 'amber' | 'green' | null;

interface RAGDotProps {
  status: RAGStatus;
  editable?: boolean;
  onChange?: (status: RAGStatus) => void;
}

const COLORS: Record<string, string> = {
  green: "#4a7c59",
  amber: "#d4a543",
  red: "#c45a5a",
};

const CYCLE: RAGStatus[] = ['green', 'amber', 'red', null];

export default function RAGDot({ status, editable = false, onChange }: RAGDotProps) {
  if (!status && !editable) return null;

  const handleClick = () => {
    if (!editable || !onChange) return;
    const currentIndex = CYCLE.indexOf(status);
    const nextIndex = (currentIndex + 1) % CYCLE.length;
    onChange(CYCLE[nextIndex]);
  };

  return (
    <span
      onClick={editable ? handleClick : undefined}
      title={editable ? "Click to cycle: green \u2192 amber \u2192 red \u2192 none" : (status || "")}
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: status ? COLORS[status] : "transparent",
        border: status ? "none" : "1.5px dashed rgba(0,0,0,0.15)",
        cursor: editable ? "pointer" : "default",
        marginRight: "8px",
        flexShrink: 0,
        transition: "background-color 0.2s ease",
      }}
    />
  );
}
