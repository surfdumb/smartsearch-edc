"use client";

import { useState, useEffect, useCallback } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";
import { useEditorContext } from "@/contexts/EditorContext";

interface CompensationData {
  current_base: string;
  current_total: string;
  expected_base: string;
  expected_total: string;
  flexibility: string;
  budget_range?: string;
}

interface CompensationProps {
  compensation: CompensationData;
  notice_period: string;
  earliest_start_date: string;
  candidateId?: string;
}

type CompOverrides = Partial<{
  current_base: string;
  current_total: string;
  expected_base: string;
  expected_total: string;
  budget_range: string;
  flexibility: string;
  notice_period: string;
  earliest_start_date: string;
}>;

function compKey(id: string) {
  return `edc_comp_${id}`;
}

export default function Compensation({
  compensation,
  notice_period,
  earliest_start_date,
  candidateId,
}: CompensationProps) {
  const { isEditable } = useEditorContext();
  const [overrides, setOverrides] = useState<CompOverrides>({});

  useEffect(() => {
    if (!candidateId) return;
    try {
      const stored = localStorage.getItem(compKey(candidateId));
      if (stored) setOverrides(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [candidateId]);

  const save = useCallback(
    (updates: CompOverrides) => {
      if (!candidateId) return;
      setOverrides((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined) delete merged[k as keyof CompOverrides];
          else (merged as Record<string, string>)[k] = v as string;
        }
        try { localStorage.setItem(compKey(candidateId), JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      });
    },
    [candidateId]
  );

  const reset = useCallback(
    (field: keyof CompOverrides) => save({ [field]: undefined }),
    [save]
  );

  // Resolved values
  const v = {
    current_base: overrides.current_base ?? compensation.current_base,
    current_total: overrides.current_total ?? compensation.current_total,
    expected_base: overrides.expected_base ?? compensation.expected_base,
    expected_total: overrides.expected_total ?? compensation.expected_total,
    budget_range: overrides.budget_range ?? compensation.budget_range ?? "Not specified",
    flexibility: overrides.flexibility ?? compensation.flexibility,
    notice_period: overrides.notice_period ?? notice_period,
    earliest_start_date: overrides.earliest_start_date ?? earliest_start_date,
  };

  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Compensation & Timeline" />

      {/* Three-column grid */}
      <div className="comp-grid grid grid-cols-3 mb-4" style={{ gap: "16px" }}>
        {/* Current Package */}
        <CompCard title="Current Package">
          <EditableField
            value={v.current_base}
            originalValue={compensation.current_base}
            onUpdate={(val) => save({ current_base: val })}
            onReset={() => reset("current_base")}
            as="div"
            className="font-cormorant"
            style={{ fontSize: "1.7rem", fontWeight: 600, color: "var(--ss-dark)", textAlign: "center" }}
          />
          <EditableField
            value={v.current_total}
            originalValue={compensation.current_total}
            onUpdate={(val) => save({ current_total: val })}
            onReset={() => reset("current_total")}
            as="div"
            style={{ fontSize: "0.8rem", color: "var(--ss-gray)", marginTop: "4px", textAlign: "center" }}
          />
        </CompCard>

        {/* Expectation */}
        <CompCard title="Expectation">
          <EditableField
            value={v.expected_base}
            originalValue={compensation.expected_base}
            onUpdate={(val) => save({ expected_base: val })}
            onReset={() => reset("expected_base")}
            as="div"
            className="font-cormorant"
            style={{ fontSize: "1.7rem", fontWeight: 600, color: "var(--ss-dark)", textAlign: "center" }}
          />
          <EditableField
            value={v.expected_total}
            originalValue={compensation.expected_total}
            onUpdate={(val) => save({ expected_total: val })}
            onReset={() => reset("expected_total")}
            as="div"
            style={{ fontSize: "0.8rem", color: "var(--ss-gray)", marginTop: "4px", textAlign: "center" }}
          />
        </CompCard>

        {/* Client Budget — gold highlight */}
        <CompCard title="Client Budget" highlighted>
          <EditableField
            value={v.budget_range}
            originalValue={compensation.budget_range ?? "Not specified"}
            onUpdate={(val) => save({ budget_range: val })}
            onReset={() => reset("budget_range")}
            as="div"
            className="font-cormorant"
            style={{ fontSize: "1.7rem", fontWeight: 600, color: "var(--ss-dark)", textAlign: "center" }}
          />
        </CompCard>
      </div>

      {/* Flexibility note */}
      {v.flexibility && (
        <EditableField
          value={v.flexibility}
          originalValue={compensation.flexibility}
          onUpdate={(val) => save({ flexibility: val })}
          onReset={() => reset("flexibility")}
          as="p"
          className="text-body text-ss-gray mb-5"
          style={{ lineHeight: 1.65 }}
        />
      )}

      {/* Notice period and timeline */}
      <div className="flex gap-10 pt-4" style={{ borderTop: "1px solid var(--ss-border-light)" }}>
        <div>
          <span className="text-meta-label uppercase text-ss-gray-light block mb-1">
            Notice Period
          </span>
          <EditableField
            value={v.notice_period}
            originalValue={notice_period}
            onUpdate={(val) => save({ notice_period: val })}
            onReset={() => reset("notice_period")}
            as="span"
            className="text-body text-ss-dark font-medium"
          />
        </div>
        <div>
          <span className="text-meta-label uppercase text-ss-gray-light block mb-1">
            Earliest Start
          </span>
          <EditableField
            value={v.earliest_start_date}
            originalValue={earliest_start_date}
            onUpdate={(val) => save({ earliest_start_date: val })}
            onReset={() => reset("earliest_start_date")}
            as="span"
            className="text-body text-ss-dark font-medium"
          />
        </div>
      </div>

      {/* Edit hint */}
      {isEditable && !candidateId && (
        <p style={{ fontSize: "0.7rem", color: "var(--ss-gray-light)", marginTop: "8px", fontStyle: "italic" }}>
          Changes not persisted — candidateId not provided
        </p>
      )}
    </section>
  );
}

function CompCard({
  title,
  highlighted,
  children,
}: {
  title: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: highlighted ? "var(--ss-gold-glow)" : "var(--ss-warm-tint)",
        border: highlighted
          ? "1px solid rgba(197, 165, 114, 0.2)"
          : "1px solid transparent",
        borderRadius: "12px",
        padding: "20px 22px",
        textAlign: "center",
      }}
    >
      <div
        className="uppercase font-semibold"
        style={{
          fontSize: "0.68rem",
          letterSpacing: "1.5px",
          color: highlighted ? "var(--ss-gold-deep)" : "var(--ss-gray-light)",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
