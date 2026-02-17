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

      {key_criteria.map((item, i) => (
        <div
          key={i}
          className="py-criteria-y"
          style={{
            borderBottom:
              i < key_criteria.length - 1
                ? "1px solid var(--ss-border-light)"
                : "none",
          }}
        >
          {/* Criterion header: number badge + name + context anchor pill */}
          <div className="flex items-center gap-3 mb-2">
            {/* Green number badge — ordinal marker, not a score */}
            <span
              className="inline-flex items-center justify-center shrink-0 font-semibold text-white rounded-full"
              style={{
                width: "24px",
                height: "24px",
                fontSize: "0.72rem",
                background: "var(--ss-green)",
                boxShadow: "0 0 0 3px var(--ss-green-badge)",
              }}
            >
              {i + 1}
            </span>
            <span className="text-criteria-heading text-ss-dark">
              {item.name}
            </span>
            {item.context_anchor && (
              <ContextAnchorPill text={item.context_anchor} />
            )}
          </div>

          {/* Evidence paragraph — editable, supports HTML (bold highlights) */}
          <EditableField
            value={item.evidence}
            html
            className="text-body text-ss-gray ml-[36px]"
            style={{ lineHeight: 1.65 }}
          />
        </div>
      ))}
    </section>
  );
}
