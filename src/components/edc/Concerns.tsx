"use client";

import SectionLabel from "@/components/ui/SectionLabel";

interface ConcernsProps {
  concerns: {
    concern: string;
    severity: 'development' | 'significant';
  }[];
}

export default function Concerns({ concerns }: ConcernsProps) {
  if (!concerns || concerns.length === 0) return null;

  return (
    <section
      className="px-section-x py-section-y"
      style={{
        background: "rgba(201,149,58,0.03)",
        borderTop: "1px solid var(--ss-border)",
      }}
    >
      <SectionLabel label="Potential Concerns" />

      <div className="flex flex-col" style={{ gap: "5px" }}>
        {concerns.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ gap: "8px" }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--ss-yellow)", flexShrink: 0 }}>
              ⚠
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ss-dark)",
                lineHeight: 1.3,
              }}
            >
              {item.concern}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
