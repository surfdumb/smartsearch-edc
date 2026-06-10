"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import AlignmentDot from "@/components/ui/AlignmentDot";
import { signalEdit, markDirty } from "@/hooks/useAutoSave";
import { useEditorContext } from "@/contexts/EditorContext";
import { isEditFresh, writeBaseHash, clearEditWithHash } from "@/lib/edit-hash";
import { stripArtifacts } from "@/lib/sanitize";

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

/* Normalised key for matching a candidate's snapshot dimension to a canonical
 * dimension name. Strips everything from the first em/en-dash or colon (handles
 * the "Revenue Target — Must consistently sell…" pollution where the role
 * requirement was glued onto the name), lowercases, drops non-alphanumerics. */
const canonKey = (s: string) =>
  (s || "").split(/[—–:]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");

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

  // Canonical-first mode: the search's dimensions own names/order/role-
  // requirements on every card. Gated per-search AND guarded against malformed
  // canonical (e.g. dims stored with a `scope` key instead of `name` → no usable
  // name → ignored; if none survive we fall back to legacy rather than render
  // nameless rows).
  const validDims = (searchDimensions ?? []).filter((d) => (d?.name ?? "").trim().length > 0);

  // Legacy exact-name role_requirement override. Only consulted in the
  // non-canonical render path (canonical-first reads role_requirement straight
  // from baseRows). Missing entries fall through to the candidate snapshot.
  // Built from validDims so an empty-name dim can never match a row.
  const dimByName = new Map<string, { name: string; role_requirement: string }>(
    validDims.map((d) => [d.name, d])
  );
  const canonical = scopeCanonicalFirst === true && validDims.length > 0;

  // Search-owned dimensions: when the search has any usable dims, the Role
  // Brief's Scope Dimensions editor is the only surface for dimension names,
  // role requirements, and row structure — cards render those read-only
  // (candidate_actual and alignment stay per-candidate editable). Decks with
  // no search dims (fixtures, pre-Engine searches) keep per-card editing,
  // because no Role Brief editor exists for them.
  const searchOwned = validDims.length > 0;
  const showRowControls = isEditable && !searchOwned;

  const baseRows = useMemo<ScopeRow[]>(() => {
    if (!canonical) return scope_match;
    const snap = new Map<string, ScopeRow>();
    for (const r of scope_match) {
      const k = canonKey(r.scope);
      if (k && !snap.has(k)) snap.set(k, r);
    }
    return validDims.map((d) => {
      const m = snap.get(canonKey(d.name));
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
                {/* Scope name — read-only whenever the search owns dimensions
                    (edited via Role Brief → Scope dimensions only) */}
                {isEditable && !searchOwned ? (
                  <EditableCell
                    value={item.scope}
                    originalValue={orig?.scope ?? item.scope}
                    onUpdate={(v) => updateCell(i, "scope", v)}
                    style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}
                  />
                ) : (
                  <span
                    style={{ fontWeight: 500, color: "var(--ss-dark)", fontSize: "0.9rem" }}
                    title={isEditable && searchOwned ? "Owned by the Role Brief" : undefined}
                  >
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

                {/* Role requirement. When the search owns dimensions the cell
                    is read-only with an "Edit in Role Brief" affordance —
                    role-level text is edited once in the Role Brief, never
                    per-card (where exact-name overrides made edits phantom
                    anyway). Editable only on decks with no search dims. */}
                {(() => {
                  const override = !canonical ? dimByName.get(item.scope)?.role_requirement : undefined;
                  const gated = searchOwned;
                  const effective = canonical
                    ? (item.role_requirement ?? "")
                    : (override ?? item.role_requirement ?? "");
                  if (isEditable && !gated) {
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
                    <span
                      style={{ display: "block" }}
                      title={isEditable && gated ? "Owned by the Role Brief" : undefined}
                    >
                      <span className="text-body text-ss-gray" style={{ fontSize: "0.9rem" }}>
                        {effective}
                      </span>
                      {isEditable && gated && hoveredRow === i && (
                        <a
                          href="#brief"
                          style={{
                            display: "block",
                            marginTop: "2px",
                            fontSize: "0.68rem",
                            color: "var(--ss-gold-deep)",
                            textDecoration: "none",
                            letterSpacing: "0.2px",
                          }}
                        >
                          Edit in Role Brief → Scope dimensions
                        </a>
                      )}
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
                    button only when the search has no dims (search-owned rows
                    are added/removed via Role Brief → Scope dimensions). */}
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

          {/* Ghost add-row — only when the search has no dims (search-owned
              dims are added via Role Brief → Scope dimensions) */}
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
