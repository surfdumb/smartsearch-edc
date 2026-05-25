"use client";

import { useEffect, useMemo } from "react";

export type EDCPanel = 1 | 2 | 3 | 4;

interface TabNavigationProps {
  current: EDCPanel;
  onChange: (panel: EDCPanel) => void;
  showNarrativeTab?: boolean;
}

const BASE_TABS: { id: EDCPanel; label: string }[] = [
  { id: 1, label: "Scope" },
  { id: 2, label: "Criteria" },
  { id: 3, label: "Compensation" },
];

const NARRATIVE_TAB: { id: EDCPanel; label: string } = { id: 4, label: "Narrative" };

export default function TabNavigation({
  current,
  onChange,
  showNarrativeTab = false,
}: TabNavigationProps) {
  const tabs = useMemo(
    () => (showNarrativeTab ? [...BASE_TABS, NARRATIVE_TAB] : BASE_TABS),
    [showNarrativeTab]
  );
  const maxId = tabs[tabs.length - 1].id;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft" && current > 1) {
        e.preventDefault();
        onChange((current - 1) as EDCPanel);
      }
      if (e.key === "ArrowRight" && current < maxId) {
        e.preventDefault();
        onChange((current + 1) as EDCPanel);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, onChange, maxId]);

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
      {tabs.map((tab, i) => (
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
            borderRight: i < tabs.length - 1
              ? "1px solid rgba(0,0,0,0.06)"
              : "none",
            color: tab.id === current ? "var(--ss-gold-deep)" : "var(--ss-gray-light)",
            fontSize: "0.75rem",
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
