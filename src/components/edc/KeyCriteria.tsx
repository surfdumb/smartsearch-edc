"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import ContextAnchorPill from "@/components/ui/ContextAnchorPill";
import { signalEdit } from "@/hooks/useAutoSave";
import { useEditorContext } from "@/contexts/EditorContext";
import { isEditFresh, writeBaseHash, clearEditWithHash } from "@/lib/edit-hash";

interface CriterionItem {
  name: string;
  evidence: string;
  context_anchor?: string;
}

interface KeyCriteriaProps {
  key_criteria: CriterionItem[];
  candidateId?: string;
}

/* ── Editable pill with remove button ── */
function EditablePill({
  text,
  originalText,
  onUpdate,
  onRemove,
}: {
  text: string;
  originalText: string;
  onUpdate: (v: string) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const focusedRef = useRef(false);
  const isModified = text !== originalText;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.textContent !== text) {
      ref.current.textContent = text;
    }
  }, [text]);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        ref={(el) => { (ref as React.MutableRefObject<HTMLSpanElement | null>).current = el; if (el && !el.textContent) el.textContent = text; }}
        contentEditable
        suppressContentEditableWarning
        className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
        onBlur={(e) => { focusedRef.current = false; onUpdate(e.currentTarget.textContent || ""); }}
        style={{
          display: "inline-block",
          fontSize: "0.72rem",
          fontWeight: 600,
          padding: "4px 22px 4px 11px",
          borderRadius: "12px",
          background: "rgba(74, 106, 140, 0.10)",
          color: "#4a6a8c",
          whiteSpace: "normal",
          outline: "none",
        }}
      />
      {/* Remove pill × */}
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          right: "5px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          fontSize: "0.7rem",
          color: "rgba(74, 106, 140, 0.4)",
          cursor: "pointer",
          padding: "0 2px",
          lineHeight: 1,
          transition: "color 0.15s",
        }}
        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(74, 106, 140, 0.4)"; }}
        title="Remove pill"
      >
        ×
      </button>
      {/* Reset dot */}
      {isModified && !confirmingReset && (
        <button
          onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }}
          className="edc-field__reset-dot"
          style={{ top: "-4px", right: "-4px" }}
          title="Reset to original"
        />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={(e) => { e.preventDefault(); onUpdate(originalText); if (ref.current) ref.current.textContent = originalText; setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(197,165,114,0.15)", border: "1px solid rgba(197,165,114,0.3)", color: "#8a7a60", cursor: "pointer" }}>Reset</button>
          <button onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "transparent", border: "1px solid #d4d2ce", color: "#6b6b6b", cursor: "pointer" }}>Keep</button>
        </span>
      )}
    </span>
  );
}

/* ── Criterion name editable with onInput + reset confirm ── */
function CriterionNameEditable({ value, originalValue, onUpdate }: { value: string; originalValue: string; onUpdate: (v: string) => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const focusedRef = useRef(false);
  const isModified = value !== originalValue;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block" }}>
      <h4
        ref={(el) => { (ref as React.MutableRefObject<HTMLHeadingElement | null>).current = el; if (el && !el.textContent) el.textContent = value; }}
        contentEditable suppressContentEditableWarning className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
        onBlur={(e) => { focusedRef.current = false; onUpdate(e.currentTarget.textContent || ""); }}
        style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--ss-dark)", marginBottom: "3px", padding: "1px 6px", margin: "-1px -6px 3px" }}
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

/* ── Criterion evidence editable with onInput + reset confirm (HTML content) ── */
function CriterionEvidenceEditable({ value, originalValue, onUpdate }: { value: string; originalValue: string; onUpdate: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const isModified = value !== originalValue;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (ref.current && !focusedRef.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  return (
    <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block", flex: 1, minWidth: 0 }}>
      <div
        ref={(el) => { (ref as React.MutableRefObject<HTMLDivElement | null>).current = el; if (el && !el.innerHTML) el.innerHTML = value; }}
        contentEditable suppressContentEditableWarning className="editable-cell"
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => onUpdate(e.currentTarget.innerHTML)}
        onBlur={(e) => { focusedRef.current = false; onUpdate(e.currentTarget.innerHTML); }}
        style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "var(--ss-gray)", padding: "1px 6px", margin: "-1px -6px" }}
      />
      {isModified && !confirmingReset && (
        <button className="edc-field__reset-dot" onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }} title="Reset to original" />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={(e) => { e.preventDefault(); onUpdate(originalValue); if (ref.current) ref.current.innerHTML = originalValue; setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(197,165,114,0.15)", border: "1px solid rgba(197,165,114,0.3)", color: "#8a7a60", cursor: "pointer" }}>Reset</button>
          <button onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(false); }}
            style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "transparent", border: "1px solid #d4d2ce", color: "#6b6b6b", cursor: "pointer" }}>Keep</button>
        </span>
      )}
    </span>
  );
}

export default function KeyCriteria({ key_criteria, candidateId }: KeyCriteriaProps) {
  const { isEditable } = useEditorContext();
  const storageKey = candidateId ? `edc_edit_${candidateId}_criteria` : null;

  // Engine-generated criteria have non-empty evidence — prefer the prop over
  // stale localStorage which may contain old fallback/EDS data.
  const propHasEvidence = key_criteria.length > 0 && !!key_criteria[0]?.evidence;

  // Check if stored criteria names match prop criteria names.
  // If names match, localStorage holds consultant edits on Engine data — preserve them.
  // If names don't match, it's stale fallback data — clear it.
  function storedCriteriaMatchProps(stored: CriterionItem[]): boolean {
    if (stored.length === 0 || key_criteria.length === 0) return false;
    const storedNames = stored.map(c => c.name).sort();
    const propNames = key_criteria.map(c => c.name).sort();
    if (storedNames.length !== propNames.length) return false;
    return storedNames.every((n, i) => n === propNames[i]);
  }

  function readStoredCriteria(): CriterionItem[] | null {
    if (!storageKey || typeof window === 'undefined') return null;
    // Hash-based freshness check — clears stale data automatically
    if (!isEditFresh(storageKey, key_criteria)) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CriterionItem[];
      if (storedCriteriaMatchProps(parsed)) return parsed;
      // Stale — names don't match, clear it
      clearEditWithHash(storageKey);
    } catch { /* ignore */ }
    return null;
  }

  const [items, setItems] = useState<CriterionItem[]>(() => {
    const stored = readStoredCriteria();
    if (stored) return stored;
    return key_criteria;
  });
  const originalItems = useRef<CriterionItem[]>(key_criteria);

  useEffect(() => {
    const stored = readStoredCriteria();
    if (stored) {
      setItems(stored);
      originalItems.current = key_criteria;
      return;
    }
    setItems(key_criteria);
    originalItems.current = key_criteria;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key_criteria, storageKey, propHasEvidence]);

  // Persist edits to localStorage
  useEffect(() => {
    if (storageKey && isEditable) {
      try { localStorage.setItem(storageKey, JSON.stringify(items)); writeBaseHash(storageKey, key_criteria); } catch { /* ignore */ }
      if (candidateId) signalEdit(candidateId);
    }
  }, [items, storageKey, isEditable, candidateId]);

  const updateField = (index: number, field: keyof CriterionItem, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removePill = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, context_anchor: undefined } : item
    ));
  };

  const addPill = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, context_anchor: "at Company" } : item
    ));
  };

  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setItems(prev => [...prev, {
      name: "New criterion",
      evidence: "",
      context_anchor: undefined,
    }]);
  };

  const hasEdits = JSON.stringify(items) !== JSON.stringify(originalItems.current);
  const resetSection = () => {
    setItems(originalItems.current);
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Key Criteria" lineInsetRight="130px" isEditable={isEditable} hasEdits={hasEdits} onResetSection={resetSection} />

      <div className="flex flex-col gap-0">
        {items.map((item, i) => {
          const orig = originalItems.current[i];

          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: isEditable ? "24px 1fr 20px" : "24px 1fr",
                gap: "10px",
                alignItems: "flex-start",
                padding: "7px 0",
                borderBottom:
                  i < items.length - 1
                    ? "1px solid var(--ss-border-light)"
                    : "none",
              }}
            >
              {/* Green number badge */}
              <span
                className="inline-flex items-center justify-center shrink-0 font-bold"
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "0.68rem",
                  borderRadius: "50%",
                  background: "var(--ss-green-badge)",
                  color: "var(--ss-green)",
                  marginTop: "2px",
                }}
              >
                {i + 1}
              </span>

              {/* Content */}
              <div>
                {/* Criterion name */}
                {isEditable ? (
                  <CriterionNameEditable
                    value={item.name}
                    originalValue={orig?.name ?? item.name}
                    onUpdate={(v) => updateField(i, "name", v)}
                  />
                ) : (
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "var(--ss-dark)",
                      marginBottom: "3px",
                    }}
                  >
                    {item.name}
                  </h4>
                )}

                {/* Evidence + pill row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  {isEditable ? (
                    <CriterionEvidenceEditable
                      value={item.evidence}
                      originalValue={orig?.evidence ?? item.evidence}
                      onUpdate={(v) => updateField(i, "evidence", v)}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        color: "var(--ss-gray)",
                        flex: 1,
                        minWidth: 0,
                      }}
                      dangerouslySetInnerHTML={{ __html: item.evidence }}
                    />
                  )}

                  {/* Context anchor pill */}
                  <div style={{ flexShrink: 1, minWidth: 0, maxWidth: "100%", marginTop: "1px" }}>
                    {isEditable ? (
                      item.context_anchor ? (
                        <EditablePill
                          text={item.context_anchor}
                          originalText={orig?.context_anchor ?? item.context_anchor}
                          onUpdate={(v) => updateField(i, "context_anchor", v)}
                          onRemove={() => removePill(i)}
                        />
                      ) : (
                        <button
                          onClick={() => addPill(i)}
                          style={{
                            background: "none",
                            border: "1px dashed rgba(74, 106, 140, 0.25)",
                            borderRadius: "12px",
                            padding: "3px 10px",
                            fontSize: "0.65rem",
                            color: "rgba(74, 106, 140, 0.5)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 106, 140, 0.5)";
                            (e.currentTarget as HTMLButtonElement).style.color = "#4a6a8c";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 106, 140, 0.25)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(74, 106, 140, 0.5)";
                          }}
                          title="Add context anchor"
                        >
                          + pill
                        </button>
                      )
                    ) : (
                      item.context_anchor && <ContextAnchorPill text={item.context_anchor} />
                    )}
                  </div>
                </div>
              </div>

              {/* Row remove — edit mode */}
              {isEditable && (
                <button
                  onClick={() => removeRow(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "transparent",
                    transition: "color 0.15s",
                    padding: "2px",
                    lineHeight: 1,
                    marginTop: "4px",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "transparent"; }}
                  title="Remove criterion"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Ghost add-row */}
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
            + Add criterion
          </button>
        )}
      </div>
    </section>
  );
}
