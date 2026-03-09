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

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Compensation" />

      {/* 3-column table: Label | Current | Expectation */}
      <div style={{ width: "100%" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 1fr",
            gap: "12px",
            paddingBottom: "6px",
            borderBottom: "1px solid #eeebe6",
          }}
        >
          <span />
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--ss-gray-light)",
            }}
          >
            Current Compensation
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--ss-gray-light)",
            }}
          >
            Expectations
          </span>
        </div>

        {/* Base row */}
        {hasBase && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 1fr",
              gap: "12px",
              padding: "8px 0",
              borderBottom: "1px solid var(--ss-border-light)",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ss-gray)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Base
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--ss-dark)" }}>
              {isEmpty(compensation.current_base) ? "—" : compensation.current_base}
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--ss-dark)" }}>
              {isEmpty(compensation.expected_base) ? "—" : compensation.expected_base}
            </span>
          </div>
        )}

        {/* Total row — bold, top border emphasis */}
        {hasTotal && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 1fr",
              gap: "12px",
              padding: "8px 0",
              borderTop: hasBase ? "1.5px solid #e0ddd8" : undefined,
              borderBottom: "1px solid var(--ss-border-light)",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--ss-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Total
            </span>
            <span
              className="font-cormorant"
              style={{ fontSize: "18px", fontWeight: 600, color: "var(--ss-dark)" }}
            >
              {isEmpty(compensation.current_total) ? "—" : compensation.current_total}
            </span>
            <span
              className="font-cormorant"
              style={{ fontSize: "18px", fontWeight: 600, color: "var(--ss-dark)" }}
            >
              {isEmpty(compensation.expected_total) ? "—" : compensation.expected_total}
            </span>
          </div>
        )}

        {/* Budget row */}
        {hasBudget && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "12px",
              padding: "8px 0",
              borderBottom: "1px solid var(--ss-border-light)",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ss-gold-deep)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Budget
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--ss-gold-deep)" }}>
              {compensation.budget_range}
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
            fontSize: "0.82rem",
            color: "var(--ss-gray-light)",
            marginTop: "6px",
          }}
        >
          Notice: {notice_period}
        </div>
      )}
    </section>
  );
}
