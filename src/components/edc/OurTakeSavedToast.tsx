"use client";

import { useEffect, useRef, useState } from "react";

type ToastPayload = {
  candidateId?: string;
  candidateName?: string;
  savedAt?: string;
};

/**
 * Listens on window for the 'our-take-auto-saved' CustomEvent dispatched by
 * OurTakePopover's unmount-flush path. Renders a brief confirmation toast
 * bottom-right for ~3 seconds.
 *
 * Mount once at the deck level (DeckEDCView) so the listener persists across
 * candidate switches — the popover is dispatching the event as it unmounts,
 * so the listener cannot live inside the popover itself.
 */
export default function OurTakeSavedToast() {
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
      }, 3000);
    };
    window.addEventListener("our-take-auto-saved", handler);
    return () => {
      window.removeEventListener("our-take-auto-saved", handler);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!toast) return null;

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
          border: "1px solid rgba(197,165,114,0.6)",
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
          animation: "ourtakeToastIn 180ms ease-out",
        }}
      >
        <span style={{ color: "#4a7c4a", fontSize: 16, lineHeight: 1 }}>✓</span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <span style={{ fontWeight: 500 }}>Our Take saved</span>
          {toast.candidateName && (
            <span style={{ color: "rgba(45,40,36,0.6)", fontSize: 12 }}>
              {toast.candidateName}
            </span>
          )}
        </div>
      </div>
      <style>{`@keyframes ourtakeToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
