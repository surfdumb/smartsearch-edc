/* eslint-disable @next/next/no-img-element */
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
  headline?: string;
  motivation?: string;
  scope_pills?: string[];
  placed?: boolean;
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
  const [addingPill, setAddingPill] = useState(false);
  const pillInputRef = useRef<HTMLInputElement>(null);

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

  // Resolved values (edit override → fixture fallback)
  const v = {
    candidate_name: edits.candidate_name ?? card.candidate_name,
    current_title: edits.current_title ?? card.current_title,
    current_company: edits.current_company ?? card.current_company,
    location: edits.location ?? card.location,
    headline: edits.headline ?? card.headline ?? card.flash_summary ?? "",
    motivation: edits.motivation ?? card.motivation ?? "",
    scope_pills: edits.scope_pills ?? card.scope_pills ?? [],
    placed: edits.placed ?? card.placed ?? false,
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

  // Photo URL: check intro card level first, then fall back to edc_data
  const photoUrl = card.photo_url ?? card.edc_data?.photo_url;

  // Our Take fragment — show first one as a quote teaser
  const ourTakeQuote = card.edc_data?.our_take_fragments?.[0] ?? card.edc_data?.our_take?.text;

  // Pill editing
  const savePill = (index: number, value: string) => {
    const pills = [...v.scope_pills];
    pills[index] = value;
    save({ scope_pills: pills });
  };
  const removePill = (index: number) => {
    if (v.scope_pills.length <= 1) return; // min 1
    const pills = v.scope_pills.filter((_, i) => i !== index);
    save({ scope_pills: pills });
  };
  const addPill = (text: string) => {
    if (v.scope_pills.length >= 6) return; // max 6
    const pills = [...v.scope_pills, text];
    save({ scope_pills: pills });
    setAddingPill(false);
  };

  return (
    <div
      onClick={editMode ? undefined : onClick}
      style={{
        background: "var(--deck-surface)",
        border: "1px solid rgba(197, 165, 114, var(--deck-gold-border-alpha))",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: editMode ? "default" : "pointer",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
      }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(197, 165, 114, 0.35)";
        if (!editMode) el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(197, 165, 114, 0.06)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `rgba(197, 165, 114, var(--deck-gold-border-alpha))`;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* ── Placed badge ── */}
      {(v.placed || editMode) && (
        <div
          onClick={editMode ? (e) => { e.stopPropagation(); save({ placed: !v.placed }); } : undefined}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.68rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: "var(--ss-gold)",
            background: v.placed ? "rgba(197,165,114,0.1)" : "transparent",
            padding: "4px 10px",
            borderRadius: "4px",
            border: v.placed ? "1px solid rgba(197,165,114,0.2)" : "1px dashed rgba(197,165,114,0.15)",
            opacity: v.placed ? 1 : 0.4,
            cursor: editMode ? "pointer" : "default",
            zIndex: 2,
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: "0.72rem" }}>✦</span> Placed
        </div>
      )}

      {/* ── Header zone ── */}
      <div
        style={{
          background: "var(--deck-card-bg)",
          padding: "28px 24px 18px",
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

        {/* Avatar — photo or initials */}
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: photoUrl ? "transparent" : "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 0 0 3px rgba(197,165,114,0.15)",
            overflow: "hidden",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={v.candidate_name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              className="font-cormorant"
              style={{ fontSize: "22px", fontWeight: 600, color: "var(--ss-dark)", lineHeight: 1 }}
            >
              {card.initials}
            </span>
          )}
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
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "rgba(var(--deck-text-rgb),0.9)",
            marginBottom: "5px",
            letterSpacing: "-0.2px",
          }}
        />

        {/* Title at Company */}
        <p style={{ fontSize: "0.9rem", color: "rgba(var(--deck-text-rgb),0.75)", marginBottom: "3px", lineHeight: 1.4, textAlign: "center" }}>
          <Editable
            value={v.current_title}
            onSave={(val) => save({ current_title: val })}
            originalValue={card.current_title}
            onReset={() => save({ current_title: undefined })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.9rem", color: "var(--ss-gold)", fontWeight: 500 }}
          />
          <span style={{ fontWeight: 400, color: "rgba(var(--deck-text-rgb),0.45)" }}> at </span>
          <Editable
            value={v.current_company}
            onSave={(val) => save({ current_company: val })}
            originalValue={card.current_company}
            onReset={() => save({ current_company: undefined })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.9rem", color: "rgba(var(--deck-text-rgb),0.75)", fontWeight: 500 }}
          />
        </p>

        {/* Location */}
        {v.location && (
          <p style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.4)", textAlign: "center" }}>
            <Editable
              value={v.location}
              onSave={(val) => save({ location: val })}
              originalValue={card.location}
              onReset={() => save({ location: undefined })}
              editMode={editMode}
              singleLine
              style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.4)" }}
            />
          </p>
        )}
      </div>

      {/* ── Body zone ── */}
      <div style={{ padding: "16px 24px 14px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Headline — single sentence */}
        {v.headline && (
          <Editable
            value={v.headline}
            onSave={(val) => save({ headline: val })}
            originalValue={card.headline ?? card.flash_summary ?? ""}
            onReset={() => save({ headline: undefined })}
            editMode={editMode}
            as="p"
            html
            style={{
              fontSize: "1rem",
              color: "rgba(var(--deck-text-rgb),0.7)",
              lineHeight: 1.55,
              textAlign: "center",
              marginBottom: "0",
            }}
          />
        )}

        {/* Motivation hook — Cormorant italic */}
        {v.motivation && (
          <Editable
            value={v.motivation}
            onSave={(val) => save({ motivation: val })}
            originalValue={card.motivation ?? ""}
            onReset={() => save({ motivation: undefined })}
            editMode={editMode}
            as="p"
            style={{
              fontSize: "0.9rem",
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--ss-gold-light)",
              lineHeight: 1.5,
              textAlign: "center",
              marginTop: "12px",
            }}
          />
        )}

        {/* Our Take quote — Cormorant italic in speech marks */}
        {ourTakeQuote && !editMode && (
          <p
            style={{
              fontSize: "0.92rem",
              fontWeight: 400,
              color: "rgba(var(--deck-text-rgb), 0.65)",
              lineHeight: 1.5,
              textAlign: "center",
              marginTop: "14px",
              padding: "0 8px",
            }}
          >
            &ldquo;{ourTakeQuote}&rdquo;
          </p>
        )}

        {/* Scope pills */}
        {v.scope_pills.length > 0 && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "6px",
            marginTop: "16px",
          }}>
            {v.scope_pills.map((pill, i) => (
              <span
                key={i}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  letterSpacing: "0.3px",
                  padding: "5px 12px",
                  borderRadius: "100px",
                  background: "rgba(197,165,114,0.08)",
                  border: "1px solid rgba(197,165,114,0.18)",
                  color: "rgba(var(--deck-text-rgb),0.55)",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  position: "relative",
                }}
                contentEditable={editMode}
                suppressContentEditableWarning
                onClick={editMode ? (e) => e.stopPropagation() : undefined}
                onBlur={editMode ? (e) => {
                  const text = (e.currentTarget.textContent ?? "").trim();
                  if (text && text !== pill) savePill(i, text);
                } : undefined}
              >
                {pill}
                {editMode && v.scope_pills.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePill(i); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(197,165,114,0.4)",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      padding: "0 0 0 2px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {editMode && v.scope_pills.length < 6 && !addingPill && (
              <button
                onClick={(e) => { e.stopPropagation(); setAddingPill(true); setTimeout(() => pillInputRef.current?.focus(), 50); }}
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  padding: "5px 12px",
                  borderRadius: "100px",
                  background: "transparent",
                  border: "1px dashed rgba(197,165,114,0.2)",
                  color: "rgba(197,165,114,0.4)",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            )}
            {addingPill && (
              <input
                ref={pillInputRef}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const text = (e.currentTarget.value ?? "").trim();
                    if (text) addPill(text);
                  }
                  if (e.key === "Escape") setAddingPill(false);
                }}
                onBlur={(e) => {
                  const text = (e.currentTarget.value ?? "").trim();
                  if (text) addPill(text);
                  else setAddingPill(false);
                }}
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: "100px",
                  background: "rgba(197,165,114,0.04)",
                  border: "1px solid rgba(197,165,114,0.3)",
                  color: "rgba(var(--deck-text-rgb),0.7)",
                  outline: "none",
                  width: "100px",
                }}
                placeholder="New pill"
              />
            )}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Notice + comp alignment */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px", marginTop: "14px" }}>
          {(v.notice_period || editMode) && (
            <span style={{ fontSize: "0.73rem", color: "rgba(var(--deck-text-rgb),0.3)" }}>
              <span style={{ fontWeight: 500, color: "rgba(var(--deck-text-rgb),0.4)" }}>Notice:</span>{" "}
              <Editable
                value={v.notice_period || (editMode ? "—" : "")}
                onSave={(val) => save({ notice_period: val })}
                originalValue={card.notice_period ?? ""}
                onReset={() => save({ notice_period: undefined })}
                editMode={editMode}
                singleLine
                style={{ fontSize: "0.73rem", color: "rgba(var(--deck-text-rgb),0.3)" }}
              />
            </span>
          )}
          {/* Comp alignment badge */}
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
        className="intro-card-cta"
        style={{
          padding: "12px 24px",
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
          className="font-cormorant"
          style={{
            fontSize: "0.78rem",
            fontStyle: "italic",
            color: "rgba(var(--deck-text-rgb),0.25)",
            fontWeight: 400,
          }}
        >
          Executive Decision Card
        </span>
        <span
          className="intro-card-arrow"
          style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--ss-gold)", transition: "transform 0.2s" }}
        >
          View →
        </span>
      </div>
    </div>
  );
}
