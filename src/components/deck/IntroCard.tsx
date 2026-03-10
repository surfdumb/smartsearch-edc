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
  status?: 'new' | 'active' | 'rejected' | 'hold';
  compensation_alignment?: "green" | "amber" | "not_set";
};

const COMP_CYCLE: Array<"green" | "amber" | "not_set"> = ["green", "amber", "not_set"];
const COMP_COLOR: Record<string, string> = {
  green: "var(--ss-green)",
  amber: "var(--ss-yellow)",
  not_set: "var(--ss-gray-light)",
};

const STATUS_CYCLE: Array<'new' | 'active' | 'rejected' | 'hold'> = ['new', 'active', 'rejected', 'hold'];
const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  new: { color: "#6ba3d6", bg: "rgba(107,163,214,0.10)", border: "rgba(107,163,214,0.25)" },
  active: { color: "var(--ss-green)", bg: "var(--ss-green-light)", border: "rgba(74,124,89,0.25)" },
  rejected: { color: "var(--ss-gray-light)", bg: "rgba(160,160,160,0.08)", border: "rgba(160,160,160,0.2)" },
  hold: { color: "var(--ss-yellow)", bg: "var(--ss-yellow-light)", border: "rgba(201,149,58,0.25)" },
};

function editsKey(id: string) {
  return `card_edits_${id}`;
}

// ── Tiny editable span/p/h3 ──────────────────────────────────────────────────
function Editable({
  value,
  onSave,
  editMode = false,
  as: Tag = "span",
  singleLine = false,
  className,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  editMode?: boolean;
  as?: "span" | "p" | "h3";
  singleLine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!editMode) {
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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    <Tag
      ref={ref as any}
      className={className}
      style={baseStyle}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        setFocused(false);
        const val = (e.currentTarget.textContent ?? "").trim();
        onSave(val);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </Tag>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntroCard({ card, onClick, editMode = false }: IntroCardProps) {
  const [edits, setEdits] = useState<CardEdits>({});

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

  // Resolved values
  const v = {
    candidate_name: edits.candidate_name ?? card.candidate_name,
    current_title: edits.current_title ?? card.current_title,
    current_company: edits.current_company ?? card.current_company,
    location: edits.location ?? card.location,
    headline: edits.headline ?? card.headline ?? card.flash_summary ?? "",
    status: edits.status ?? (card as IntroCardData & { status?: string }).status as CardEdits['status'] | undefined,
    compensation_alignment: edits.compensation_alignment ?? card.compensation_alignment ?? "not_set",
  };

  const isRejected = v.status === 'rejected';
  const alignmentColor = COMP_COLOR[v.compensation_alignment];
  const photoUrl = card.photo_url ?? card.edc_data?.photo_url;

  const cycleAlignment = () => {
    const idx = COMP_CYCLE.indexOf(v.compensation_alignment);
    save({ compensation_alignment: COMP_CYCLE[(idx + 1) % COMP_CYCLE.length] });
  };

  const cycleStatus = () => {
    const curr = v.status || 'new';
    const idx = STATUS_CYCLE.indexOf(curr);
    save({ status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] });
  };

  // Strip HTML from headline for snippet
  const snippetText = v.headline.replace(/<[^>]+>/g, '');
  const snippet = snippetText.length > 120 ? snippetText.slice(0, 117) + '...' : snippetText;

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
        opacity: isRejected ? 0.5 : 1,
        filter: isRejected ? "grayscale(0.4)" : "none",
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
        el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)";
      }}
    >
      {/* ── Status badge (top-right) ── */}
      {(v.status || editMode) && (
        <div
          onClick={editMode ? (e) => { e.stopPropagation(); cycleStatus(); } : undefined}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            fontSize: "0.62rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: STATUS_STYLES[v.status || 'new'].color,
            background: STATUS_STYLES[v.status || 'new'].bg,
            border: `1px solid ${STATUS_STYLES[v.status || 'new'].border}`,
            borderRadius: "6px",
            padding: "3px 8px",
            cursor: editMode ? "pointer" : "default",
            zIndex: 2,
            transition: "all 0.2s",
          }}
        >
          {v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : "New"}
        </div>
      )}

      {/* ── Header zone ── */}
      <div
        style={{
          background: "var(--deck-card-bg)",
          padding: "24px 24px 16px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Avatar — photo or initials */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: photoUrl ? "transparent" : "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
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
              style={{ fontSize: "20px", fontWeight: 600, color: "var(--ss-dark)", lineHeight: 1 }}
            >
              {card.initials}
            </span>
          )}
        </div>

        {/* Candidate name */}
        <Editable
          value={v.candidate_name}
          onSave={(val) => save({ candidate_name: val })}
          editMode={editMode}
          as="h3"
          singleLine
          className="font-cormorant"
          style={{
            fontSize: "1.2rem",
            fontWeight: 500,
            color: "rgba(var(--deck-text-rgb),0.9)",
            marginBottom: "4px",
            letterSpacing: "-0.2px",
          }}
        />

        {/* Title at Company */}
        <p style={{ fontSize: "0.88rem", color: "rgba(var(--deck-text-rgb),0.75)", marginBottom: "3px", lineHeight: 1.4, textAlign: "center" }}>
          <Editable
            value={v.current_title}
            onSave={(val) => save({ current_title: val })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.88rem", color: "var(--ss-gold)", fontWeight: 500 }}
          />
          <span style={{ fontWeight: 400, color: "rgba(var(--deck-text-rgb),0.45)" }}> at </span>
          <Editable
            value={v.current_company}
            onSave={(val) => save({ current_company: val })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.88rem", color: "rgba(var(--deck-text-rgb),0.95)", fontWeight: 600 }}
          />
        </p>

        {/* Location */}
        {v.location && (
          <p style={{ fontSize: "0.76rem", color: "rgba(var(--deck-text-rgb),0.4)", textAlign: "center" }}>
            {v.location}
          </p>
        )}
      </div>

      {/* ── Body zone ── */}
      <div style={{ padding: "12px 24px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Snippet sentence */}
        {snippet && (
          <p
            style={{
              fontSize: "0.88rem",
              color: "rgba(var(--deck-text-rgb),0.6)",
              lineHeight: 1.55,
              textAlign: "center",
              marginBottom: "0",
            }}
          >
            {snippet}
          </p>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Comp alignment indicator */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "12px" }}>
          {editMode ? (
            <button
              onClick={(e) => { e.stopPropagation(); cycleAlignment(); }}
              title="Click to cycle compensation alignment"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "8px",
                background: `${alignmentColor}18`,
                color: alignmentColor,
                border: `1px solid ${alignmentColor}40`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: alignmentColor }} />
              {v.compensation_alignment === "green" ? "Comp aligned" : v.compensation_alignment === "amber" ? "Comp concern" : "Comp not set"}
            </button>
          ) : (
            v.compensation_alignment !== "not_set" && (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", fontWeight: 500, color: alignmentColor }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: alignmentColor }} />
                {v.compensation_alignment === "green" ? "Comp aligned" : "Comp concern"}
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
          padding: "10px 24px",
          borderTop: "1px solid rgba(197,165,114,0.08)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: editMode ? "pointer" : "inherit",
          transition: "background 0.15s",
        }}
      >
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
