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
  // Hide section entirely if no real motivation data
  const hasRealData = why_interested.length > 0 &&
    !why_interested.every((item) => item.headline === 'See candidate overview' || !item.headline);
  if (!hasRealData) return null;

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Why Are They Interested?" />

      <div className="flex flex-col" style={{ gap: "5px" }}>
        {why_interested.slice(0, 4).map((item, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ gap: "8px" }}
          >
            {/* Directional arrow */}
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                fontSize: "0.6rem",
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
                fontSize: "0.95rem",
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
