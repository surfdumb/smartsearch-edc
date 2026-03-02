"use client";

import { useState } from "react";

interface OurTakeSourcePanelProps {
  sourceNotes?: string;
  aiRationale?: string;
}

/**
 * Consultant-only panel shown below the Our Take box.
 * Displays the raw source notes that fed the AI generation,
 * and (when available) the AI's rationale for how it structured the output.
 *
 * This component must NEVER render in client view — the parent (OurTake)
 * is responsible for gating visibility with isConsultantView.
 */
export default function OurTakeSourcePanel({ sourceNotes, aiRationale }: OurTakeSourcePanelProps) {
  const [open, setOpen] = useState(true); // default open — consultants should see this

  if (!sourceNotes && !aiRationale) return null;

  // Split source notes on blank lines into separate quote blocks
  const noteBlocks = sourceNotes
    ? sourceNotes.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    : [];

  return (
    <div
      style={{
        marginTop: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(197,165,114,0.2)",
        borderLeft: "3px solid var(--ss-gold)",
        background: "var(--ss-warm-tint)",
        overflow: "hidden",
      }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--ss-gold-deep)",
          }}
        >
          Source Notes
        </span>
        <span
          style={{
            color: "var(--ss-gold)",
            fontSize: "0.75rem",
            transition: "transform 0.2s ease",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      {/* Body — smooth height via max-height transition */}
      <div
        style={{
          maxHeight: open ? "600px" : "0",
          overflow: "hidden",
          transition: "max-height 0.2s ease",
        }}
      >
        <div style={{ padding: "0 16px 14px" }}>

          {/* Source note blockquotes */}
          {noteBlocks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {noteBlocks.map((block, i) => (
                <blockquote
                  key={i}
                  style={{
                    margin: 0,
                    padding: "8px 14px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid rgba(197,165,114,0.12)",
                    position: "relative",
                  }}
                >
                  {/* Gold opening quote */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: "6px",
                      fontSize: "1.4rem",
                      lineHeight: 1,
                      color: "var(--ss-gold)",
                      opacity: 0.35,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    &ldquo;
                  </span>
                  <p
                    style={{
                      margin: 0,
                      paddingLeft: "14px",
                      fontSize: "0.82rem",
                      color: "var(--ss-gray)",
                      lineHeight: 1.65,
                      fontStyle: "italic",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {block}
                  </p>
                </blockquote>
              ))}
            </div>
          )}

          {/* AI Rationale */}
          {aiRationale && (
            <div
              style={{
                marginTop: noteBlocks.length > 0 ? "10px" : "0",
                paddingTop: noteBlocks.length > 0 ? "10px" : "0",
                borderTop: noteBlocks.length > 0 ? "1px solid rgba(197,165,114,0.12)" : "none",
              }}
            >
              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "var(--ss-gold-deep)",
                  marginBottom: "6px",
                }}
              >
                AI Rationale
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--ss-gray)",
                  lineHeight: 1.65,
                  fontStyle: "italic",
                }}
              >
                <span
                  style={{
                    color: "var(--ss-gold)",
                    marginRight: "6px",
                    fontSize: "0.7rem",
                  }}
                >
                  ✦
                </span>
                {aiRationale}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
