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
};

function editsKey(id: string) {
  return `card_edits_${id}`;
}

// ── Tiny editable span/p/h3 with gold focus ring ─────────────────────────────
function Editable({
  value,
  onSave,
  as: Tag = "span",
  html = false,
  singleLine = false,
  className,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  as?: "span" | "p" | "h3";
  html?: boolean;
  singleLine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

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
      onSave(html ? el.innerHTML : (el.textContent ?? "").trim());
    },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    // Stop propagation so clicking a field doesn't trigger the card flip
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (singleLine && e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
    },
  };

  if (html) {
    return <Tag {...(sharedProps as React.HTMLAttributes<HTMLElement>)} dangerouslySetInnerHTML={{ __html: value }} />;
  }

  return <Tag {...(sharedProps as React.HTMLAttributes<HTMLElement>)}>{value}</Tag>;
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
        const merged = { ...prev, ...updates };
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
  };

  const alignmentColor = {
    green: "var(--ss-green)",
    amber: "var(--ss-yellow)",
    red: "var(--ss-red)",
    not_set: "var(--ss-gray-light)",
  }[card.compensation_alignment ?? "not_set"];

  return (
    <div
      onClick={editMode ? undefined : onClick}
      style={{
        background: "rgba(26, 26, 26, 0.95)",
        border: "1px solid rgba(197, 165, 114, 0.12)",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: editMode ? "default" : "pointer",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
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
          background: "var(--ss-header-bg)",
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
          as="h3"
          singleLine
          className="font-cormorant"
          style={{
            fontSize: "1.35rem",
            fontWeight: 500,
            color: "#f5f0ea",
            marginBottom: "4px",
            letterSpacing: "-0.2px",
          }}
        />

        {/* Current title */}
        <Editable
          value={v.current_title}
          onSave={(val) => save({ current_title: val })}
          as="p"
          singleLine
          style={{ fontSize: "0.78rem", color: "var(--ss-gold)", marginBottom: "2px", fontWeight: 500 }}
        />

        {/* Company · Location */}
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
          <Editable
            value={v.current_company}
            onSave={(val) => save({ current_company: val })}
            singleLine
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}
          />
          {v.location && (
            <>
              <span style={{ margin: "0 6px", color: "rgba(197,165,114,0.3)" }}>·</span>
              <Editable
                value={v.location}
                onSave={(val) => save({ location: val })}
                singleLine
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}
              />
            </>
          )}
        </p>
      </div>

      {/* ── Body zone ── */}
      <div style={{ padding: "18px 24px 14px" }}>

        {/* Flash summary — full text, no line clamp (editable = full view) */}
        {v.flash_summary && (
          <Editable
            value={v.flash_summary}
            onSave={(val) => save({ flash_summary: val })}
            as="p"
            html
            style={{
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.45)",
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
                  style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Notice + comp alignment */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {v.notice_period && (
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
              <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Notice:</span>{" "}
              <Editable
                value={v.notice_period}
                onSave={(val) => save({ notice_period: val })}
                singleLine
                style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}
              />
            </span>
          )}
          {card.compensation_alignment && card.compensation_alignment !== "not_set" && (
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
              {card.compensation_alignment === "green"
                ? "Comp aligned"
                : card.compensation_alignment === "amber"
                ? "Comp stretch"
                : "Comp gap"}
            </span>
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
            color: "rgba(255,255,255,0.2)",
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
