"use client";

import SectionLabel from "@/components/ui/SectionLabel";

interface WhyInterestedProps {
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];
}

export default function WhyInterested({ why_interested }: WhyInterestedProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Why Are They Interested?" />

      <div className="flex flex-col" style={{ gap: "8px" }}>
        {why_interested.slice(0, 4).map((item, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ gap: "10px" }}
          >
            {/* Directional arrow */}
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "5px",
                fontSize: "0.65rem",
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
              {item.type === "pull" ? "↗" : "↙"}
            </span>

            {/* Headline only — no detail */}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ss-dark)",
                lineHeight: 1.3,
              }}
            >
              {item.headline}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
