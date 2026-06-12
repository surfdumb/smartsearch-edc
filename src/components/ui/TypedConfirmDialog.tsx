"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TypedConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  /** Label above the input, e.g. "Operator key". */
  inputLabel: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Disables both buttons + shows the confirm label as working. */
  busy?: boolean;
  /** Server-side rejection (e.g. invalid operator key) — shown under the input. */
  errorText?: string | null;
  onConfirm: (typed: string) => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog's irreversible sibling: same dark portal scaffolding, plus a
 * typed input whose value is forwarded to onConfirm. Used for hard delete,
 * where the typed value is the operator key — the server is the authority,
 * so the dialog never validates the key locally, only requires it non-empty.
 */
export default function TypedConfirmDialog({
  open,
  title,
  body,
  inputLabel,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  errorText = null,
  onConfirm,
  onCancel,
}: TypedConfirmDialogProps) {
  // Guard against SSR hydration mismatch — createPortal needs document.body.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!mounted || !open) return null;

  const accent = {
    fg: "var(--ss-red)",
    bg: "rgba(184,84,80,0.12)",
    bgHover: "rgba(184,84,80,0.2)",
    border: "rgba(184,84,80,0.4)",
  };
  const confirmDisabled = busy || typed.trim() === "";

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
      onClick={busy ? undefined : onCancel}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(184,84,80,0.3)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "420px",
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
            marginBottom: "20px",
          }}
        >
          {body}
        </p>
        <label
          style={{
            display: "block",
            textAlign: "left",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "6px",
          }}
        >
          {inputLabel}
        </label>
        <input
          type="password"
          value={typed}
          autoFocus
          disabled={busy}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !confirmDisabled) onConfirm(typed);
          }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${errorText ? accent.border : "rgba(255,255,255,0.12)"}`,
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.85)",
            marginBottom: errorText ? "8px" : "24px",
            outline: "none",
          }}
        />
        {errorText && (
          <p
            style={{
              textAlign: "left",
              fontSize: "0.75rem",
              color: accent.fg,
              marginBottom: "16px",
            }}
          >
            {errorText}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.4)",
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(typed)}
            disabled={confirmDisabled}
            style={{
              background: accent.bg,
              border: `1px solid ${accent.border}`,
              color: accent.fg,
              padding: "10px 28px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: confirmDisabled ? "default" : "pointer",
              opacity: confirmDisabled ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              if (!confirmDisabled)
                (e.currentTarget as HTMLButtonElement).style.background = accent.bgHover;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = accent.bg;
            }}
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
