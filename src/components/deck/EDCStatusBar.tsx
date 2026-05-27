"use client";

import { useState, useEffect } from "react";
import { markDirty, signalEdit } from "@/hooks/useAutoSave";

interface EDCStatusBarProps {
  candidateId: string;
  searchId: string;
  candidateName: string;
  roleTitle: string;
  /** Flush pending localStorage edits to the server. Awaited as a pre-flight before opening the share dialog (replaces the flush-before-share guarantee the old Lock & Share button provided). */
  onFlushEdits: () => void | Promise<void>;
  onReset?: () => void;
  /** Resolved current status from candidate.edc_data.status (or undefined for no-status). */
  status?: string;
}

// ── Status cycle (mirrors IntroCard.tsx:39–73; inlined here with a dark-theme
// palette tuned for the deck bar background. Extract to a shared
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
// reads as part of the toolbar's accent family rather than a separate ghost.
const STATUS_STYLES: Record<CycleStatus, { color: string; bg: string; border: string }> = {
  new:      { color: '#8db4d8',               bg: 'rgba(74,106,140,0.15)', border: 'rgba(74,106,140,0.30)' },
  active:   { color: '#8fc09a',               bg: 'rgba(74,124,89,0.15)',  border: 'rgba(74,124,89,0.30)' },
  rejected: { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.15)' },
  hold:     { color: '#e0b87a',               bg: 'rgba(201,149,58,0.15)', border: 'rgba(201,149,58,0.30)' },
  none:     { color: 'rgba(197,165,114,0.55)', bg: 'rgba(197,165,114,0.06)', border: 'rgba(197,165,114,0.20)' },
};

export default function EDCStatusBar({
  candidateId,
  searchId,
  candidateName,
  roleTitle,
  onFlushEdits,
  onReset,
  status,
}: EDCStatusBarProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local optimistic copy of status so the pill responds instantly to clicks
  // without waiting for the autosave roundtrip. Resets when the bar opens to a
  // different candidate (navigation between EDCs) or when the upstream prop
  // changes from a server refresh.
  const [statusState, setStatusState] = useState<CycleStatus | undefined>(() => normalizeStatus(status));
  useEffect(() => {
    setStatusState(normalizeStatus(status));
  }, [candidateId, status]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/search/${searchId}/edc/${candidateId}`
      : "";

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the input
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`EDC: ${candidateName} — ${roleTitle}`);
    const body = encodeURIComponent(
      `Please find the Executive Decision Card for ${candidateName} below.\n\n${shareUrl}\n\nThis card is confidential and for your review only.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleCopyLinkClick = async () => {
    // Preserve the flush-before-share guarantee the old Lock & Share button
    // provided. Best-effort — if the flush errors, still open the dialog so
    // the consultant isn't blocked from sharing.
    try {
      await onFlushEdits();
    } catch {
      /* fall through */
    }
    setShowShareDialog(true);
  };

  // ── Status pill styling — matches the SplitToggle / Copy Link / Reset Edits
  // dimensions (0.8rem / 6×14px / 8px radius / 1px border) so the three buttons
  // read as one toolbar. Only the accent colour varies by current state.
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
    <>
      {/* Status bar */}
      <div
        style={{
          maxWidth: "820px",
          margin: "0 auto 8px",
          padding: "0 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Left: status cycle pill — single source of truth for client visibility */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onReset && (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.8rem",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              ↺ Reset Edits
            </button>
          )}
          <button
            onClick={handleCopyLinkClick}
            style={{
              background: "rgba(74,124,89,0.15)",
              border: "1px solid rgba(74,124,89,0.3)",
              color: "var(--ss-green)",
              fontSize: "0.8rem",
              padding: "6px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,124,89,0.22)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,124,89,0.15)";
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* ── Share dialog ── */}
      {showShareDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setShowShareDialog(false)}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(197,165,114,0.2)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "480px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2
                  className="font-cormorant"
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.9)",
                    fontStyle: "italic",
                    marginBottom: "4px",
                  }}
                >
                  Share Card
                </h2>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.3px" }}>
                  {candidateName}
                </p>
              </div>
              <button
                onClick={() => setShowShareDialog(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ×
              </button>
            </div>

            {/* URL box */}
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: "8px",
                }}
              >
                Shareable link
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <input
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(197,165,114,0.15)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.55)",
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: copied ? "rgba(74,124,89,0.15)" : "rgba(197,165,114,0.1)",
                    border: `1px solid ${copied ? "rgba(74,124,89,0.4)" : "rgba(197,165,114,0.3)"}`,
                    color: copied ? "var(--ss-green)" : "var(--ss-gold)",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                    minWidth: "90px",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.06)",
                margin: "20px 0",
              }}
            />

            {/* Email button */}
            <button
              onClick={handleEmailShare}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(197,165,114,0.2)",
                color: "rgba(197,165,114,0.65)",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.4)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.65)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
              }}
            >
              <span style={{ fontSize: "1rem" }}>✉</span>
              Send via Email
            </button>

          </div>
        </div>
      )}

      {/* ── Reset confirmation ── */}
      {showResetConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(197,165,114,0.2)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="font-cormorant"
              style={{
                fontSize: "1.4rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                marginBottom: "10px",
                fontStyle: "italic",
              }}
            >
              Reset all edits?
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.6,
                marginBottom: "28px",
              }}
            >
              This will discard all changes to {candidateName}&rsquo;s card and restore the original data.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.4)",
                  padding: "10px 24px",
                  borderRadius: "10px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset?.();
                }}
                style={{
                  background: "rgba(184,84,80,0.12)",
                  border: "1px solid rgba(184,84,80,0.4)",
                  color: "var(--ss-red)",
                  padding: "10px 28px",
                  borderRadius: "10px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,84,80,0.2)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(184,84,80,0.12)";
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
