"use client";

import { useState, useEffect } from "react";
import { markDirty, signalEdit } from "@/hooks/useAutoSave";

interface StatusPillProps {
  candidateId: string;
  /** Resolved current status from candidate.edc_data.status (or undefined for no-status). */
  status?: string;
}

// ── Status cycle (mirrors IntroCard.tsx:39–73; inlined here with a dark-theme
// palette tuned for the deck nav background. Extract to a shared
// lib/candidate-status.ts the third time anything needs these.) ──
const STATUS_CYCLE = ['new', 'active', 'rejected', 'hold', 'none'] as const;
type CycleStatus = typeof STATUS_CYCLE[number];

function normalizeStatus(raw: unknown): CycleStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  const lower = raw.toLowerCase();
  return (STATUS_CYCLE as readonly string[]).includes(lower)
    ? (lower as CycleStatus)
    : undefined;
}

// Accent palette: each status has its own colour. Shortlist statuses are
// blue/green/grey/gold; the no-status placeholder is gold-faded so the pill
// reads as part of the toolbar's accent family.
const STATUS_STYLES: Record<CycleStatus, { color: string; bg: string; border: string }> = {
  new:      { color: '#8db4d8',                bg: 'rgba(74,106,140,0.15)',  border: 'rgba(74,106,140,0.30)' },
  active:   { color: '#8fc09a',                bg: 'rgba(74,124,89,0.15)',   border: 'rgba(74,124,89,0.30)' },
  rejected: { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.15)' },
  hold:     { color: '#e0b87a',                bg: 'rgba(201,149,58,0.15)',  border: 'rgba(201,149,58,0.30)' },
  none:     { color: 'rgba(197,165,114,0.55)', bg: 'rgba(197,165,114,0.06)', border: 'rgba(197,165,114,0.20)' },
};

export default function StatusPill({ candidateId, status }: StatusPillProps) {
  // Local optimistic copy so the pill responds instantly to clicks without
  // waiting for the autosave roundtrip. Resets when the parent navigates to a
  // different candidate or when the upstream prop changes from a server refresh.
  const [statusState, setStatusState] = useState<CycleStatus | undefined>(() => normalizeStatus(status));
  useEffect(() => {
    setStatusState(normalizeStatus(status));
  }, [candidateId, status]);

  const cycleStatus = () => {
    // First click on a no-status pill lands on 'new' (indexOf returns -1, then (-1+1)%5 = 0).
    const idx = statusState ? STATUS_CYCLE.indexOf(statusState) : -1;
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    const editsKey = `card_edits_${candidateId}`;
    try {
      const prev = JSON.parse(localStorage.getItem(editsKey) || '{}');
      localStorage.setItem(editsKey, JSON.stringify({ ...prev, status: next }));
    } catch {
      /* ignore — localStorage may be unavailable in private browsing */
    }
    markDirty(candidateId);
    signalEdit(candidateId);
    setStatusState(next === 'none' ? undefined : next);
  };

  const activeStatusKey: CycleStatus = statusState ?? 'none';
  const s = STATUS_STYLES[activeStatusKey];
  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.8rem",
    padding: "6px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    color: s.color,
    background: s.bg,
    border: `1px solid ${s.border}`,
  };
  const dotStyle: React.CSSProperties = {
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: s.color,
    flexShrink: 0,
  };

  return (
    <button
      type="button"
      onClick={cycleStatus}
      style={pillStyle}
      title="Click to cycle status (controls client visibility): New → Active → Rejected → Hold → No status"
    >
      <span style={dotStyle} aria-hidden="true" />
      {!statusState || statusState === 'none'
        ? 'Set status'
        : statusState.charAt(0).toUpperCase() + statusState.slice(1)}
    </button>
  );
}
