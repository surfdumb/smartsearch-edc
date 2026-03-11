"use client";

import SectionLabel from "@/components/ui/SectionLabel";

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
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

export default function Compensation({ compensation, notice_period }: CompensationProps) {
  const hasBase = !isEmpty(compensation.current_base) || !isEmpty(compensation.expected_base);
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

  const totalValStyle: React.CSSProperties = {
    fontSize: "1.08rem",
    fontWeight: 700,
    color: "var(--ss-dark)",
  };

  // Determine grid columns based on whether budget/target range exists
  const cols = hasBudget ? "120px 1fr 1fr 1fr" : "120px 1fr 1fr";

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

        {/* Base row */}
        {hasBase && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: "12px",
              padding: "8px 0",
              borderBottom: "1px solid var(--ss-border-light)",
            }}
          >
            <span style={{ ...colStyle, color: "var(--ss-gray)" }}>Base</span>
            {hasBudget && <span style={valStyle}>{compensation.budget_range}</span>}
            <span style={valStyle}>
              {isEmpty(compensation.current_base) ? "—" : compensation.current_base}
            </span>
            <span style={valStyle}>
              {isEmpty(compensation.expected_base) ? "—" : compensation.expected_base}
            </span>
          </div>
        )}

        {/* Total package row — emphasized */}
        {hasTotal && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: "12px",
              padding: "8px 0",
              borderTop: hasBase ? "1.5px solid #e0ddd8" : undefined,
              borderBottom: "1px solid var(--ss-border-light)",
            }}
          >
            <span style={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }}>Total</span>
            {hasBudget && <span style={totalValStyle}>{compensation.budget_range}</span>}
            <span style={totalValStyle}>
              {isEmpty(compensation.current_total) ? "—" : compensation.current_total}
            </span>
            <span style={totalValStyle}>
              {isEmpty(compensation.expected_total) ? "—" : compensation.expected_total}
            </span>
          </div>
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
