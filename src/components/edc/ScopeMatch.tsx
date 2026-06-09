"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";
import { signalEdit, markDirty } from "@/hooks/useAutoSave";
import { useEditorContext } from "@/contexts/EditorContext";
import { isEditFresh, writeBaseHash, clearEditWithHash } from "@/lib/edit-hash";
import { stripArtifacts } from "@/lib/sanitize";
import { canonScopeKey } from "@/lib/scope";

interface ScopeRow {
  scope: string;
  candidate_actual: string;
  role_requirement: string;
  alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
}

interface ScopeMatchProps {
  scope_match: ScopeRow[];
  scope_seasoning?: string;
  candidateId?: string;
  /** Canonical per-search scope dimensions from searches.scope_match_dimensions.
   *  When present, role_requirement is looked up here by scope name — so editing
   *  the role requirement in Role Brief updates all candidate cards at once.
   *  Falls back to candidate snapshot when absent (fixture decks, older searches). */
  searchDimensions?: { name: string; role_requirement: string }[];
  /** When true (deck_settings.scope_canonical_first), render canonical-first:
   *  searchDimensions drive the dimension names/order/role-requirements on every
   *  card and each candidate's own actual + alignment carry across by a
   *  normalised name match. Default off → the legacy per-candidate snapshot
   *  render (with exact-name role_requirement override) is unchanged. */
  scopeCanonicalFirst?: boolean;
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

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    onUpdate(originalValue);
    if (ref.current) {
      ref.current.textContent = originalValue;
      ref.current.blur();
    }
    setConfirmingReset(false);
  };

  return (
    <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block" }}>
      <span
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (el && !el.textContent) el.textContent = value;
        }}
        contentEditable
        suppressContentEditableWarning
        className={`editable-cell ${className}`}
        onFocus={() => { focusedRef.current = true; }}
        onInput={(e) => { onUpdate(e.currentTarget.textContent || ""); }}
        onBlur={(e) => {
          focusedRef.current = false;
          const clean = stripArtifacts(e.currentTarget.textContent || "");
          if (clean !== e.currentTarget.textContent) {
            e.currentTarget.textContent = clean;
          }
          onUpdate(clean);
        }}
        style={{
          display: "block",
          padding: "1px 6px",
          margin: "-1px -6px",
          ...style,
        }}
      />
      {isModified && !confirmingReset && (
        <button className="edc-field__reset-dot" onMouseDown={(e) => { e.preventDefault(); setConfirmingReset(true); }} title="Reset to original" />
      )}
      {confirmingReset && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", display: "flex", gap: "2px", zIndex: 10 }}>
          <button onMouseDown={handleReset}
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

export default function ScopeMatch({ scope_match, candidateId, searchDimensions, scopeCanonicalFirst }: ScopeMatchProps) {
  const { isEditable } = useEditorContext();

  // Search dimensions usable for lookup — guard the malformed `don-*` case where
  // dims were stored with a `scope` key instead of `name` (no usable name).
  const lookupDims = (searchDimensions ?? []).filter((d) => (d?.name ?? "").trim().length > 0);

  // Legacy role_requirement / label override. Only consulted in the non-canonical
  // render path (canonical-first reads name + role_requirement straight from
  // baseRows). `dimByName` is the exact-name lookup; `dimByCanonKey` is the
  // normalised lookup that survives the "Name — role_requirement" pollution in a
  // candidate's stored scope value. Missing entries fall through to the snapshot.
  const dimByName = new Map<string, { name: string; role_requirement: string }>(
    lookupDims.map((d) => [d.name, d])
  );
  const dimByCanonKey = new Map<string, { name: string; role_requirement: string }>(
    lookupDims.map((d) => [canonScopeKey(d.name), d])
  );

  // Canonical-first mode: the search's dimensions own names/order/role-
  // requirements on every card. Gated per-search AND guarded against malformed
  // canonical (e.g. dims stored with a `scope` key instead of `name` → no usable
  // name → ignored; if none survive we fall back to legacy rather than render
  // nameless rows).
  const validDims = (searchDimensions ?? []).filter((d) => (d?.name ?? "").trim().length > 0);
  const canonical = scopeCanonicalFirst === true && validDims.length > 0;
  const showRowControls = isEditable && !canonical;

  const baseRows = useMemo<ScopeRow[]>(() => {
    if (!canonical) return scope_match;
    const snap = new Map<string, ScopeRow>();
    for (const r of scope_match) {
      const k = canonScopeKey(r.scope);
      if (k && !snap.has(k)) snap.set(k, r);
    }
    return validDims.map((d) => {
      const m = snap.get(canonScopeKey(d.name));
      return {
        scope: d.name,
        role_requirement: d.role_requirement ?? "",
        candidate_actual: m?.candidate_actual ?? "",
        alignment: m?.alignment ?? "not_assessed",
      } as ScopeRow;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope_match, searchDimensions, canonical]);

  const storageKey = candidateId ? `edc_edit_${candidateId}_scope` : null;
  const [rows, setRows] = useState<ScopeRow[]>(() => {
    if (storageKey && typeof window !== 'undefined' && isEditFresh(storageKey, baseRows)) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return baseRows;
  });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const originalRows = useRef<ScopeRow[]>(baseRows);

  // Sync rows when the base changes (new candidate, or canonical dims update).
  // Keying the freshness hash off baseRows (not the raw snapshot) means a stale
  // localStorage edit saved against the old shape auto-clears when the deck
  // flips to canonical-first.
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined' && isEditFresh(storageKey, baseRows)) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) { setRows(JSON.parse(stored)); originalRows.current = baseRows; return; }
      } catch { /* ignore */ }
    }
    setRows(baseRows);
    originalRows.current = baseRows;
  }, [baseRows, storageKey]);

  // Persist edits to localStorage
  useEffect(() => {
    if (storageKey && isEditable) {
      try { localStorage.setItem(storageKey, JSON.stringify(rows)); writeBaseHash(storageKey, baseRows); } catch { /* ignore */ }
      if (candidateId) signalEdit(candidateId);
    }
  }, [rows, storageKey, isEditable, candidateId, baseRows]);

  const updateCell = (index: number, field: keyof ScopeRow, value: string) => {
    if (candidateId) markDirty(candidateId);
    setRows(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const cycleAlignment = (index: number) => {
    if (candidateId) markDirty(candidateId);
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const currentIdx = ALIGNMENT_CYCLE.indexOf(row.alignment);
      const nextIdx = (currentIdx + 1) % ALIGNMENT_CYCLE.length;
      return { ...row, alignment: ALIGNMENT_CYCLE[nextIdx] };
    }));
  };

  const removeRow = (index: number) => {
    if (candidateId) markDirty(candidateId);
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    if (candidateId) markDirty(candidateId);
    setRows(prev => [...prev, {
      scope: "New dimension",
      candidate_actual: "",
      role_requirement: "",
      alignment: "not_assessed",
    }]);
  };

  const hasEdits = JSON.stringify(rows) !== JSON.stringify(originalRows.current);
  const resetSection = () => {
    setRows(originalRows.current);
    if (storageKey) { try { clearEditWithHash(storageKey); } catch { /* ignore */ } }
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Scope Match" lineInsetRight="130px" isEditable={isEditable} hasEdits={hasEdits} onResetSection={resetSection} />

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
            // Legacy path: match this row to a search dimension by exact name, then
            // by normalised key (survives the "Name — role_requirement" pollution).
            // When matched, the search owns the label + role_requirement (read-only).
            const matchedDim = canonical
              ? undefined
              : dimByName.get(item.scope) ?? dimByCanonKey.get(canonScopeKey(item.scope));
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
                {/* Scope name — read-only when search-owned (canonical mode, or a
                    legacy row that matches a search dimension → show the clean
                    canonical name, never the polluted snapshot value). */}
                {isEditable && !canonical && !matchedDim ? (
                  <EditableCell
                    value={item.scope}
                    originalValue={orig?.scope ?? item.scope}
                    onUpdate={(v) => updateCell(i, "scope", v)}
                    style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}>
                    {matchedDim?.name ?? item.scope}
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

                {/* Role requirement. Search-owned when canonical-first OR a legacy
                    row matches a search dimension → render the search's verbatim
                    requirement, read-only (never the AI-generated snapshot value,
                    which can leak the candidate's employer). Unmatched legacy rows
                    fall back to the editable snapshot value. */}
                {(() => {
                  if (canonical) {
                    return (
                      <span className="text-body text-ss-gray" style={{ fontSize: "0.9rem" }}>
                        {item.role_requirement ?? ""}
                      </span>
                    );
                  }
                  if (matchedDim) {
                    return (
                      <span className="text-body text-ss-gray" style={{ fontSize: "0.9rem" }}>
                        {matchedDim.role_requirement ?? ""}
                      </span>
                    );
                  }
                  const effective = item.role_requirement ?? "";
                  if (isEditable) {
                    return (
                      <EditableCell
                        value={effective}
                        originalValue={orig?.role_requirement ?? effective}
                        onUpdate={(v) => updateCell(i, "role_requirement", v)}
                        style={{ fontSize: "0.9rem", color: "var(--ss-gray)" }}
                      />
                    );
                  }
                  return (
                    <span className="text-body text-ss-gray" style={{ fontSize: "0.9rem" }}>
                      {effective}
                    </span>
                  );
                })()}

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

                {/* Remove row — cell reserved in edit mode for grid alignment;
                    button only in legacy mode (canonical rows are search-owned). */}
                {isEditable && (
                  <span className="flex items-center justify-center">
                    {showRowControls && (
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
                    )}
                  </span>
                )}
              </div>
            );
          })}

          {/* Ghost add-row — legacy edit mode only (canonical dims are search-owned) */}
          {showRowControls && (
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
