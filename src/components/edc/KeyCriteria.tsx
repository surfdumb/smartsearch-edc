"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import ContextAnchorPill from "@/components/ui/ContextAnchorPill";
import EditableField from "@/components/edc/EditableField";

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
      <SectionLabel label="Key Criteria Assessment" />

      <div className="flex flex-col gap-0">
        {key_criteria.map((item, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: "14px",
              alignItems: "flex-start",
              padding: "18px 0",
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
                width: "28px",
                height: "28px",
                fontSize: "0.72rem",
                borderRadius: "50%",
                background: "var(--ss-green-badge)",
                color: "var(--ss-green)",
                marginTop: "1px",
              }}
            >
              {i + 1}
            </span>

            {/* Content — name + evidence + context anchor pill stacked below */}
            <div>
              <h4
                className="text-criteria-heading text-ss-dark"
                style={{ marginBottom: "5px" }}
              >
                {item.name}
              </h4>
              <EditableField
                value={item.evidence}
                html
                className="text-body text-ss-gray"
                style={{ lineHeight: 1.65 }}
              />
              {item.context_anchor && (
                <div style={{ marginTop: "8px" }}>
                  <ContextAnchorPill text={item.context_anchor} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
