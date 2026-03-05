"use client";

import { useEffect } from "react";

interface TabNavigationProps {
  current: 1 | 2 | 3;
  onChange: (panel: 1 | 2 | 3) => void;
}

const TABS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: "Scope" },
  { id: 2, label: "Criteria" },
  { id: 3, label: "Compensation" },
];

export default function TabNavigation({ current, onChange }: TabNavigationProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft" && current > 1) {
        e.preventDefault();
        onChange((current - 1) as 1 | 2 | 3);
      }
      if (e.key === "ArrowRight" && current < 3) {
        e.preventDefault();
        onChange((current + 1) as 1 | 2 | 3);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, onChange]);

  return (
    <div
      className="font-outfit"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderTop: "1px solid var(--ss-border)",
        background: "var(--ss-cream)",
        height: "38px",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderBottom: tab.id === current
              ? "2px solid var(--ss-gold)"
              : "2px solid transparent",
            borderRight: i < TABS.length - 1
              ? "1px solid rgba(0,0,0,0.06)"
              : "none",
            color: tab.id === current ? "var(--ss-gold-deep)" : "var(--ss-gray-light)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseOver={(e) => {
            if (tab.id !== current) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
          }}
          onMouseOut={(e) => {
            if (tab.id !== current) (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)";
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
