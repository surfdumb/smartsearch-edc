"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";
import EditableField from "@/components/edc/EditableField";

interface ScopeMatchProps {
  scope_match: {
    dimension: string;
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

      {/* Table header */}
      <div
        className="grid gap-4 pb-3 mb-1"
        style={{
          gridTemplateColumns: "minmax(140px, 1fr) minmax(200px, 2fr) minmax(200px, 2fr) 40px",
          borderBottom: "1px solid var(--ss-border)",
        }}
      >
        <span className="text-meta-label uppercase text-ss-gray-light">Dimension</span>
        <span className="text-meta-label uppercase text-ss-gray-light">Candidate</span>
        <span className="text-meta-label uppercase text-ss-gray-light">Role Requirement</span>
        <span />
      </div>

      {/* Table rows */}
      {scope_match.map((item, i) => (
        <div
          key={i}
          className="grid gap-4 py-[14px] items-start"
          style={{
            gridTemplateColumns: "minmax(140px, 1fr) minmax(200px, 2fr) minmax(200px, 2fr) 40px",
            borderBottom: i < scope_match.length - 1 ? "1px solid var(--ss-border-light)" : "none",
          }}
        >
          <span className="text-criteria-heading text-ss-dark">
            {item.dimension}
          </span>
          <EditableField
            value={item.candidate_actual}
            as="span"
            className="text-body text-ss-gray"
          />
          <EditableField
            value={item.role_requirement}
            as="span"
            className="text-body text-ss-gray"
          />
          <span className="flex items-center justify-center pt-1">
            <AlignmentDot alignment={item.alignment} />
          </span>
        </div>
      ))}

      {/* Scope seasoning callout */}
      {scope_seasoning && (
        <div
          className="mt-5"
          style={{
            padding: "14px 20px",
            borderRadius: "10px",
            borderLeft: "3px solid var(--ss-gold)",
            background: "var(--ss-warm-tint)",
          }}
        >
          <EditableField
            value={scope_seasoning}
            as="p"
            className="text-body text-ss-gray"
            style={{ lineHeight: 1.65 }}
          />
        </div>
      )}
    </section>
  );
}
