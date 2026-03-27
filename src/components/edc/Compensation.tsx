"use client";

import SectionLabel from "@/components/ui/SectionLabel";

interface CompensationData {
  current_base: string;
  current_bonus?: string;
  current_lti?: string;
  current_benefits?: string;
  current_total: string;
  expected_base: string;
  expected_bonus?: string;
  expected_lti?: string;
  expected_benefits?: string;
  expected_total: string;
  flexibility: string;
  budget_range?: string;
}

interface CompensationProps {
  compensation: CompensationData;
  notice_period: string;
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", "Assessment pending", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

/** Truncate long text values to a reasonable display length */
function truncateVal(v: string, max = 200): string {
  if (v.length <= max) return v;
  const cut = v.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut) + '...';
}

function CompRow({
  label,
  current,
  expected,
  budget,
  hasBudget,
  cols,
  labelStyle,
  valStyle,
  emphasized,
}: {
  label: string;
  current?: string;
  expected?: string;
  budget?: string;
  hasBudget: boolean;
  cols: string;
  labelStyle: React.CSSProperties;
  valStyle: React.CSSProperties;
  emphasized?: boolean;
}) {
  const hasCurrentVal = !isEmpty(current);
  const hasExpectedVal = !isEmpty(expected);
  if (!hasCurrentVal && !hasExpectedVal) return null;

  const usedValStyle = emphasized
    ? { ...valStyle, fontSize: "1.08rem", fontWeight: 700 }
    : valStyle;
  const usedLabelStyle = emphasized
    ? { ...labelStyle, color: "var(--ss-dark)", fontWeight: 700 }
    : labelStyle;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid var(--ss-border-light)",
        ...(emphasized ? { borderTop: "1.5px solid #e0ddd8" } : {}),
      }}
    >
      <span style={usedLabelStyle}>{label}</span>
      {hasBudget && <span style={usedValStyle}>{budget || "—"}</span>}
      <span style={usedValStyle}>
        {hasCurrentVal ? truncateVal(current!) : "—"}
      </span>
      <span style={usedValStyle}>
        {hasExpectedVal ? truncateVal(expected!) : "—"}
      </span>
    </div>
  );
}

export default function Compensation({ compensation, notice_period }: CompensationProps) {
  const hasBase = !isEmpty(compensation.current_base) || !isEmpty(compensation.expected_base);
  const hasBonus = !isEmpty(compensation.current_bonus) || !isEmpty(compensation.expected_bonus);
  const hasLTI = !isEmpty(compensation.current_lti) || !isEmpty(compensation.expected_lti);
  const hasBenefits = !isEmpty(compensation.current_benefits) || !isEmpty(compensation.expected_benefits);
  const hasTotal = !isEmpty(compensation.current_total) || !isEmpty(compensation.expected_total);
  const hasBudget = !isEmpty(compensation.budget_range);

  const colStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#8a8a8a",
  };

  const valStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "var(--ss-dark)",
  };

  const cols = hasBudget ? "120px 1fr 1fr 1fr" : "120px 1fr 1fr";

  // Detect if we only have unstructured text (no parsed rows except total)
  const hasStructuredRows = hasBase || hasBonus || hasLTI || hasBenefits;

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Candidate Salary Details" lineInsetRight="130px" />

      <div style={{ width: "100%" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: "12px",
            paddingBottom: "6px",
            borderBottom: "1px solid #eeebe6",
          }}
        >
          <span style={colStyle}>Component</span>
          {hasBudget && <span style={colStyle}>Target Range</span>}
          <span style={colStyle}>Current</span>
          <span style={colStyle}>Expected</span>
        </div>

        {/* Structured rows */}
        {hasStructuredRows ? (
          <>
            <CompRow label="Base" current={compensation.current_base} expected={compensation.expected_base}
              budget={compensation.budget_range} hasBudget={hasBudget} cols={cols} labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle} />
            <CompRow label="Bonus" current={compensation.current_bonus} expected={compensation.expected_bonus}
              hasBudget={hasBudget} cols={cols} labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle} />
            <CompRow label="LTI" current={compensation.current_lti} expected={compensation.expected_lti}
              hasBudget={hasBudget} cols={cols} labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle} />
            <CompRow label="Benefits" current={compensation.current_benefits} expected={compensation.expected_benefits}
              hasBudget={hasBudget} cols={cols} labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle} />
            {hasTotal && (
              <CompRow label="Total" current={compensation.current_total} expected={compensation.expected_total}
                budget={compensation.budget_range} hasBudget={hasBudget} cols={cols}
                labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized />
            )}
          </>
        ) : (
          /* Fallback: if no structured rows parsed, show total row with the full text */
          hasTotal && (
            <CompRow label="Total" current={compensation.current_total} expected={compensation.expected_total}
              budget={compensation.budget_range} hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized />
          )
        )}
      </div>

      {/* Flexibility note */}
      {!isEmpty(compensation.flexibility) && (
        <p
          style={{
            fontSize: "0.85rem",
            fontStyle: "italic",
            color: "var(--ss-gray)",
            marginTop: "10px",
            lineHeight: 1.5,
          }}
        >
          {compensation.flexibility}
        </p>
      )}

      {/* Notice period */}
      {!isEmpty(notice_period) && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#8a8a8a",
            marginTop: "6px",
          }}
        >
          Notice: {notice_period}
        </div>
      )}
    </section>
  );
}
