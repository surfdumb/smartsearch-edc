"use client";

import { forwardRef } from "react";

interface Props {
  onClick: () => void;
  fluid?: boolean;
}

const OurTakeEmptyState = forwardRef<HTMLButtonElement, Props>(function OurTakeEmptyState(
  { onClick, fluid = false },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{
        fontSize: fluid ? "0.78rem" : "0.86rem",
        fontWeight: 400,
        color: "var(--ss-gray)",
        background: "rgba(250,248,245,0.85)",
        border: "1.5px dashed rgba(197,165,114,0.45)",
        borderRadius: "22px",
        padding: fluid ? "6px 14px" : "8px 18px",
        height: fluid ? "32px" : "38px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.2s",
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: "italic",
        letterSpacing: "0.3px",
      }}
      onMouseOver={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = "rgba(197,165,114,0.08)";
        btn.style.borderColor = "rgba(197,165,114,0.7)";
        btn.style.color = "var(--ss-dark)";
      }}
      onMouseOut={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = "rgba(250,248,245,0.85)";
        btn.style.borderColor = "rgba(197,165,114,0.45)";
        btn.style.color = "var(--ss-gray)";
      }}
    >
      <span style={{ opacity: 0.6 }}>✦</span>
      No manual notes to work with. Click to add.
    </button>
  );
});

export default OurTakeEmptyState;
