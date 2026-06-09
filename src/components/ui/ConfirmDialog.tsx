"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `gold` for reversible/merge-aware actions, `danger` for true overwrites. */
  tone?: "gold" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared confirm modal. Mirrors the dark portal dialog in ResetEditsButton so
 * the destructive-action language is consistent across the deck. Portals to
 * document.body with a high z-index (sits above the Our Take popover at 9999).
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "gold",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Guard against SSR hydration mismatch — createPortal needs document.body.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  const accent =
    tone === "danger"
      ? { fg: "var(--ss-red)", bg: "rgba(184,84,80,0.12)", bgHover: "rgba(184,84,80,0.2)", border: "rgba(184,84,80,0.4)" }
      : { fg: "var(--ss-gold)", bg: "rgba(197,165,114,0.14)", bgHover: "rgba(197,165,114,0.24)", border: "rgba(197,165,114,0.45)" };

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 11000,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onCancel}
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
          {title}
        </h2>
        <p
          style={{
            fontSize: "0.82rem",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          {body}
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={onCancel}
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
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: accent.bg,
              border: `1px solid ${accent.border}`,
              color: accent.fg,
              padding: "10px 28px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = accent.bgHover;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = accent.bg;
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
