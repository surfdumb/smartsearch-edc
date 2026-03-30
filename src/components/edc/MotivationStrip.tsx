"use client";

import { useState, useCallback } from "react";
import { useEditorContext } from "@/contexts/EditorContext";

interface MotivationStripProps {
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];
  motivation?: string;
  our_take_fragments?: string[];
}

export default function MotivationStrip({
  why_interested,
  motivation,
  our_take_fragments,
}: MotivationStripProps) {
  const { isEditable } = useEditorContext();

  // Build fragments array from available motivation data
  const buildFragments = useCallback((): string[] => {
    const frags: string[] = [];
    if (motivation && motivation.trim()) frags.push(motivation.trim());
    for (const item of why_interested) {
      const h = item.headline?.trim();
      // Filter out placeholder text
      if (h && h !== 'See candidate overview' && h !== 'Not mentioned') frags.push(h);
    }
    // Include any motivation-adjacent our_take_fragments
    if (our_take_fragments) {
      for (const f of our_take_fragments) {
        if (f && f.trim() && !frags.includes(f.trim())) frags.push(f.trim());
      }
    }
    return frags;
  }, [why_interested, motivation, our_take_fragments]);

  const fragments = buildFragments();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customText, setCustomText] = useState<string | null>(null);

  if (fragments.length === 0) return null;

  const displayText = customText !== null ? customText : (fragments[currentIndex % fragments.length] || "");
  const isModified = customText !== null;

  const handleRefresh = () => {
    setCustomText(null);
    setCurrentIndex(prev => (prev + 1) % fragments.length);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    setCustomText(null);
    setCurrentIndex(0);
  };

  return (
    <div
      style={{
        background: "var(--ss-header-bg)",
        padding: "6px 32px 14px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {isEditable ? (
        <p
          contentEditable
          suppressContentEditableWarning
          className="editable-cell"
          onBlur={(e) => {
            const raw = e.currentTarget.textContent || "";
            // Strip the "Motivation — " prefix if the user left it
            const stripped = raw.replace(/^Motivation\s*[—–-]\s*/i, "").trim();
            if (stripped !== displayText) setCustomText(stripped);
          }}
          style={{
            fontSize: "0.85rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
            margin: 0,
            flex: 1,
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: "var(--font-outfit), Outfit, sans-serif",
          }}
        >
          <strong style={{ fontWeight: 600 }}>Motivation</strong> — {displayText}
        </p>
      ) : (
        <p
          style={{
            fontSize: "0.85rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
            margin: 0,
            flex: 1,
            fontFamily: "var(--font-outfit), Outfit, sans-serif",
          }}
        >
          <strong style={{ fontWeight: 600 }}>Motivation</strong> — {displayText}
        </p>
      )}

      {/* Reset dot — edit mode only, visible when modified */}
      {isEditable && isModified && (
        <button
          onMouseDown={handleReset}
          title="Reset to original"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#C5A572",
            border: "none",
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
            opacity: 0.6,
            transition: "opacity 0.2s, transform 0.2s",
          }}
          onMouseOver={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "1"; b.style.transform = "scale(1.5)"; }}
          onMouseOut={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "0.6"; b.style.transform = "scale(1)"; }}
        />
      )}

      {/* Refresh/cycle button — edit mode only */}
      {isEditable && fragments.length > 1 && (
        <button
          onClick={handleRefresh}
          title="Cycle motivation hook"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            lineHeight: 1,
            flexShrink: 0,
            opacity: 0.4,
            transition: "opacity 0.15s, transform 0.3s",
            color: "var(--ss-gold)",
            fontSize: "0.8rem",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.4";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
