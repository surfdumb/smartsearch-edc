"use client";

import { useEffect } from "react";

interface SplitToggleProps {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function SplitToggle({ active, onToggle, disabled }: SplitToggleProps) {
  // Keyboard shortcut: S key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);

  if (disabled) return null;

  return (
    <button
      onClick={onToggle}
      title="Toggle CV Split View (S)"
      style={{
        background: active ? "rgba(197, 165, 114, 0.15)" : "transparent",
        border: "1px solid rgba(197, 165, 114, 0.3)",
        color: "var(--ss-gold)",
        fontSize: "0.8rem",
        padding: "6px 14px",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      📄 {active ? "Close Split" : "CV Split View"}
    </button>
  );
}
