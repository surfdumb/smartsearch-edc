"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";
import { useEditorContext } from "@/contexts/EditorContext";

interface ScopeRow {
  scope: string;
  candidate_actual: string;
  role_requirement: string;
  alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
}

interface ScopeMatchProps {
  scope_match: ScopeRow[];
  scope_seasoning?: string;
}

const ALIGNMENT_CYCLE: ScopeRow['alignment'][] = ['strong', 'partial', 'gap', 'not_assessed'];

/* ── Per-cell editable span with reset ── */
function EditableCell({
  value,
  originalValue,
  onUpdate,
  className = "",
  style,
}: {
  value: string;
  originalValue: string;
  onUpdate: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isModified = value !== originalValue;

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    onUpdate(originalValue);
    if (ref.current) {
      ref.current.textContent = originalValue;
      ref.current.blur();
    }
  };

  return (
    <span className="editable-wrap" style={{ position: "relative", display: "block" }}>
      <span
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`editable-cell ${className}`}
        onBlur={(e) => onUpdate(e.currentTarget.textContent || "")}
        style={{
          display: "block",
          padding: "1px 6px",
          margin: "-1px -6px",
          ...style,
        }}
      >
        {value}
      </span>
      {isModified && (
        <button className="editable-reset" onMouseDown={handleReset} title="Reset to original">
          ↺
        </button>
      )}
    </span>
  );
}

export default function ScopeMatch({ scope_match }: ScopeMatchProps) {
  const { isEditable } = useEditorContext();
  const [rows, setRows] = useState<ScopeRow[]>(scope_match);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const originalRows = useRef<ScopeRow[]>(scope_match);

  // Sync rows when prop changes (e.g. candidate navigation)
  useEffect(() => {
    setRows(scope_match);
    originalRows.current = scope_match;
  }, [scope_match]);

  const updateCell = (index: number, field: keyof ScopeRow, value: string) => {
    setRows(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const cycleAlignment = (index: number) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const currentIdx = ALIGNMENT_CYCLE.indexOf(row.alignment);
      const nextIdx = (currentIdx + 1) % ALIGNMENT_CYCLE.length;
      return { ...row, alignment: ALIGNMENT_CYCLE[nextIdx] };
    }));
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows(prev => [...prev, {
      scope: "New dimension",
      candidate_actual: "",
      role_requirement: "",
      alignment: "not_assessed",
    }]);
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Scope Match" />

      {/* Horizontally scrollable wrapper for mobile */}
      <div className="scope-match-scroll">
        <div className="scope-match-inner">

          {/* Table header */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: isEditable ? "140px 1fr 1fr 36px 24px" : "140px 1fr 1fr 36px",
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
            {isEditable && <span />}
          </div>

          {/* Table rows */}
          {rows.map((item, i) => {
            const orig = originalRows.current[i];
            return (
              <div
                key={i}
                className="grid gap-3 items-start"
                style={{
                  gridTemplateColumns: isEditable ? "140px 1fr 1fr 36px 24px" : "140px 1fr 1fr 36px",
                  padding: "6px 0",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid var(--ss-border-light)" : "none",
                  position: "relative",
                }}
                onMouseEnter={() => isEditable && setHoveredRow(i)}
                onMouseLeave={() => isEditable && setHoveredRow(null)}
              >
                {/* Scope name */}
                {isEditable ? (
                  <EditableCell
                    value={item.scope}
                    originalValue={orig?.scope ?? item.scope}
                    onUpdate={(v) => updateCell(i, "scope", v)}
                    style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}>
                    {item.scope}
                  </span>
                )}

                {/* Candidate actual */}
                {isEditable ? (
                  <EditableCell
                    value={item.candidate_actual}
                    originalValue={orig?.candidate_actual ?? item.candidate_actual}
                    onUpdate={(v) => updateCell(i, "candidate_actual", v)}
                    style={{ fontSize: "0.9rem", color: "var(--ss-dark)" }}
                  />
                ) : (
                  <span style={{ fontSize: "0.9rem", color: "var(--ss-dark)" }}>
                    {item.candidate_actual}
                  </span>
                )}

                {/* Role requirement */}
                {isEditable ? (
                  <EditableCell
                    value={item.role_requirement}
                    originalValue={orig?.role_requirement ?? item.role_requirement}
                    onUpdate={(v) => updateCell(i, "role_requirement", v)}
                    style={{ fontSize: "0.9rem", color: "var(--ss-gray)" }}
                  />
                ) : (
                  <span className="text-body text-ss-gray" style={{ fontSize: "0.9rem" }}>
                    {item.role_requirement}
                  </span>
                )}

                {/* Alignment dot — clickable in edit mode */}
                <span className="flex items-center justify-center pt-0.5">
                  {isEditable ? (
                    <button
                      onClick={() => cycleAlignment(i)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "50%",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)"; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                      title="Click to cycle alignment"
                    >
                      <AlignmentDot alignment={item.alignment} clientView={false} />
                    </button>
                  ) : (
                    <AlignmentDot alignment={item.alignment} />
                  )}
                </span>

                {/* Remove row button — visible on hover in edit mode */}
                {isEditable && (
                  <span className="flex items-center justify-center">
                    <button
                      onClick={() => removeRow(i)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        color: hoveredRow === i ? "var(--ss-red)" : "transparent",
                        transition: "color 0.15s",
                        padding: "2px 4px",
                        lineHeight: 1,
                      }}
                      title="Remove row"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            );
          })}

          {/* Ghost add-row — edit mode only */}
          {isEditable && (
            <button
              onClick={addRow}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 0",
                background: "none",
                border: "none",
                borderTop: "1px dashed var(--ss-border)",
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "var(--ss-gray-light)",
                textAlign: "left",
                transition: "color 0.15s",
                marginTop: "2px",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
            >
              + Add dimension
            </button>
          )}

        </div>
      </div>
    </section>
  );
}
