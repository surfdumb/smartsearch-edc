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

      <div className="space-y-0">
        {potential_concerns.map((item, i) => (
          <div
            key={i}
            className="py-[14px] flex gap-4"
            style={{
              borderBottom:
                i < potential_concerns.length - 1
                  ? "1px solid var(--ss-border-light)"
                  : "none",
            }}
          >
            {/* Warning icon */}
            <span
              className="shrink-0 mt-[2px]"
              style={{
                color:
                  item.severity === "significant"
                    ? "var(--ss-red)"
                    : "var(--ss-yellow)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 6.5v3M9 12.5h.007M7.866 2.996L1.213 14.25a1.309 1.309 0 001.134 1.964h13.306a1.309 1.309 0 001.134-1.964L10.134 2.996a1.309 1.309 0 00-2.268 0z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="uppercase font-semibold rounded-full px-2 py-[2px]"
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.8px",
                    background:
                      item.severity === "significant"
                        ? "var(--ss-red-light)"
                        : "var(--ss-yellow-light)",
                    color:
                      item.severity === "significant"
                        ? "var(--ss-red)"
                        : "var(--ss-yellow)",
                  }}
                >
                  {item.severity === "significant"
                    ? "Significant Concern"
                    : "Development Area"}
                </span>
              </div>
              <EditableField
                value={item.concern}
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
