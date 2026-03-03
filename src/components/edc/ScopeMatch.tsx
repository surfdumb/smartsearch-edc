"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";

interface ScopeMatchProps {
  scope_match: {
    scope: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;
}

export default function ScopeMatch({ scope_match }: ScopeMatchProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Scope Match" />

      {/* Horizontally scrollable wrapper for mobile */}
      <div className="scope-match-scroll">
        <div className="scope-match-inner">

          {/* Table header */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "140px 1fr 1fr 36px",
              paddingBottom: "6px",
              borderBottom: "1px solid #eeebe6",
            }}
          >
            <span />
            <span className="text-meta-label uppercase text-ss-gray-light" style={{ fontSize: "0.68rem" }}>
              Candidate
            </span>
            <span className="text-meta-label uppercase text-ss-gray-light" style={{ fontSize: "0.68rem" }}>
              Role Requirement
            </span>
            <span />
          </div>

          {/* Table rows */}
          {scope_match.map((item, i) => (
            <div
              key={i}
              className="grid gap-3 items-start"
              style={{
                gridTemplateColumns: "140px 1fr 1fr 36px",
                padding: "6px 0",
                borderBottom:
                  i < scope_match.length - 1 ? "1px solid var(--ss-border-light)" : "none",
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  color: "var(--ss-dark)",
                  fontSize: "0.82rem",
                }}
              >
                {item.scope}
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--ss-dark)" }}>
                {item.candidate_actual}
              </span>
              <span className="text-body text-ss-gray" style={{ fontSize: "0.82rem" }}>
                {item.role_requirement}
              </span>
              <span className="flex items-center justify-center pt-0.5">
                <AlignmentDot alignment={item.alignment} />
              </span>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
