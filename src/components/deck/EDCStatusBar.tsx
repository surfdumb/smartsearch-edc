"use client";

import { useState } from "react";
import type { EDCState } from "@/hooks/useEDCState";

interface EDCStatusBarProps {
  state: EDCState;
  candidateId: string;
  searchId: string;
  candidateName: string;
  roleTitle: string;
  onLock: () => void | Promise<void>;
  onUnlock: () => void;
  onReset?: () => void;
}

export default function EDCStatusBar({
  state,
  candidateId,
  searchId,
  candidateName,
  roleTitle,
  onLock,
  onUnlock,
  onReset,
}: EDCStatusBarProps) {
  const [showLockModal, setShowLockModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/search/${searchId}/edc/${candidateId}`
      : "";

  const handleLockConfirm = async () => {
    await onLock();
    setShowLockModal(false);
    setShowShareDialog(true);
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
      `Please find the Executive Decision Card for ${candidateName} below.\n\n${shareUrl}\n\nPassword: ExecFlow2026!\n\nThis card is confidential and for your review only.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <>
      {/* Status bar */}
      <div
        style={{
          maxWidth: "820px",
          margin: "0 auto 8px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Left: state badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {state === "draft" ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--ss-yellow)",
                background: "rgba(201,149,58,0.1)",
                border: "1px solid rgba(201,149,58,0.25)",
                borderRadius: "6px",
                padding: "4px 10px",
              }}
            >
              <span style={{ fontSize: "0.6rem" }}>●</span>
              Draft — Awaiting Review
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--ss-green)",
                background: "rgba(74,124,89,0.1)",
                border: "1px solid rgba(74,124,89,0.25)",
                borderRadius: "6px",
                padding: "4px 10px",
              }}
            >
              🔒 Locked
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {state === "draft" && onReset && (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.72rem",
                fontWeight: 500,
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                letterSpacing: "0.3px",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              ↺ Reset Edits
            </button>
          )}
          {state === "draft" ? (
            <button
              onClick={() => setShowLockModal(true)}
              style={{
                background: "rgba(197,165,114,0.1)",
                border: "1px solid rgba(197,165,114,0.35)",
                color: "var(--ss-gold)",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                letterSpacing: "0.3px",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.18)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.1)";
              }}
            >
              Lock &amp; Share →
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowShareDialog(true)}
                style={{
                  background: "rgba(74,124,89,0.1)",
                  border: "1px solid rgba(74,124,89,0.3)",
                  color: "var(--ss-green)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "6px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  letterSpacing: "0.3px",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,124,89,0.18)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,124,89,0.1)";
                }}
              >
                Copy Link
              </button>
              <button
                onClick={onUnlock}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  letterSpacing: "0.3px",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                Unlock &amp; Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Lock confirm modal ── */}
      {showLockModal && (
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
          onClick={() => setShowLockModal(false)}
        >
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(197,165,114,0.2)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(197,165,114,0.1)",
                border: "1px solid rgba(197,165,114,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: "1.4rem",
              }}
            >
              🔒
            </div>
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
              Lock &amp; share this deck?
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.6,
                marginBottom: "28px",
              }}
            >
              Locking marks the entire deck as ready for client review.
              All cards will be shared. You can unlock and edit again at any time.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setShowLockModal(false)}
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
                onClick={handleLockConfirm}
                style={{
                  background: "rgba(197,165,114,0.12)",
                  border: "1px solid rgba(197,165,114,0.4)",
                  color: "var(--ss-gold)",
                  padding: "10px 28px",
                  borderRadius: "10px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.2)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.12)";
                }}
              >
                Lock &amp; Share
              </button>
            </div>
          </div>
        </div>
      )}

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

            <p
              style={{
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.2)",
                textAlign: "center",
                marginTop: "16px",
                lineHeight: 1.5,
              }}
            >
              Password: <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>ExecFlow2026!</span>
            </p>
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
