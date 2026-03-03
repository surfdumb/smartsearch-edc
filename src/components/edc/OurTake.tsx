"use client";

import { useState, useEffect } from "react";
import { useEditorContext } from "@/contexts/EditorContext";
import EditableField from "@/components/edc/EditableField";
import OurTakeSourcePanel from "@/components/edc/OurTakeSourcePanel";

interface OurTakeResult {
  text: string;
  recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';
  discussion_points?: string[];
  ai_rationale?: string;
}

interface OurTakeProps {
  text: string;
  recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';
  discussion_points?: string[];
  original_note?: string;
  ai_rationale?: string;
  isConsultantView?: boolean;
  candidateId?: string;
  candidateContext?: string;
  onOurTakeGenerated?: (result: OurTakeResult & { original_note?: string }) => void;
}

function ourTakeHiddenKey(id: string) {
  return `edc_ourtake_hidden_${id}`;
}

const BADGE_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  ADVANCE: {
    bg: "rgba(74, 124, 89, 0.08)",
    border: "#4a7c59",
    color: "#4a7c59",
    label: "ADVANCE",
  },
  HOLD: {
    bg: "rgba(201, 149, 58, 0.08)",
    border: "#c9953a",
    color: "#c9953a",
    label: "HOLD",
  },
  PASS: {
    bg: "rgba(184, 84, 80, 0.08)",
    border: "#b85450",
    color: "#b85450",
    label: "PASS",
  },
};

export default function OurTake({
  text,
  recommendation,
  discussion_points,
  original_note,
  ai_rationale,
  isConsultantView = false,
  candidateId,
  candidateContext,
  onOurTakeGenerated,
}: OurTakeProps) {
  const { isEditable } = useEditorContext();
  const [isHidden, setIsHidden] = useState(false);
  const [notesInput, setNotesInput] = useState(original_note || "");
  const [notesExpanded, setNotesExpanded] = useState(!text || text.length === 0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Reset all state when candidate changes (Prev/Next navigation)
  useEffect(() => {
    setNotesInput(original_note || "");
    setNotesExpanded(!text || text.length === 0);
    setGenError(null);
    if (!candidateId) return;
    try {
      setIsHidden(localStorage.getItem(ourTakeHiddenKey(candidateId)) === "true");
    } catch { /* ignore */ }
  }, [candidateId, original_note, text]);

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    if (candidateId) {
      try { localStorage.setItem(ourTakeHiddenKey(candidateId), String(next)); } catch { /* ignore */ }
    }
  };

  // Client view + hidden → nothing rendered
  if (isHidden && !isEditable) return null;

  // Edit mode + hidden → collapsed placeholder
  if (isHidden && isEditable) {
    return (
      <section
        style={{
          padding: "16px 48px",
          background: "linear-gradient(180deg, var(--ss-warm-tint) 0%, white 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              color: "var(--ss-gray-pale)",
            }}
          >
            Our Take
          </span>
          <button
            onClick={toggleHidden}
            style={{
              background: "transparent",
              border: "1px solid rgba(74,124,89,0.25)",
              color: "rgba(74,124,89,0.6)",
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(74,124,89,0.06)";
              b.style.color = "var(--ss-green)";
            }}
            onMouseOut={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color = "rgba(74,124,89,0.6)";
            }}
          >
            Show section ↓
          </button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--ss-gray-pale)", fontStyle: "italic", marginTop: "6px" }}>
          Hidden from client view
        </p>
      </section>
    );
  }

  const hasContent = text && text.length > 0;
  const badge = recommendation ? BADGE_STYLES[recommendation] : null;
  const canGenerate = isConsultantView && candidateContext && onOurTakeGenerated;

  // Client view with no content → don't show empty shell
  if (!hasContent && !isConsultantView) return null;

  const handleGenerate = async () => {
    if (!candidateContext || !onOurTakeGenerated) return;
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch("/api/generate-our-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateContext,
          manualNotes: notesInput,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const result = await res.json();
      onOurTakeGenerated({
        text: result.text,
        recommendation: result.recommendation,
        discussion_points: result.discussion_points,
        ai_rationale: result.ai_rationale,
        original_note: notesInput || undefined,
      });
      setNotesExpanded(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate — please try again";
      setGenError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section
      style={{
        padding: "36px 48px 40px",
        background: "linear-gradient(180deg, var(--ss-warm-tint) 0%, white 100%)",
        position: "relative",
      }}
    >
      {/* Section header */}
      <div className="flex items-center mb-6" style={{ gap: "10px" }}>
        <span style={{ color: "var(--ss-gold)", fontSize: "1.1rem" }}>&#10022;</span>
        <span
          className="font-cormorant"
          style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--ss-dark)" }}
        >
          Our Take
        </span>
        {/* Recommendation badge */}
        {badge && (
          <span
            style={{
              marginLeft: "auto",
              padding: "4px 14px",
              borderRadius: "6px",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              background: badge.bg,
              border: `1.5px solid ${badge.border}`,
              color: badge.color,
            }}
          >
            {badge.label}
          </span>
        )}
        {/* Hide toggle — edit mode only */}
        {isEditable && (
          <button
            onClick={toggleHidden}
            style={{
              marginLeft: badge ? "8px" : "auto",
              background: "transparent",
              border: "1px solid rgba(74,124,89,0.2)",
              color: "rgba(74,124,89,0.55)",
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(74,124,89,0.06)";
              b.style.color = "var(--ss-green)";
            }}
            onMouseOut={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color = "rgba(74,124,89,0.55)";
            }}
          >
            Hide from client ↑
          </button>
        )}
      </div>

      {/* Our Take card — green-bordered */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #4a7c59",
          boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {hasContent ? (
          <>
            {/* Main assessment text */}
            <div style={{ padding: "22px 28px" }}>
              {isEditable ? (
                <EditableField
                  value={text}
                  as="div"
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--ss-gray)",
                    lineHeight: 1.8,
                    whiteSpace: "pre-line",
                  }}
                />
              ) : (
                <div>
                  {text.split("\n\n").map((para, i) => {
                    // Bold the lead phrase only when separator appears before the first period.
                    // This avoids mid-sentence dashes being treated as structural separators.
                    const periodIdx = para.indexOf(".");
                    const dashIdx = para.indexOf(" \u2014 "); // " — "
                    const colonIdx = para.indexOf(": ");

                    let lead = "";
                    let rest = para;

                    const useDash =
                      dashIdx !== -1 &&
                      (colonIdx === -1 || dashIdx <= colonIdx) &&
                      (periodIdx === -1 || dashIdx < periodIdx);

                    const useColon =
                      !useDash &&
                      colonIdx !== -1 &&
                      (periodIdx === -1 || colonIdx < periodIdx);

                    if (useDash) {
                      lead = para.slice(0, dashIdx);
                      rest = para.slice(dashIdx);
                    } else if (useColon) {
                      lead = para.slice(0, colonIdx + 1); // include colon in bold
                      rest = para.slice(colonIdx + 1);
                    }

                    return (
                      <p
                        key={i}
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--ss-gray)",
                          lineHeight: 1.8,
                          marginTop: i > 0 ? "1rem" : 0,
                        }}
                      >
                        {lead ? (
                          <>
                            <strong style={{ color: "var(--ss-dark)", fontWeight: 600 }}>{lead}</strong>
                            {rest}
                          </>
                        ) : para}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discussion points */}
            {discussion_points && discussion_points.length > 0 && (
              <div
                style={{
                  padding: "0 28px 20px",
                  borderTop: "1px solid var(--ss-border-light)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "var(--ss-gray-light)",
                    marginTop: "16px",
                    marginBottom: "10px",
                  }}
                >
                  Discussion Points
                </p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {discussion_points.map((point, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--ss-gray)",
                        lineHeight: 1.7,
                        marginBottom: "4px",
                      }}
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          /* Empty state — no Our Take yet */
          <div
            style={{
              padding: "36px 28px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--ss-gray-light)",
                fontStyle: "italic",
                marginBottom: "8px",
              }}
            >
              No assessment generated yet.
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--ss-gray-pale)",
              }}
            >
              Add your consultant notes below and click &ldquo;Generate Our Take&rdquo; to create a structured assessment.
            </p>
          </div>
        )}
      </div>

      {/* Generate Our Take — consultant view only */}
      {canGenerate && (
        <div style={{ marginTop: "16px" }}>
          {/* Notes input toggle + textarea */}
          <div
            style={{
              border: "1px solid var(--ss-border)",
              borderRadius: "12px",
              overflow: "hidden",
              background: "white",
            }}
          >
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              style={{
                width: "100%",
                padding: "12px 20px",
                background: "var(--ss-warm-tint)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem" }}>📝</span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "var(--ss-gray)",
                  }}
                >
                  Consultant Notes
                </span>
                {notesInput.trim().length > 0 && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--ss-green)",
                      fontWeight: 500,
                    }}
                  >
                    ({notesInput.trim().split(/\s+/).length} words)
                  </span>
                )}
              </div>
              <span style={{ color: "var(--ss-gray-light)", fontSize: "0.85rem" }}>
                {notesExpanded ? "\u2212" : "+"}
              </span>
            </button>

            {notesExpanded && (
              <div style={{ padding: "16px 20px" }}>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  disabled={generating}
                  placeholder={`Write your raw, uninhibited notes here...\n\nExamples:\n\u2022 "He's a builder, not a polished corporate type"\n\u2022 "Concerned about the network gap outside Boston"\n\u2022 "One to watch — surprisingly strong on deal structuring"\n\u2022 "Worth advancing but client needs to decide on independence question"\n\nThese notes are NEVER shown to clients.`}
                  style={{
                    width: "100%",
                    minHeight: "140px",
                    padding: "14px 16px",
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    color: "var(--ss-dark)",
                    background: "var(--ss-warm-tint)",
                    border: "1px solid var(--ss-border)",
                    borderRadius: "8px",
                    resize: "vertical",
                    outline: "none",
                    opacity: generating ? 0.5 : 1,
                  }}
                />
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--ss-gray-light)",
                    marginTop: "8px",
                    fontStyle: "italic",
                  }}
                >
                  These notes are private. They are used to generate the professional
                  &ldquo;Our Take&rdquo; but are never visible in the client-facing card.
                </p>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                background: generating
                  ? "var(--ss-gold-pale)"
                  : "linear-gradient(135deg, var(--ss-gold) 0%, var(--ss-gold-deep) 100%)",
                color: generating ? "var(--ss-gray)" : "#1a1a1a",
                border: "none",
                padding: "10px 28px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.5px",
                cursor: generating ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: generating
                  ? "none"
                  : "0 2px 8px rgba(197, 165, 114, 0.3)",
              }}
            >
              {generating ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      border: "2px solid var(--ss-gray-light)",
                      borderTopColor: "var(--ss-gold-deep)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <span style={{ fontSize: "0.9rem" }}>&#10022;</span>
                  {hasContent ? "Regenerate Our Take" : "Generate Our Take"}
                </>
              )}
            </button>

            {genError && (
              <span style={{ fontSize: "0.8rem", color: "var(--ss-yellow)" }}>
                {genError}
              </span>
            )}
          </div>

          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Source notes + AI rationale — consultant view only, never in client DOM */}
      {isConsultantView && (
        <OurTakeSourcePanel
          sourceNotes={original_note}
          aiRationale={ai_rationale}
        />
      )}
    </section>
  );
}
