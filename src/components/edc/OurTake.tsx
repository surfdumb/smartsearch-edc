"use client";

import EditableField from "@/components/edc/EditableField";

interface OurTakeProps {
  text: string;
  consultant_name: string;
}

export default function OurTake({ text, consultant_name }: OurTakeProps) {
  return (
    <section
      style={{
        padding: "36px 48px 40px",
        background: "linear-gradient(180deg, var(--ss-warm-tint) 0%, white 100%)",
        position: "relative",
      }}
    >
      {/* Section header — Cormorant Garamond treatment */}
      <div className="flex items-center mb-6" style={{ gap: "10px" }}>
        <span style={{ color: "var(--ss-gold)", fontSize: "1.1rem" }}>✦</span>
        <span
          className="font-cormorant"
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "var(--ss-dark)",
          }}
        >
          Our Take
        </span>
        <span
          style={{
            fontSize: "0.82rem",
            color: "var(--ss-gray-light)",
            fontWeight: 400,
            marginLeft: "4px",
          }}
        >
          — {consultant_name}
        </span>
      </div>

      {/* Our Take card — white with subtle border, editable */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #eeebe6",
          boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Body text */}
        <div style={{ padding: "22px 28px" }}>
          <EditableField
            value={text}
            as="p"
            style={{
              fontSize: "0.9rem",
              color: "var(--ss-gray)",
              lineHeight: 1.8,
            }}
          />
        </div>
      </div>
    </section>
  );
}
