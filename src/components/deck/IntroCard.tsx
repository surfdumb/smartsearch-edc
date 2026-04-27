/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IntroCardData } from "@/lib/types";
import { signalEdit, markDirty } from "@/hooks/useAutoSave";
import { isEditFresh, writeBaseHash } from "@/lib/edit-hash";
import { stripArtifacts } from "@/lib/sanitize";

interface IntroCardProps {
  card: IntroCardData;
  onClick: () => void;
  editMode?: boolean;
  onRemove?: () => void;
}

// ── Per-candidate edit overrides stored in localStorage ──────────────────────
type CardEdits = {
  candidate_name?: string;
  current_title?: string;
  current_company?: string;
  location?: string;
  headline?: string;
  status?: 'new' | 'active' | 'rejected' | 'hold' | 'none';
  compensation_alignment?: "green" | "amber" | "not_set";
};

const COMP_CYCLE: Array<"green" | "amber" | "not_set"> = ["green", "amber", "not_set"];
const COMP_COLOR: Record<string, string> = {
  green: "#4a7c59",
  amber: "#c9953a",
  not_set: "#a0a0a0",
};

// Click-cycle order. 'none' is at the END so first click on a fresh badge
// lands on 'new' (the consultant's likely intent), and cycling past 'hold'
// goes to 'none' — the deliberate way to take a candidate off client view
// without resetting unrelated edits.
const STATUS_CYCLE: Array<'new' | 'active' | 'rejected' | 'hold' | 'none'> = ['new', 'active', 'rejected', 'hold', 'none'];
const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  new: { color: "#4a6a8c", bg: "rgba(74,106,140,0.08)", border: "rgba(74,106,140,0.2)" },
  active: { color: "#4a7c59", bg: "rgba(74,124,89,0.08)", border: "rgba(74,124,89,0.2)" },
  rejected: { color: "#999", bg: "rgba(160,160,160,0.06)", border: "rgba(160,160,160,0.15)" },
  hold: { color: "#c9953a", bg: "rgba(201,149,58,0.08)", border: "rgba(201,149,58,0.2)" },
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
    boxShadow: focused ? "0 0 0 2px rgba(197,165,114,0.35)" : "none",
    backgroundColor: focused
      ? "rgba(197,165,114,0.06)"
      : hovered
        ? "rgba(197,165,114,0.03)"
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
        const val = stripArtifacts(e.currentTarget.textContent ?? "");
        if (val !== (e.currentTarget.textContent ?? "").trim()) {
          e.currentTarget.textContent = val;
        }
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
export default function IntroCard({ card, onClick, editMode = false, onRemove }: IntroCardProps) {
  const [edits, setEdits] = useState<CardEdits>({});

  const cardPropData = { candidate_name: card.candidate_name, current_title: card.current_title, current_company: card.current_company, location: card.location, compensation_alignment: card.compensation_alignment };
  useEffect(() => {
    try {
      const key = editsKey(card.candidate_id);
      if (isEditFresh(key, cardPropData)) {
        const stored = localStorage.getItem(key);
        if (stored) setEdits(JSON.parse(stored));
        else setEdits({});
      } else {
        setEdits({});
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.candidate_id]);

  const save = useCallback(
    (updates: CardEdits) => {
      setEdits((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined) delete merged[k as keyof CardEdits];
          else (merged as Record<string, unknown>)[k] = v;
        }
        try { localStorage.setItem(editsKey(card.candidate_id), JSON.stringify(merged)); writeBaseHash(editsKey(card.candidate_id), { candidate_name: card.candidate_name, current_title: card.current_title, current_company: card.current_company, location: card.location, compensation_alignment: card.compensation_alignment }); } catch { /* ignore */ }
        markDirty(card.candidate_id);
        signalEdit(card.candidate_id);
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
  const alignmentColor = COMP_COLOR[v.compensation_alignment] ?? COMP_COLOR.not_set;
  // Photo priority: persisted upload > explicit URL > data URL > initials fallback
  const [storedPhoto] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const v = localStorage.getItem(`edc_photo_${card.candidate_id}`);
      return v && v.length > 100 ? v : null; // ignore corrupt/empty entries
    } catch { return null; }
  });
  const explicitPhoto = card.photo_url || card.edc_data?.photo_url || null;
  const rawPhotoUrl = storedPhoto ?? explicitPhoto;
  const [photoError, setPhotoError] = useState(false);
  const photoUrl = photoError ? null : rawPhotoUrl;

  const cycleAlignment = () => {
    const idx = COMP_CYCLE.indexOf(v.compensation_alignment);
    save({ compensation_alignment: COMP_CYCLE[(idx + 1) % COMP_CYCLE.length] });
  };

  const cycleStatus = () => {
    // 'none' / undefined → first click lands on 'new' (indexOf returns -1; (-1+1)%4 = 0)
    const idx = v.status ? STATUS_CYCLE.indexOf(v.status as typeof STATUS_CYCLE[number]) : -1;
    save({ status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] });
  };

  // Strip HTML from headline for snippet — show full text (card grows to fit)
  const snippet = v.headline.replace(/<[^>]+>/g, '');

  return (
    <div
      onClick={editMode ? undefined : onClick}
      style={{
        background: "#faf8f5",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E\")",
        border: "1px solid rgba(197,165,114,0.18)",
        borderTop: "2px solid rgba(197,165,114,0.25)",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: editMode ? "grab" : "pointer",
        boxShadow: "0 2px 6px rgba(45,40,36,0.10), 0 10px 28px rgba(45,40,36,0.13), 0 28px 64px rgba(45,40,36,0.07)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        opacity: isRejected ? 0.5 : 1,
        filter: isRejected ? "grayscale(0.4)" : "none",
      }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 4px 10px rgba(45,40,36,0.14), 0 16px 40px rgba(45,40,36,0.18), 0 36px 80px rgba(45,40,36,0.09)";
        if (!editMode) el.style.transform = "translateY(-3px)";
        el.style.borderColor = "rgba(197,165,114,0.30)";
        el.style.borderTopColor = "#c5a572";
        const arrow = el.querySelector('.intro-card-arrow') as HTMLElement;
        if (arrow) { arrow.style.color = "#c5a572"; arrow.style.transform = "translateX(5px)"; }
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 2px 6px rgba(45,40,36,0.10), 0 10px 28px rgba(45,40,36,0.13), 0 28px 64px rgba(45,40,36,0.07)";
        el.style.transform = "translateY(0)";
        el.style.borderColor = "rgba(197,165,114,0.18)";
        el.style.borderTopColor = "rgba(197,165,114,0.25)";
        const arrow = el.querySelector('.intro-card-arrow') as HTMLElement;
        if (arrow) { arrow.style.color = "#a09080"; arrow.style.transform = "translateX(0)"; }
      }}
    >
      {/* ── Status badge (top-right) — always visible, always clickable ── */}
      {/* In client view: only show when status is set (not 'none') */}
      {/* In edit mode: always show so consultant can set status */}
      {(editMode || (v.status && v.status !== 'none')) && (
        <div
          onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: (!v.status || v.status === 'none') ? "rgba(160,160,160,0.5)" : STATUS_STYLES[v.status].color,
            background: (!v.status || v.status === 'none') ? "rgba(160,160,160,0.04)" : STATUS_STYLES[v.status].bg,
            border: `1px solid ${(!v.status || v.status === 'none') ? "rgba(160,160,160,0.15)" : STATUS_STYLES[v.status].border}`,
            borderRadius: "4px",
            padding: "3px 8px",
            cursor: "pointer",
            zIndex: 2,
            transition: "all 0.2s",
          }}
        >
          {(!v.status || v.status === 'none') ? "No status" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
        </div>
      )}

      {/* ── Remove from deck button (edit mode only) ── */}
      {editMode && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Hide from client"
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid rgba(160,160,160,0.2)",
            background: "rgba(160,160,160,0.06)",
            color: "rgba(160,160,160,0.5)",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            lineHeight: 1,
            padding: 0,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#b85450";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,84,80,0.3)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,84,80,0.08)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(160,160,160,0.5)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(160,160,160,0.2)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,160,160,0.06)";
          }}
        >
          ✕
        </button>
      )}

      {/* ── Card body ── */}
      <div style={{ padding: "26px 22px 18px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Avatar — photo or initials */}
        <div
          style={{
            width: "62px",
            height: "62px",
            borderRadius: "50%",
            background: photoUrl ? "transparent" : "linear-gradient(135deg, #c5a572, #d4ba8a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            border: "2.5px solid rgba(197,165,114,0.40)",
            overflow: "hidden",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={v.candidate_name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
              onError={() => setPhotoError(true)}
            />
          ) : (
            <span
              className="font-cormorant"
              style={{ fontSize: "21px", fontWeight: 600, color: "#1a1a1a", lineHeight: 1 }}
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
            fontSize: "1.38rem",
            fontWeight: 600,
            color: "#1a1a1a",
            marginBottom: "4px",
            letterSpacing: "-0.2px",
            lineHeight: 1.2,
          }}
        />

        {/* Title + Company */}
        <p style={{ fontSize: "0.98rem", color: "#5a5550", marginBottom: "3px", lineHeight: 1.35 }}>
          <Editable
            value={v.current_title}
            onSave={(val) => save({ current_title: val })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.98rem", color: "#5a5550" }}
          />
        </p>
        <p style={{ fontSize: "0.98rem", marginBottom: "3px", lineHeight: 1.35 }}>
          <Editable
            value={v.current_company}
            onSave={(val) => save({ current_company: val })}
            editMode={editMode}
            singleLine
            style={{ fontSize: "0.98rem", color: "#1a1a1a", fontWeight: 600 }}
          />
        </p>

        {/* Location */}
        {(v.location || editMode) && (
          <p style={{ fontSize: "0.9rem", color: "#8a857f", marginBottom: "0" }}>
            <Editable
              value={v.location || ""}
              onSave={(val) => save({ location: val })}
              editMode={editMode}
              singleLine
              style={{ fontSize: "0.9rem", color: "#8a857f" }}
            />
          </p>
        )}

        {/* Snippet — editable headline */}
        {(snippet || editMode) && (
          <div style={{ textAlign: "center", marginTop: "10px", marginBottom: "0" }}>
            <Editable
              value={snippet}
              onSave={(val) => save({ headline: val })}
              editMode={editMode}
              style={{
                fontSize: "0.94rem",
                color: "#5a5550",
                lineHeight: 1.5,
              }}
            />
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: "10px" }} />
      </div>

      {/* ── Footer — comp dot + arrow ── */}
      <div
        onClick={editMode ? onClick : undefined}
        style={{
          padding: "10px 22px",
          borderTop: "1px solid rgba(197,165,114,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: editMode ? "pointer" : "inherit",
          background: "rgba(240,237,232,0.5)",
        }}
      >
        {/* Comp alignment */}
        {editMode ? (
          <button
            onClick={(e) => { e.stopPropagation(); cycleAlignment(); }}
            title="Click to cycle compensation alignment"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "6px",
              background: "transparent",
              color: alignmentColor,
              border: `1px solid ${alignmentColor}30`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: alignmentColor }} />
            {v.compensation_alignment === "green" ? "Comp aligned" : v.compensation_alignment === "amber" ? "Comp concern" : "Comp not set"}
          </button>
        ) : (
          v.compensation_alignment !== "not_set" ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 500, color: alignmentColor }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: alignmentColor }} />
              {v.compensation_alignment === "green" ? "Comp aligned" : "Comp concern"}
            </span>
          ) : <span />
        )}

        {/* Arrow */}
        <span
          className="intro-card-arrow"
          style={{ fontSize: "0.95rem", fontWeight: 700, color: "#a09080", transition: "color 0.3s ease, transform 0.3s ease" }}
        >
          →
        </span>
      </div>
    </div>
  );
}
