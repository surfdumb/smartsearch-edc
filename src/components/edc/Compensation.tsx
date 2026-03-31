"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import { useEditorContext } from "@/contexts/EditorContext";
import { signalEdit } from "@/hooks/useAutoSave";

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
  candidateId?: string;
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", "Assessment pending", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

/* ── Editable cell for compensation values with reset ── */
function EditableCell({
  value,
  originalValue,
  isEditable,
  style,
  onUpdate,
}: {
  value: string;
  originalValue: string;
  isEditable: boolean;
  style: React.CSSProperties;
  onUpdate: (v: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const focusedRef = useRef(false);
  const isModified = value !== originalValue;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value]);

  if (!isEditable) {
    return <span style={style}>{value}</span>;
  }

  return (
    <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block" }}>
      <span
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (el && !el.textContent) el.textContent = value;
        }}
        contentEditable
        suppressContentEditableWarning
        className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => { onUpdate(e.currentTarget.textContent || ""); }}
        onBlur={(e) => {
          focusedRef.current = false;
          onUpdate(e.currentTarget.textContent || "");
        }}
        style={{
          ...style,
          padding: "2px 6px",
          margin: "-2px -6px",
          display: "block",
          outline: "none",
        }}
      />
      {isModified && !confirmingReset && (
        <button
          className="edc-field__reset-dot"
          onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }}
          title="Reset to original"
        />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={(e) => {
              e.preventDefault();
              onUpdate(originalValue);
              if (ref.current) { ref.current.textContent = originalValue; ref.current.blur(); }
              setConfirmingReset(false);
            }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(197,165,114,0.15)", border: "1px solid rgba(197,165,114,0.3)", color: "#8a7a60", cursor: "pointer" }}>
            Reset
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "transparent", border: "1px solid #d4d2ce", color: "#6b6b6b", cursor: "pointer" }}>
            Keep
          </button>
        </span>
      )}
    </span>
  );
}

function CompRow({
  label,
  current,
  expected,
  originalCurrent,
  originalExpected,
  budget,
  originalBudget,
  hasBudget,
  cols,
  labelStyle,
  valStyle,
  emphasized,
  isEditable,
  onUpdateCurrent,
  onUpdateExpected,
  onUpdateBudget,
}: {
  label: string;
  current?: string;
  expected?: string;
  originalCurrent?: string;
  originalExpected?: string;
  budget?: string;
  originalBudget?: string;
  hasBudget: boolean;
  cols: string;
  labelStyle: React.CSSProperties;
  valStyle: React.CSSProperties;
  emphasized?: boolean;
  isEditable: boolean;
  onUpdateCurrent?: (v: string) => void;
  onUpdateExpected?: (v: string) => void;
  onUpdateBudget?: (v: string) => void;
}) {
  // In edit mode, always show actual values — never replace with "—"
  // In read-only mode, use isEmpty to show "—" for placeholder values
  const hasCurrentVal = isEditable ? !!current?.trim() : !isEmpty(current);
  const hasExpectedVal = isEditable ? !!expected?.trim() : !isEmpty(expected);
  if (!hasCurrentVal && !hasExpectedVal && !isEditable) return null;

  const usedValStyle = emphasized
    ? { ...valStyle, fontSize: "1.08rem", fontWeight: 700 }
    : valStyle;
  const usedLabelStyle = emphasized
    ? { ...labelStyle, color: "var(--ss-dark)", fontWeight: 700 }
    : labelStyle;

  // In edit mode, show actual value (even if it matches an EMPTY string)
  const curVal = isEditable ? (current || "") : (hasCurrentVal ? current! : "—");
  const expVal = isEditable ? (expected || "") : (hasExpectedVal ? expected! : "—");

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
      {hasBudget && (
        <EditableCell
          value={budget || "—"}
          originalValue={originalBudget ?? budget ?? "—"}
          isEditable={isEditable}
          style={usedValStyle}
          onUpdate={onUpdateBudget || (() => {})}
        />
      )}
      <EditableCell
        value={curVal}
        originalValue={originalCurrent ?? curVal}
        isEditable={isEditable}
        style={usedValStyle}
        onUpdate={onUpdateCurrent || (() => {})}
      />
      <EditableCell
        value={expVal}
        originalValue={originalExpected ?? expVal}
        isEditable={isEditable}
        style={usedValStyle}
        onUpdate={onUpdateExpected || (() => {})}
      />
    </div>
  );
}

/* ── Inline editable for flexibility note with onInput + reset confirm ── */
function FlexibilityEditable({ value, originalValue, onUpdate }: { value: string; originalValue: string; onUpdate: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const isModified = value !== originalValue;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <div className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", marginTop: "10px" }}>
      <div
        ref={(el) => { (ref as React.MutableRefObject<HTMLDivElement | null>).current = el; if (el && !el.textContent) el.textContent = value; }}
        contentEditable suppressContentEditableWarning className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
        onBlur={(e) => { focusedRef.current = false; onUpdate(e.currentTarget.textContent || ""); }}
        style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--ss-gray)", lineHeight: 1.5, padding: "2px 6px", margin: "0 -6px" }}
      />
      {isModified && !confirmingReset && (
        <button className="edc-field__reset-dot" onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }} title="Reset to original" />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={(e) => { e.preventDefault(); onUpdate(originalValue); if (ref.current) ref.current.textContent = originalValue; setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(197,165,114,0.15)", border: "1px solid rgba(197,165,114,0.3)", color: "#8a7a60", cursor: "pointer" }}>Reset</button>
          <button onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "transparent", border: "1px solid #d4d2ce", color: "#6b6b6b", cursor: "pointer" }}>Keep</button>
        </span>
      )}
    </div>
  );
}

/* ── Inline editable for notice period with onInput + reset confirm ── */
function NoticeEditable({ value, originalValue, onUpdate }: { value: string; originalValue: string; onUpdate: (v: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const focusedRef = useRef(false);
  const isModified = value !== originalValue;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "inline-block" }}>
      <span
        ref={(el) => { (ref as React.MutableRefObject<HTMLSpanElement | null>).current = el; if (el && !el.textContent) el.textContent = value; }}
        contentEditable suppressContentEditableWarning className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
        onBlur={(e) => { focusedRef.current = false; onUpdate(e.currentTarget.textContent || ""); }}
        style={{ padding: "1px 4px", margin: "-1px -4px" }}
      />
      {isModified && !confirmingReset && (
        <button className="edc-field__reset-dot" onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }} title="Reset to original" />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={(e) => { e.preventDefault(); onUpdate(originalValue); if (ref.current) ref.current.textContent = originalValue; setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(197,165,114,0.15)", border: "1px solid rgba(197,165,114,0.3)", color: "#8a7a60", cursor: "pointer" }}>Reset</button>
          <button onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "transparent", border: "1px solid #d4d2ce", color: "#6b6b6b", cursor: "pointer" }}>Keep</button>
        </span>
      )}
    </span>
  );
}

export default function Compensation({ compensation, notice_period, candidateId }: CompensationProps) {
  const { isEditable } = useEditorContext();
  const storageKey = candidateId ? `edc_edit_${candidateId}_comp` : null;
  const [comp, setComp] = useState<CompensationData>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) { const p = JSON.parse(stored); return p.comp || compensation; }
      } catch { /* ignore */ }
    }
    return compensation;
  });
  const [notice, setNotice] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) { const p = JSON.parse(stored); return p.notice || notice_period; }
      } catch { /* ignore */ }
    }
    return notice_period;
  });
  const originalComp = useRef(compensation);
  const originalNotice = useRef(notice_period);

  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const p = JSON.parse(stored);
          if (p.comp) setComp(p.comp);
          else setComp(compensation);
          if (p.notice) setNotice(p.notice);
          else setNotice(notice_period);
          originalComp.current = compensation;
          originalNotice.current = notice_period;
          return;
        }
      } catch { /* ignore */ }
    }
    setComp(compensation);
    setNotice(notice_period);
    originalComp.current = compensation;
    originalNotice.current = notice_period;
  }, [compensation, notice_period, storageKey]);

  // Persist edits to localStorage
  useEffect(() => {
    if (storageKey && isEditable) {
      try { localStorage.setItem(storageKey, JSON.stringify({ comp, notice })); } catch { /* ignore */ }
      if (candidateId) signalEdit(candidateId);
    }
  }, [comp, notice, storageKey, isEditable, candidateId]);

  const update = (field: keyof CompensationData, value: string) => {
    setComp(prev => ({ ...prev, [field]: value }));
  };

  const hasBase = !isEmpty(comp.current_base) || !isEmpty(comp.expected_base);
  const hasBonus = !isEmpty(comp.current_bonus) || !isEmpty(comp.expected_bonus);
  const hasLTI = !isEmpty(comp.current_lti) || !isEmpty(comp.expected_lti);
  const hasBenefits = !isEmpty(comp.current_benefits) || !isEmpty(comp.expected_benefits);
  const hasTotal = !isEmpty(comp.current_total) || !isEmpty(comp.expected_total);
  const hasBudget = isEditable || !isEmpty(comp.budget_range) || !isEmpty(comp.budget_base) || !isEmpty(comp.budget_bonus) || !isEmpty(comp.budget_lti);

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
  const hasStructuredRows = isEditable || hasBase || hasBonus || hasLTI || hasBenefits;

  const hasCompEdits = JSON.stringify(comp) !== JSON.stringify(originalComp.current) || notice !== originalNotice.current;
  const resetCompSection = () => {
    setComp(originalComp.current);
    setNotice(originalNotice.current);
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Candidate Salary Details" lineInsetRight="130px" isEditable={isEditable} hasEdits={hasCompEdits} onResetSection={resetCompSection} />

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
              originalCurrent={originalComp.current.current_base} originalExpected={originalComp.current.expected_base}
              budget={comp.budget_base} originalBudget={originalComp.current.budget_base}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_base", v)}
              onUpdateExpected={(v) => update("expected_base", v)}
              onUpdateBudget={(v) => update("budget_base", v)} />
            <CompRow label="Bonus" current={comp.current_bonus} expected={comp.expected_bonus}
              originalCurrent={originalComp.current.current_bonus} originalExpected={originalComp.current.expected_bonus}
              budget={comp.budget_bonus} originalBudget={originalComp.current.budget_bonus}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_bonus", v)}
              onUpdateExpected={(v) => update("expected_bonus", v)}
              onUpdateBudget={(v) => update("budget_bonus", v)} />
            <CompRow label="LTI" current={comp.current_lti} expected={comp.expected_lti}
              originalCurrent={originalComp.current.current_lti} originalExpected={originalComp.current.expected_lti}
              budget={comp.budget_lti} originalBudget={originalComp.current.budget_lti}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_lti", v)}
              onUpdateExpected={(v) => update("expected_lti", v)}
              onUpdateBudget={(v) => update("budget_lti", v)} />
            <CompRow label="Benefits" current={comp.current_benefits} expected={comp.expected_benefits}
              originalCurrent={originalComp.current.current_benefits} originalExpected={originalComp.current.expected_benefits}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-gray)" }} valStyle={valStyle}
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_benefits", v)}
              onUpdateExpected={(v) => update("expected_benefits", v)} />
            {hasTotal && (
              <CompRow label="Total" current={comp.current_total} expected={comp.expected_total}
                originalCurrent={originalComp.current.current_total} originalExpected={originalComp.current.expected_total}
                budget={comp.budget_range} originalBudget={originalComp.current.budget_range}
                hasBudget={hasBudget} cols={cols}
                labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized
                isEditable={isEditable}
                onUpdateCurrent={(v) => update("current_total", v)}
                onUpdateExpected={(v) => update("expected_total", v)}
                onUpdateBudget={(v) => update("budget_range", v)} />
            )}
          </>
        ) : (
          hasTotal && (
            <CompRow label="Total" current={comp.current_total} expected={comp.expected_total}
              originalCurrent={originalComp.current.current_total} originalExpected={originalComp.current.expected_total}
              budget={comp.budget_range} originalBudget={originalComp.current.budget_range}
              hasBudget={hasBudget} cols={cols}
              labelStyle={{ ...colStyle, color: "var(--ss-dark)", fontWeight: 700 }} valStyle={valStyle} emphasized
              isEditable={isEditable}
              onUpdateCurrent={(v) => update("current_total", v)}
              onUpdateExpected={(v) => update("expected_total", v)}
              onUpdateBudget={(v) => update("budget_range", v)} />
          )
        )}
      </div>

      {/* Flexibility note */}
      {(!isEmpty(comp.flexibility) || isEditable) && (
        isEditable ? (
          <FlexibilityEditable
            value={comp.flexibility}
            originalValue={originalComp.current.flexibility}
            onUpdate={(v) => update("flexibility", v)}
          />
        ) : (
          !isEmpty(comp.flexibility) && (
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
        )
      )}

      {/* Notice period */}
      {(!isEmpty(notice) || isEditable) && (
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
            <NoticeEditable
              value={notice}
              originalValue={originalNotice.current}
              onUpdate={setNotice}
            />
          ) : (
            notice
          )}
        </div>
      )}
    </section>
  );
}
