"use client";

import { useEffect } from "react";

interface PageNavigationProps {
  current: number;
  total: number;
  onChange: (page: number) => void;
}

export default function PageNavigation({ current, total, onChange }: PageNavigationProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      // Only plain arrow keys — no shift (shift+arrows reserved for candidate nav)
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft" && current > 1) {
        e.preventDefault();
        onChange(current - 1);
      }
      if (e.key === "ArrowRight" && current < total) {
        e.preventDefault();
        onChange(current + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, total, onChange]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        height: "36px",
        padding: "0 48px",
      }}
    >
      {/* Left arrow */}
      <button
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current <= 1}
        style={{
          background: "transparent",
          border: "none",
          color: current <= 1 ? "var(--ss-gray-pale)" : "var(--ss-gray-light)",
          fontSize: "0.9rem",
          cursor: current <= 1 ? "default" : "pointer",
          padding: "4px 8px",
          transition: "color 0.15s",
          opacity: current <= 1 ? 0.4 : 1,
        }}
        onMouseOver={(e) => {
          if (current > 1) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = current <= 1 ? "var(--ss-gray-pale)" : "var(--ss-gray-light)";
        }}
      >
        ‹
      </button>

      {/* Dots */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: i + 1 === current ? "var(--ss-gold)" : "var(--ss-gray-pale)",
              transition: "background 0.2s, transform 0.2s",
              transform: i + 1 === current ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => current < total && onChange(current + 1)}
        disabled={current >= total}
        style={{
          background: "transparent",
          border: "none",
          color: current >= total ? "var(--ss-gray-pale)" : "var(--ss-gray-light)",
          fontSize: "0.9rem",
          cursor: current >= total ? "default" : "pointer",
          padding: "4px 8px",
          transition: "color 0.15s",
          opacity: current >= total ? 0.4 : 1,
        }}
        onMouseOver={(e) => {
          if (current < total) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = current >= total ? "var(--ss-gray-pale)" : "var(--ss-gray-light)";
        }}
      >
        ›
      </button>
    </div>
  );
}
