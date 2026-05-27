"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface CopyLinkButtonProps {
  candidateId: string;
  searchId: string;
  candidateName: string;
  roleTitle: string;
  /** Flush pending localStorage edits to the server before opening the share
   *  dialog. Preserves the flush-before-share guarantee Lock & Share used to
   *  provide. */
  onFlushEdits: () => void | Promise<void>;
}

export default function CopyLinkButton({
  candidateId,
  searchId,
  candidateName,
  roleTitle,
  onFlushEdits,
}: CopyLinkButtonProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guard against SSR hydration mismatch — document.body isn't available on
  // the server, and createPortal requires it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/search/${searchId}/edc/${candidateId}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: the input field has click-to-select for manual copy.
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`EDC: ${candidateName} — ${roleTitle}`);
    const body = encodeURIComponent(
      `Please find the Executive Decision Card for ${candidateName} below.\n\n${shareUrl}\n\nThis card is confidential and for your review only.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleOpen = async () => {
    // Best-effort flush — if the save errors we still open the dialog so the
    // consultant isn't blocked from sharing.
    try {
      await onFlushEdits();
    } catch {
      /* fall through */
    }
    setShowShareDialog(true);
  };

  const dialog = (
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
              onClick={handleCopy}
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

        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "20px 0" }} />

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
  );

  return (
    <>
      <button
        onClick={handleOpen}
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
        ⧉ Copy Link
      </button>
      {mounted && showShareDialog && createPortal(dialog, document.body)}
    </>
  );
}
