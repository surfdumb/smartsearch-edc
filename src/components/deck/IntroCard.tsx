"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IntroCardData } from "@/lib/types";

interface IntroCardProps {
  card: IntroCardData;
  onClick: () => void;
  editMode?: boolean;
}

// ── Per-candidate edit overrides stored in localStorage ──────────────────────
type CardEdits = {
  candidate_name?: string;
  current_title?: string;
  current_company?: string;
  location?: string;
  flash_summary?: string;
  key_strengths?: string[];
  notice_period?: string;
  compensation_alignment?: "green" | "amber" | "not_set";
};

const COMP_CYCLE: Array<"green" | "amber" | "not_set"> = ["green", "amber", "not_set"];
const COMP_LABEL: Record<string, string> = {
  green: "Comp aligned",
  amber: "Comp stretch",
  not_set: "Comp not set",
};
const COMP_COLOR: Record<string, string> = {
  green: "var(--ss-green)",
  amber: "var(--ss-yellow)",
  not_set: "var(--ss-gray-light)",
};

function editsKey(id: string) {
  return `card_edits_${id}`;
}

// ── Tiny editable span/p/h3 with gold focus ring + reset button ──────────────
function Editable({
  value,
  onSave,
  originalValue,
  onReset,
  editMode = false,
  as: Tag = "span",
  html = false,
  singleLine = false,
  className,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  originalValue?: string;
  onReset?: () => void;
  editMode?: boolean;
  as?: "span" | "p" | "h3";
  html?: boolean;
  singleLine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isModified, setIsModified] = useState(
    originalValue !== undefined && value.trim() !== originalValue.trim()
  );

  // Static render when not in edit mode
  if (!editMode) {
    if (html) {
      return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: value }} />;
    }
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  const baseStyle: React.CSSProperties = {
    ...style,
    outline: "none",
    borderRadius: "3px",
    padding: "1px 3px",
    margin: "-1px -3px",
    cursor: "text",
    transition: "box-shadow 0.15s, background-color 0.15s",
    boxShadow: focused ? "0 0 0 2px rgba(197,165,114,0.45)" : "none",
    backgroundColor: focused
      ? "rgba(197,165,114,0.08)"
      : hovered
        ? "rgba(197,165,114,0.04)"
        : "transparent",
    display: Tag === "span" ? "inline" : "block",
  };

  const sharedProps = {
    ref: ref as React.RefObject<HTMLElement>,
    className,
    style: baseStyle,
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      const el = ref.current;
      if (!el) return;
      const val = html ? el.innerHTML : (el.textContent ?? "").trim();
      if (originalValue !== undefined) {
        setIsModified(val.trim() !== originalValue.trim());
      }
      onSave(val);
    },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (singleLine && e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
    },
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReset) {
      onReset();
      setIsModified(false);
      const el = ref.current;
      if (el && originalValue !== undefined) {
        if (html) el.innerHTML = originalValue;
        else el.textContent = originalValue;
      }
      return;
    }
  };

  const isBlock = Tag !== "span";
  const WrapperTag: React.ElementType = isBlock ? "div" : "span";

  const fieldEl = html
    ? <Tag {...(sharedProps as React.HTMLAttributes<HTMLElement>)} dangerouslySetInnerHTML={{ __html: value }} />
    : <Tag {...(sharedProps as React.HTMLAttributes<HTMLElement>)}>{value}</Tag>;

  return (
    <WrapperTag
      style={{ position: "relative", display: isBlock ? "block" : "inline-block" }}
    >
      {fieldEl}
      {isModified && onReset && (
        <button
          onMouseDown={handleReset}
          title="Reset to original"
          style={{
            position: "absolute",
            top: "1px",
            right: isBlock ? "2px" : "-20px",
            background: "transparent",
            border: "none",
            color: "rgba(197,165,114,0.5)",
            fontSize: "0.8rem",
            cursor: "pointer",
            padding: "1px 3px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)";
          }}
        >
          ↺
        </button>
      )}
    </WrapperTag>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntroCard({ card, onClick, editMode = false }: IntroCardProps) {
  const [edits, setEdits] = useState<CardEdits>({});

  // Load persisted edits on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(editsKey(card.candidate_id));
      if (stored) setEdits(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [card.candidate_id]);

  const save = useCallback(
    (updates: CardEdits) => {
      setEdits((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined) delete merged[k as keyof CardEdits];
          else (merged as Record<string, unknown>)[k] = v;
        }
        try { localStorage.setItem(editsKey(card.candidate_id), JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      });
    },
    [card.candidate_id]
  );

  const saveStrength = useCallback(
    (index: number, value: string) => {
      setEdits((prev) => {
        const base = prev.key_strengths ?? card.key_strengths ?? [];
        const next = [...base];
        next[index] = value;
        const merged = { ...prev, key_strengths: next };
        try { localStorage.setItem(editsKey(card.candidate_id), JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      });
    },
    [card.candidate_id, card.key_strengths]
  );

  // Resolved values (edit override → fixture fallback)
  const v = {
    candidate_name: edits.candidate_name ?? card.candidate_name,
    current_title: edits.current_title ?? card.current_title,
    current_company: edits.current_company ?? card.current_company,
    location: edits.location ?? card.location,
    flash_summary: edits.flash_summary ?? card.flash_summary ?? "",
    key_strengths: edits.key_strengths ?? card.key_strengths ?? [],
    notice_period: edits.notice_period ?? card.notice_period ?? "",
    compensation_alignment: edits.compensation_alignment ?? card.compensation_alignment ?? "not_set",
  };

  const cycleAlignment = () => {
    const curr = v.compensation_alignment;
    const idx = COMP_CYCLE.indexOf(curr);
    const next = COMP_CYCLE[(idx + 1) % COMP_CYCLE.length];
    save({ compensation_alignment: next });
  };

  const alignmentIsModified =
    v.compensation_alignment !== (card.compensation_alignment ?? "not_set");
  const alignmentColor = COMP_COLOR[v.compensation_alignment];

  return (
    <div
      onClick={editMode ? undefined : onClick}
      style={{
        background: "var(--deck-surface)",
        border: `1px solid rgba(197, 165, 114, var(--deck-gold-border-alpha))`,
        borderRadius: "16px",
        overflow: "hidden",
        cursor: editMode ? "default" : "pointer",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(197, 165, 114, 0.35)";
        if (!editMode) el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(197, 165, 114, 0.06)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(197, 165, 114, 0.12)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* ── Header zone — warm charcoal ── */}
      <div
        style={{
          background: "var(--deck-card-bg)",
          padding: "28px 24px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-40px", right: "-40px",
            width: "180px", height: "180px",
            background: "radial-gradient(circle, rgba(197,165,114,0.07) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Avatar */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 0 0 3px rgba(197,165,114,0.15)",
          }}
        >
          <span
            className="font-cormorant"
            style={{ fontSize: "22px", fontWeight: 600, color: "var(--ss-dark)", lineHeight: 1 }}
          >
            {card.initials}
          </span>
        </div>

        {/* Candidate name */}
        <Editable
          value={v.candidate_name}
          onSave={(val) => save({ candidate_name: val })}
          originalValue={card.candidate_name}
          onReset={() => save({ candidate_name: undefined })}
          editMode={editMode}
          as="h3"
          singleLine
          className="font-cormorant"
          style={{
            fontSize: "1.35rem",
            fontWeight: 500,
            color: "rgba(var(--deck-text-rgb),0.9)",
            marginBottom: "4px",
            letterSpacing: "-0.2px",
          }}
        />

        {/* Current title */}
        <Editable
          value={v.current_title}
          onSave={(val) => save({ current_title: val })}
          originalValue={card.current_title}
          onReset={() => save({ current_title: undefined })}
          editMode={editMode}
          as="p"
          singleLine
          style={{ fontSize: "0.78rem", color: "var(--ss-gold)", marginBottom: "2px", fontWeight: 500 }}
        />

        {/* Company · Location */}
        <p style={{ fontSize: "0.75rem", color: "rgba(var(--deck-text-rgb),0.35)" }}>
          <Editable
            value={v.current_company}
            onSave={(val) => save({ current_company: val })}
            originalValue={card.current_company}
            onReset={() => save({ current_company: undefined })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.75rem", color: "rgba(var(--deck-text-rgb),0.35)" }}
          />
          {v.location && (
            <>
              <span style={{ margin: "0 6px", color: "rgba(197,165,114,0.3)" }}>·</span>
              <Editable
                value={v.location}
                onSave={(val) => save({ location: val })}
                originalValue={card.location}
                onReset={() => save({ location: undefined })}
                editMode={editMode}
                singleLine
                style={{ fontSize: "0.75rem", color: "rgba(var(--deck-text-rgb),0.35)" }}
              />
            </>
          )}
        </p>
      </div>

      {/* ── Body zone ── */}
      <div style={{ padding: "18px 24px 14px", flex: 1 }}>

        {/* Flash summary — full text, no line clamp (editable = full view) */}
        {v.flash_summary && (
          <Editable
            value={v.flash_summary}
            onSave={(val) => save({ flash_summary: val })}
            originalValue={card.flash_summary ?? ""}
            onReset={() => save({ flash_summary: undefined })}
            editMode={editMode}
            as="p"
            html
            style={{
              fontSize: "0.82rem",
              color: "rgba(var(--deck-text-rgb),0.45)",
              lineHeight: 1.6,
              marginBottom: "14px",
            }}
          />
        )}

        {/* Key strengths */}
        {v.key_strengths.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
            {v.key_strengths.map((strength, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                <span style={{ color: "var(--ss-gold)", fontSize: "0.7rem", flexShrink: 0 }}>▸</span>
                <Editable
                  value={strength}
                  onSave={(val) => saveStrength(i, val)}
                  originalValue={(card.key_strengths ?? [])[i] ?? ""}
                  onReset={() => saveStrength(i, (card.key_strengths ?? [])[i] ?? "")}
                  editMode={editMode}
                  style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.5)", lineHeight: 1.4 }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Notice + comp alignment */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
          {(v.notice_period || editMode) && (
            <span style={{ fontSize: "0.72rem", color: "rgba(var(--deck-text-rgb),0.3)" }}>
              <span style={{ fontWeight: 600, color: "rgba(var(--deck-text-rgb),0.4)" }}>Notice:</span>{" "}
              <Editable
                value={v.notice_period || (editMode ? "—" : "")}
                onSave={(val) => save({ notice_period: val })}
                originalValue={card.notice_period ?? ""}
                onReset={() => save({ notice_period: undefined })}
                editMode={editMode}
                singleLine
                style={{ fontSize: "0.72rem", color: "rgba(var(--deck-text-rgb),0.3)" }}
              />
            </span>
          )}
          {/* Comp alignment badge — static in client view, cycling button in edit mode */}
          {editMode ? (
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={(e) => { e.stopPropagation(); cycleAlignment(); }}
                title="Click to cycle compensation alignment"
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: `${alignmentColor}18`,
                  color: alignmentColor,
                  letterSpacing: "0.5px",
                  border: `1px solid ${alignmentColor}40`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {COMP_LABEL[v.compensation_alignment]}
              </button>
              {alignmentIsModified && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    save({ compensation_alignment: undefined });
                  }}
                  title="Reset to original"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(197,165,114,0.5)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    padding: "1px 3px",
                    lineHeight: 1,
                    transition: "color 0.15s",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
                >
                  ↺
                </button>
              )}
            </span>
          ) : (
            v.compensation_alignment !== "not_set" && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: `${alignmentColor}18`,
                  color: alignmentColor,
                  letterSpacing: "0.5px",
                }}
              >
                {COMP_LABEL[v.compensation_alignment]}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <div
        onClick={editMode ? onClick : undefined}
        style={{
          padding: "10px 24px",
          borderTop: "1px solid rgba(197,165,114,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: editMode ? "pointer" : "inherit",
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => {
          if (editMode) (e.currentTarget as HTMLDivElement).style.background = "rgba(197,165,114,0.06)";
        }}
        onMouseOut={(e) => {
          if (editMode) (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            color: "rgba(var(--deck-text-rgb),0.2)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Executive Decision Card
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ss-gold)" }}>
          View →
        </span>
      </div>
    </div>
  );
}
