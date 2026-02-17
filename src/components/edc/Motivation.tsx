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

      <div className="space-y-0">
        {why_interested.map((item, i) => (
          <div
            key={i}
            className="py-[14px] flex gap-4"
            style={{
              borderBottom:
                i < why_interested.length - 1
                  ? "1px solid var(--ss-border-light)"
                  : "none",
            }}
          >
            {/* Directional indicator */}
            <span
              className="shrink-0 inline-flex items-center justify-center rounded-full"
              style={{
                width: "28px",
                height: "28px",
                marginTop: "2px",
                background:
                  item.type === "pull"
                    ? "var(--ss-green-light)"
                    : "var(--ss-gold-glow)",
                color:
                  item.type === "pull"
                    ? "var(--ss-green)"
                    : "var(--ss-gold-deep)",
              }}
            >
              {item.type === "pull" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10V2M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-criteria-heading text-ss-dark">
                  {item.headline}
                </span>
                <span
                  className="uppercase font-semibold"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "1px",
                    color:
                      item.type === "pull"
                        ? "var(--ss-green-soft)"
                        : "var(--ss-gold)",
                  }}
                >
                  {item.type}
                </span>
              </div>
              <EditableField
                value={item.detail}
                as="p"
                className="text-body text-ss-gray"
                style={{ lineHeight: 1.65 }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
