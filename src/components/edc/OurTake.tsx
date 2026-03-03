"use client";

import EditableField from "@/components/edc/EditableField";

interface OurTakeProps {
  text: string;
  recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';
  discussion_points?: string[];
  original_note?: string;
  ai_rationale?: string;
  isConsultantView?: boolean;
  candidateId?: string;
  candidateContext?: string;
  onOurTakeGenerated?: (result: { text: string }) => void;
}

export default function OurTake({ text }: OurTakeProps) {
  // If no text, don't render
  if (!text || text.trim().length === 0) return null;

  return (
    <section
      style={{
        padding: "24px 48px 28px",
        background: "linear-gradient(180deg, var(--ss-warm-tint) 0%, white 100%)",
      }}
    >
      {/* Section header */}
      <div className="flex items-center mb-4" style={{ gap: "10px" }}>
        <span style={{ color: "var(--ss-gold)", fontSize: "1rem" }}>&#10022;</span>
        <span
          className="font-cormorant"
          style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ss-dark)" }}
        >
          Our Take
        </span>
      </div>

      {/* Green-bordered card */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          border: "1px solid #4a7c59",
          boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
          padding: "20px 24px",
        }}
      >
        <EditableField
          value={text}
          as="div"
          style={{
            fontSize: "0.85rem",
            color: "var(--ss-gray)",
            lineHeight: 1.7,
            whiteSpace: "pre-line",
          }}
        />
      </div>
    </section>
  );
}
