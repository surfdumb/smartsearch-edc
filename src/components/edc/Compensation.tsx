"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

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
  earliest_start_date?: string;
  candidateId?: string;
}

const EMPTY_VALUES = ["Not mentioned", "Not available", "N/A", ""];

function isEmptyValue(v: string | undefined): boolean {
  return !v || EMPTY_VALUES.includes(v.trim());
}

export default function Compensation({
  compensation,
  notice_period,
}: CompensationProps) {
  // Build rows, skipping empty values
  const rows: { label: string; value: string }[] = [];

  const currentPkg = isEmptyValue(compensation.current_total)
    ? compensation.current_base
    : `${compensation.current_base} (${compensation.current_total} total)`;
  if (!isEmptyValue(compensation.current_base)) {
    rows.push({ label: "Current Package", value: currentPkg });
  }

  const expectedPkg = isEmptyValue(compensation.expected_total)
    ? compensation.expected_base
    : `${compensation.expected_base} (${compensation.expected_total} total)`;
  if (!isEmptyValue(compensation.expected_base)) {
    rows.push({ label: "Expectation", value: expectedPkg });
  }

  if (!isEmptyValue(compensation.budget_range)) {
    rows.push({ label: "Client Budget", value: compensation.budget_range! });
  }

  if (!isEmptyValue(notice_period)) {
    rows.push({ label: "Notice Period", value: notice_period });
  }

  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Compensation & Timeline" />

      <div className="flex flex-col" style={{ gap: "8px" }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "4px 0",
            }}
          >
            <span
              className="uppercase font-semibold"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "1.5px",
                color: "var(--ss-gray-light)",
              }}
            >
              {row.label}
            </span>
            <EditableField
              value={row.value}
              as="span"
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--ss-dark)",
                textAlign: "right",
              }}
            />
          </div>
        ))}
      </div>

      {/* Flexibility note */}
      {!isEmptyValue(compensation.flexibility) && (
        <p
          style={{
            fontSize: "0.78rem",
            fontStyle: "italic",
            color: "var(--ss-gray)",
            marginTop: "12px",
            lineHeight: 1.5,
          }}
        >
          {compensation.flexibility}
        </p>
      )}
    </section>
  );
}
