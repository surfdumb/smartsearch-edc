"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

interface MotivationProps {
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];
}

export default function Motivation({ why_interested }: MotivationProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Why Are They Interested?" />

      <div className="flex flex-col" style={{ gap: "10px" }}>
        {why_interested.map((item, i) => (
          <div
            key={i}
            className="flex items-start"
            style={{ gap: "12px" }}
          >
            {/* Directional icon — 24px box, border-radius 6px, ↑/↓ characters */}
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                marginTop: "1px",
                fontSize: "0.7rem",
                background:
                  item.type === "pull"
                    ? "var(--ss-green-light)"
                    : "var(--ss-yellow-light)",
                color:
                  item.type === "pull"
                    ? "var(--ss-green)"
                    : "var(--ss-yellow)",
              }}
            >
              {item.type === "pull" ? "↑" : "↓"}
            </span>

            {/* Content */}
            <div style={{ fontSize: "0.88rem", color: "var(--ss-gray)", lineHeight: 1.65 }}>
              <strong style={{ color: "var(--ss-dark)", fontWeight: 600 }}>
                {item.headline}
              </strong>
              {" — "}
              <EditableField
                value={item.detail}
                as="span"
                style={{ color: "var(--ss-gray)", lineHeight: 1.65 }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
