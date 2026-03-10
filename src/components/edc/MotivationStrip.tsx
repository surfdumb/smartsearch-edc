"use client";

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
}: MotivationStripProps) {
  const { isEditable } = useEditorContext();

  // Build a single motivation hook: prefer explicit motivation field, else first headline
  const hookText = motivation?.trim()
    || (why_interested.length > 0 ? why_interested[0].headline.trim() : "");

  if (!hookText) return null;

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
          <strong style={{ fontWeight: 600 }}>Motivation</strong> — {hookText}
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
          <strong style={{ fontWeight: 600 }}>Motivation</strong> — {hookText}
        </p>
      )}
    </div>
  );
}
