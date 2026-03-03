"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";
import EditableField from "@/components/edc/EditableField";

interface ScopeMatchProps {
  scope_match: {
    scope: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;
}

export default function ScopeMatch({ scope_match, scope_seasoning }: ScopeMatchProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Scope Match" />

      {/* Scope seasoning callout — only rendered when showNarrative is true (controlled by parent) */}
      {scope_seasoning && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: "10px",
            borderLeft: "3px solid var(--ss-gold)",
            background: "var(--ss-warm-tint)",
            marginBottom: "18px",
            fontStyle: "italic",
          }}
        >
          <EditableField
            value={scope_seasoning}
            as="p"
            html
            className="text-body"
            style={{ lineHeight: 1.65, color: "var(--ss-dark-soft)" }}
          />
        </div>
      )}

      {/* Horizontally scrollable wrapper for mobile */}
      <div className="scope-match-scroll">
        <div className="scope-match-inner">

          {/* Table header */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "160px 1fr 1fr 48px",
              paddingBottom: "10px",
              borderBottom: "1px solid #eeebe6",
            }}
          >
            <span className="text-meta-label uppercase text-ss-gray-light" style={{ fontSize: "0.7rem" }}>
              Scope
            </span>
            <span className="text-meta-label uppercase text-ss-gray-light" style={{ fontSize: "0.7rem" }}>
              Candidate
            </span>
            <span className="text-meta-label uppercase text-ss-gray-light" style={{ fontSize: "0.7rem" }}>
              Role Requirement
            </span>
            <span />
          </div>

          {/* Table rows */}
          {scope_match.map((item, i) => {
            // Map 'gap' → 'partial' for client view (no red)
            const dotAlignment = item.alignment === 'gap' ? 'partial' : item.alignment;
            return (
              <div
                key={i}
                className="grid gap-4 items-start"
                style={{
                  gridTemplateColumns: "160px 1fr 1fr 48px",
                  padding: "10px 0",
                  borderBottom:
                    i < scope_match.length - 1 ? "1px solid var(--ss-border-light)" : "none",
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--ss-dark)",
                    fontSize: "0.85rem",
                  }}
                >
                  {item.scope}
                </span>
                <EditableField
                  value={item.candidate_actual}
                  as="span"
                  className="line-clamp-2"
                  style={{ fontSize: "0.88rem", color: "var(--ss-dark)" }}
                />
                <EditableField
                  value={item.role_requirement}
                  as="span"
                  className="text-body text-ss-gray line-clamp-2"
                  style={{ fontSize: "0.88rem" }}
                />
                <span className="flex items-center justify-center pt-1">
                  <AlignmentDot alignment={dotAlignment} />
                </span>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
