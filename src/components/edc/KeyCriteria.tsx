"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import ContextAnchorPill from "@/components/ui/ContextAnchorPill";

interface KeyCriteriaProps {
  key_criteria: {
    name: string;
    evidence: string;
    context_anchor?: string;
  }[];
}

export default function KeyCriteria({ key_criteria }: KeyCriteriaProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Key Criteria" />

      <div className="flex flex-col gap-0">
        {key_criteria.map((item, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: "10px",
              alignItems: "flex-start",
              padding: "7px 0",
              borderBottom:
                i < key_criteria.length - 1
                  ? "1px solid var(--ss-border-light)"
                  : "none",
            }}
          >
            {/* Green number badge — ordinal, NOT a score */}
            <span
              className="inline-flex items-center justify-center shrink-0 font-bold"
              style={{
                width: "24px",
                height: "24px",
                fontSize: "0.68rem",
                borderRadius: "50%",
                background: "var(--ss-green-badge)",
                color: "var(--ss-green)",
                marginTop: "2px",
              }}
            >
              {i + 1}
            </span>

            {/* Content — name + evidence bullet + inline context pill */}
            <div>
              <h4
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--ss-dark)",
                  marginBottom: "3px",
                }}
              >
                {item.name}
              </h4>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div
                  style={{
                    fontSize: "0.82rem",
                    lineHeight: 1.5,
                    color: "var(--ss-gray)",
                    flex: 1,
                    minWidth: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: item.evidence }}
                />
                {item.context_anchor && (
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    <ContextAnchorPill text={item.context_anchor} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
