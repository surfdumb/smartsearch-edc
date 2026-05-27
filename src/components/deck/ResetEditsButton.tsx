"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ResetEditsButtonProps {
  /** Used in the modal copy: "discard all changes to {name}'s card". */
  candidateName: string;
  onReset: () => void | Promise<void>;
}

export default function ResetEditsButton({ candidateName, onReset }: ResetEditsButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Guard against SSR hydration mismatch — document.body isn't available on the
  // server, and createPortal requires it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modal = (
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
      onClick={() => setShowConfirm(false)}
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
            onClick={() => setShowConfirm(false)}
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
              setShowConfirm(false);
              onReset();
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
  );

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
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
        Reset EDC
      </button>
      {mounted && showConfirm && createPortal(modal, document.body)}
    </>
  );
}
