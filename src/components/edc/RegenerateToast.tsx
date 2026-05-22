"use client";

import { useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error" | "warning";

interface ToastPayload {
  kind?: ToastKind;
  candidateName?: string;
  message?: string;
}

/**
 * Listens on window for the 'regenerate-toast' CustomEvent dispatched by the
 * card-level RegenerateButton, the deck-level bulk handler, and the Review
 * Changes modal. Renders a brief confirmation toast bottom-right.
 *
 * Mount once high in the tree (DeckClient) so it persists across view changes
 * (brief ↔ grid ↔ edc).
 */
export default function RegenerateToast() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail ?? {};
      setToast(detail);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, 3600);
    };
    window.addEventListener("regenerate-toast", handler);
    return () => {
      window.removeEventListener("regenerate-toast", handler);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!toast) return null;

  const kind = toast.kind ?? "success";
  const accentColor =
    kind === "error" ? "#b85450" : kind === "warning" ? "#c9953a" : "#4a7c4a";
  const accentSymbol = kind === "error" ? "✕" : kind === "warning" ? "!" : "✓";

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 10000,
          background: "#faf8f5",
          border: `1px solid ${accentColor}66`,
          borderRadius: 8,
          padding: "12px 16px",
          boxShadow: "0 4px 14px rgba(26,26,26,0.12)",
          fontFamily: "var(--font-outfit), Inter, system-ui, sans-serif",
          fontSize: 14,
          color: "#2d2824",
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 240,
          maxWidth: 360,
          animation: "regenerateToastIn 180ms ease-out",
        }}
      >
        <span style={{ color: accentColor, fontSize: 16, lineHeight: 1, fontWeight: 700 }}>
          {accentSymbol}
        </span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, flex: 1 }}>
          <span style={{ fontWeight: 500 }}>{toast.message ?? "Done"}</span>
          {toast.candidateName && (
            <span style={{ color: "rgba(45,40,36,0.6)", fontSize: 12 }}>
              {toast.candidateName}
            </span>
          )}
        </div>
      </div>
      <style>{`@keyframes regenerateToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
