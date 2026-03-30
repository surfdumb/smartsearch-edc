"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import { useEditorContext } from "@/contexts/EditorContext";

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
  budget_base?: string;
  budget_bonus?: string;
  budget_lti?: string;
}

interface CompensationProps {
  compensation: CompensationData;
  notice_period: string;
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", "Assessment pending", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

/* ── Editable cell for compensation values ── */
function EditableCell({
  value,
  isEditable,
  style,
  onUpdate,
}: {
  value: string;
  isEditable: boolean;
  style: React.CSSProperties;
  onUpdate: (v: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  if (!isEditable) {
    return <span style={style}>{value}</span>;
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="editable-cell"
      onBlur={(e) => onUpdate(e.currentTarget.textContent || "")}
      style={{
        ...style,
        padding: "2px 6px",
        margin: "-2px -6px",
        display: "block",
        outline: "none",
      }}
    >
      {value}
    </span>
  );
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
  isEditable,
  onUpdateCurrent,
  onUpdateExpected,
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
  isEditable: boolean;
  onUpdateCurrent?: (v: string) => void;
  onUpdateExpected?: (v: string) => void;
}) {
  const hasCurrentVal = !isEmpty(current);
  const hasExpectedVal = !isEmpty(expected);
  if (!hasCurrentVal && !hasExpectedVal && !isEditable) return null;

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
      <EditableCell
        value={hasCurrentVal ? current! : "—"}
        isEditable={isEditable}
        style={usedValStyle}
        onUpdate={onUpdateCurrent || (() => {})}
      />
      <EditableCell
        value={hasExpectedVal ? expected! : "—"}
        isEditable={isEditable}
        style={usedValStyle}
        onUpdate={onUpdateExpected || (() => {})}
      />
    </div>
  );
}

export default function Compensation({ compensation, notice_period }: CompensationProps) {
  const { isEditable } = useEditorContext();
  const [comp, setComp] = useState(compensation);
  const [notice, setNotice] = useState(notice_period);

  useEffect(() => {
    setComp(compensation);
    setNotice(notice_period);
  }, [compensation, notice_period]);

  const update = (field: keyof CompensationData, value: string) => {
    setComp(prev => ({ ...prev, [field]: value }));
  };

  const hasBase = !isEmpty(comp.current_base) || !isEmpty(comp.expected_base);
  const hasBonus = !isEmpty(comp.current_bonus) || !isEmpty(comp.expected_bonus);
  const hasLTI = !isEmpty(comp.current_lti) || !isEmpty(comp.expected_lti);
  const hasBenefits = !isEmpty(comp.current_benefits) || !isEmpty(comp.expected_benefits);
  const hasTotal = !isEmpty(comp.current_total) || !isEmpty(comp.expected_total);
  const hasBudget = !isEmpty(comp.budget_range) || !isEmpty(comp.budget_base) || !isEmpty(comp.budget_bonus) || !isEmpty(comp.budget_lti);

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
            <CompRow label="Base" current={comp.current_base} expected={comp.expected_base}
              budget={comp.budget_base} hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_base", v)}
              onUpdateExpected={(v) => update("expected_base", v)} />
            <CompRow label="Bonus" current={comp.current_bonus} expected={comp.expected_bonus}
              budget={comp.budget_bonus} hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_bonus", v)}
              onUpdateExpected={(v) => update("expected_bonus", v)} />
            <CompRow label="LTI" current={comp.current_lti} expected={comp.expected_lti}
              budget={comp.budget_lti} hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_lti", v)}
              onUpdateExpected={(v) => update("expected_lti", v)} />
            <CompRow label="Benefits" current={comp.current_benefits} expected={comp.expected_benefits}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_benefits", v)}
              onUpdateExpected={(v) => update("expected_benefits", v)} />
            {hasTotal && (
              <CompRow label="Total" current={comp.current_total} expected={comp.expected_total}
                budget={comp.budget_range} hasBudget={hasBudget} cols={cols}
                labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized
                isEditable={isEditable}
                onUpdateCurrent={(v) => update("current_total", v)}
                onUpdateExpected={(v) => update("expected_total", v)} />
            )}
          </>
        ) : (
          hasTotal && (
            <CompRow label="Total" current={comp.current_total} expected={comp.expected_total}
              budget={comp.budget_range} hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_total", v)}
              onUpdateExpected={(v) => update("expected_total", v)} />
          )
        )}
      </div>

      {/* Flexibility note */}
      {!isEmpty(comp.flexibility) && (
        isEditable ? (
          <div
            contentEditable
            suppressContentEditableWarning
            className="editable-cell"
            onBlur={(e) => update("flexibility", e.currentTarget.textContent || "")}
            style={{
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "var(--ss-gray)",
              marginTop: "10px",
              lineHeight: 1.5,
              padding: "2px 6px",
              margin: "10px -6px 0",
            }}
          >
            {comp.flexibility}
          </div>
        ) : (
          <p
            style={{
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "var(--ss-gray)",
              marginTop: "10px",
              lineHeight: 1.5,
            }}
          >
            {comp.flexibility}
          </p>
        )
      )}

      {/* Notice period */}
      {!isEmpty(notice) && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#8a8a8a",
            marginTop: "6px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          Notice:{" "}
          {isEditable ? (
            <span
              contentEditable
              suppressContentEditableWarning
              className="editable-cell"
              onBlur={(e) => setNotice(e.currentTarget.textContent || "")}
              style={{ padding: "1px 4px", margin: "-1px -4px" }}
            >
              {notice}
            </span>
          ) : (
            notice
          )}
        </div>
      )}
    </section>
  );
}
