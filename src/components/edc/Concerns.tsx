"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

interface ConcernsProps {
  potential_concerns: {
    concern: string;
    severity: 'development' | 'significant';
  }[];
}

export default function Concerns({ potential_concerns }: ConcernsProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Potential Concerns" />

      <div className="flex flex-col" style={{ gap: "10px" }}>
        {potential_concerns.map((item, i) => {
          const isSignificant = item.severity === "significant";
          return (
            <div
              key={i}
              className="flex items-start"
              style={{
                gap: "12px",
                padding: "14px 18px",
                background: isSignificant
                  ? "var(--ss-red-light)"
                  : "var(--ss-yellow-light)",
                borderRadius: "10px",
                borderLeft: `3px solid ${
                  isSignificant ? "var(--ss-red)" : "var(--ss-yellow)"
                }`,
              }}
            >
              {/* Warning icon */}
              <span
                className="shrink-0"
                style={{
                  color: isSignificant ? "var(--ss-red)" : "var(--ss-yellow)",
                  fontSize: "0.85rem",
                  marginTop: "2px",
                }}
              >
                ⚠
              </span>

              {/* Concern text */}
              <EditableField
                value={item.concern}
                as="p"
                style={{
                  fontSize: "0.87rem",
                  color: "var(--ss-dark)",
                  lineHeight: 1.65,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
