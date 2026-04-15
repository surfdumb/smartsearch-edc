"use client";

import { useState } from "react";
import type { SearchContext } from "@/lib/types";
import { EditorContext } from "@/contexts/EditorContext";
import EditableField from "@/components/edc/EditableField";
import "@/styles/job-summary-print.css";

interface JobSummaryBriefProps {
  data: SearchContext;
  isEditMode: boolean;
  searchId: string;
  isFullPage?: boolean; // State 1 (no candidates) vs State 2/3 (tab view)
}

// ─── Section divider ────────────────────────────────────────────────────────

function GoldRule() {
  return (
    <div
      className="js-brief-gold-rule"
      style={{
        height: "1px",
        background: "var(--ss-gold, #c5a572)",
        opacity: 0.35,
        margin: "28px 0",
      }}
    />
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="js-brief-section" style={{ marginBottom: "4px" }}>
      <h3
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          color: "var(--ss-gold, #c5a572)",
          marginBottom: "14px",
        }}
      >
        {label}
      </h3>
      {children}
    </div>
  );
}

// ─── Role Profile row ───────────────────────────────────────────────────────

function ProfileRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        padding: "8px 0",
        borderBottom: "1px solid rgba(197,165,114,0.08)",
      }}
    >
      <span
        style={{
          width: "140px",
          flexShrink: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#1a1a1a",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: "#3a3a3a", lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  );
}

// ─── Compensation row ───────────────────────────────────────────────────────

function CompRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid rgba(197,165,114,0.08)",
      }}
    >
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1a1a1a" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function JobSummaryBrief({
  data,
  isEditMode,
  searchId,
  isFullPage = false,
}: JobSummaryBriefProps) {
  const js = data.job_summary_data;
  const [showIntel, setShowIntel] = useState(false);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  if (!js) return null;

  const hasCompData =
    js.budget_base || js.budget_bonus || js.budget_lti || js.budget_di;
  const hasProfileData =
    data.client_location ||
    js.line_manager ||
    js.team_size ||
    js.remit ||
    js.confidentiality;
  const hasInternalData =
    js.red_flag_title ||
    js.red_flag_detail ||
    js.predecessor_context ||
    js.candidate_messaging ||
    js.additional_internal_notes;

  // ── Debounced save for Brief edits ──────────────────────────────────────

  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const handleFieldSave = (field: string, value: string) => {
    // Clear any existing timer for this field
    const existing = saveTimers.get(field);
    if (existing) clearTimeout(existing);

    setSavingFields((prev) => new Set(prev).add(field));

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/deck/${searchId}/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
      } catch (err) {
        console.error("[brief-save] Failed:", err);
      } finally {
        setSavingFields((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }
      saveTimers.delete(field);
    }, 2000);

    saveTimers.set(field, timer);
  };

  // Derive display values
  const roleTitle =
    js.position || data.role_title || data.search_name || "Role Brief";
  const companyName =
    data.client_display_name || data.client_company || "";
  const flashParts = [companyName, js.revenue, data.client_location].filter(
    Boolean
  );

  return (
    <EditorContext.Provider value={{ isEditable: isEditMode }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          background: "#1a1816",
        }}
      >
        {/* ── Main Brief document ──────────────────────────────────── */}
        <div
          className="js-brief-container"
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            padding: isFullPage ? "40px 24px 60px" : "32px 24px 48px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              width: "100%",
              background: "#faf8f5",
              borderRadius: "12px",
              padding: "48px 56px",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div
              className="js-brief-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--ss-gold, #c5a572)",
                  letterSpacing: "0.5px",
                }}
              >
                Job Summary
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/Logos_SmartSearch_SecondarySymbol_Gold.png"
                alt="SmartSearch"
                style={{ height: "36px", opacity: 0.7 }}
              />
            </div>

            <GoldRule />

            {/* ── Role Title ─────────────────────────────────────── */}
            <h1
              className="font-cormorant"
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.15,
                marginBottom: "8px",
                letterSpacing: "-0.3px",
              }}
            >
              {roleTitle}
            </h1>

            {/* Flash bio bar */}
            {flashParts.length > 0 && (
              <p
                style={{
                  fontSize: "0.88rem",
                  color: "#6b6b6b",
                  marginBottom: "0",
                }}
              >
                {flashParts.join("  |  ")}
              </p>
            )}

            <GoldRule />

            {/* ── Role Profile table ─────────────────────────────── */}
            {hasProfileData && (
              <>
                <Section label="Role Profile">
                  <div>
                    <ProfileRow label="Location" value={data.client_location} />
                    <ProfileRow label="Line Manager" value={js.line_manager} />
                    <ProfileRow label="Team Size" value={js.team_size} />
                    <ProfileRow label="Remit" value={js.remit} />
                    <ProfileRow
                      label="Confidentiality"
                      value={js.confidentiality}
                    />
                  </div>
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Core Mission ────────────────────────────────────── */}
            {js.core_mission && (
              <>
                <Section label="Core Mission">
                  {isEditMode ? (
                    <EditableField
                      value={js.core_mission}
                      as="p"
                      html={false}
                      style={{
                        fontSize: "0.88rem",
                        color: "#3a3a3a",
                        lineHeight: 1.65,
                        fontStyle: "italic",
                      }}
                      onUpdate={(v) => handleFieldSave("core_mission", v)}
                    />
                  ) : (
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: "#3a3a3a",
                        lineHeight: 1.65,
                        fontStyle: "italic",
                      }}
                    >
                      {js.core_mission}
                    </p>
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Why Is This Role Open? ──────────────────────────── */}
            {js.why_open && (
              <>
                <Section label="Why Is This Role Open?">
                  {isEditMode ? (
                    <EditableField
                      value={js.why_open}
                      as="p"
                      html={false}
                      style={{
                        fontSize: "0.85rem",
                        color: "#3a3a3a",
                        lineHeight: 1.6,
                      }}
                      onUpdate={(v) => handleFieldSave("why_open", v)}
                    />
                  ) : (
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#3a3a3a",
                        lineHeight: 1.6,
                      }}
                    >
                      {js.why_open}
                    </p>
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Key Criteria ────────────────────────────────────── */}
            {js.key_criteria_detailed &&
              js.key_criteria_detailed.length > 0 && (
                <>
                  <Section label="Key Criteria">
                    <ol
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        counterReset: "criteria",
                      }}
                    >
                      {js.key_criteria_detailed.map((kc, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "14px",
                            lineHeight: 1.55,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--ss-gold, #c5a572)",
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              minWidth: "18px",
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}.
                          </span>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                color: "#1a1a1a",
                              }}
                            >
                              {kc.name}
                            </span>
                            {kc.detail && (
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#4a4a4a",
                                }}
                              >
                                {" "}
                                &mdash; {kc.detail}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </Section>
                  <GoldRule />
                </>
              )}

            {/* ── Key Responsibilities ────────────────────────────── */}
            {js.key_responsibilities && (
              <>
                <Section label="Key Responsibilities">
                  {isEditMode ? (
                    <EditableField
                      value={js.key_responsibilities}
                      as="div"
                      html={false}
                      style={{
                        fontSize: "0.85rem",
                        color: "#3a3a3a",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                      onUpdate={(v) =>
                        handleFieldSave("key_responsibilities", v)
                      }
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#3a3a3a",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {js.key_responsibilities}
                    </div>
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Compensation Framework ──────────────────────────── */}
            {hasCompData && (
              <>
                <Section label="Compensation">
                  <div>
                    <CompRow label="Base Salary" value={js.budget_base} />
                    <CompRow label="Target Bonus" value={js.budget_bonus} />
                    <CompRow label="LTIP / MIP" value={js.budget_lti} />
                    <CompRow
                      label="Direct Investment"
                      value={js.budget_di}
                    />
                  </div>
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Closing message (State 1 only) ─────────────────── */}
            {isFullPage && (
              <div
                className="js-brief-closing-banner"
                style={{
                  textAlign: "center",
                  padding: "28px 24px",
                  margin: "12px 0 0",
                  borderTop: "1px solid rgba(197,165,114,0.15)",
                  borderBottom: "1px solid rgba(197,165,114,0.15)",
                  background: "rgba(197,165,114,0.03)",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b6b6b",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Candidates evaluated against these criteria will arrive as
                  they are finalised by the search team.
                </p>
              </div>
            )}

            {/* ── Footer ─────────────────────────────────────────── */}
            <div
              style={{
                marginTop: "32px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(197,165,114,0.2)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#a0a0a0",
                  marginBottom: "6px",
                }}
              >
                Confidential
              </p>
              {js.js_last_synced_at && (
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "#b0b0b0",
                    marginBottom: "6px",
                  }}
                >
                  Last updated:{" "}
                  {new Date(js.js_last_synced_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <p
                style={{
                  fontSize: "0.62rem",
                  color: "#c0c0c0",
                  margin: 0,
                }}
              >
                SmartSearch Executive Recruitment &middot;
                smartsearchexec.com
              </p>
            </div>

            {/* ── Save indicator ──────────────────────────────────── */}
            {savingFields.size > 0 && (
              <div
                className="js-brief-edit-controls"
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "56px",
                  fontSize: "0.65rem",
                  color: "var(--ss-gold, #c5a572)",
                  opacity: 0.7,
                }}
              >
                Saving...
              </div>
            )}
          </div>
        </div>

        {/* ── Internal Intelligence panel (edit mode only) ──────── */}
        {isEditMode && hasInternalData && (
          <>
            {/* Toggle button */}
            <button
              className="js-brief-edit-controls"
              onClick={() => setShowIntel(!showIntel)}
              style={{
                position: "fixed",
                top: "60px",
                right: showIntel ? "332px" : "12px",
                zIndex: 50,
                background: "rgba(201,149,58,0.12)",
                border: "1px solid rgba(201,149,58,0.3)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--ss-yellow, #c9953a)",
                cursor: "pointer",
                transition: "right 0.25s ease",
                whiteSpace: "nowrap",
              }}
            >
              {showIntel ? "Hide" : "Internal"} Intelligence
            </button>

            {/* Panel */}
            {showIntel && (
              <div
                className="js-brief-internal-panel"
                style={{
                  width: "320px",
                  minWidth: "320px",
                  background: "rgba(45,40,36,0.95)",
                  borderLeft: "1px solid rgba(201,149,58,0.15)",
                  padding: "24px 20px",
                  overflowY: "auto",
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "rgba(201,149,58,0.6)",
                    marginBottom: "4px",
                  }}
                >
                  Internal Intelligence
                </p>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "20px",
                    fontStyle: "italic",
                  }}
                >
                  Not visible to clients
                </p>

                {/* Red Flags */}
                {(js.red_flag_title || js.red_flag_detail) && (
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "rgba(201,149,58,0.8)",
                        marginBottom: "6px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Hard Requirements &amp; Red Flags
                    </p>
                    {js.red_flag_title && (
                      <p
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: "4px",
                        }}
                      >
                        {js.red_flag_title}
                      </p>
                    )}
                    {js.red_flag_detail && (
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "rgba(255,255,255,0.55)",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {js.red_flag_detail}
                      </p>
                    )}
                  </div>
                )}

                {/* Predecessor Context */}
                {js.predecessor_context && (
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "rgba(201,149,58,0.8)",
                        marginBottom: "6px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Predecessor Context
                    </p>
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {js.predecessor_context}
                    </p>
                  </div>
                )}

                {/* Candidate Messaging */}
                {js.candidate_messaging && (
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "rgba(201,149,58,0.8)",
                        marginBottom: "6px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Candidate Messaging
                    </p>
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {js.candidate_messaging}
                    </p>
                  </div>
                )}

                {/* Additional Intelligence */}
                {js.additional_internal_notes && (
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "rgba(201,149,58,0.8)",
                        marginBottom: "6px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Additional Intelligence
                    </p>
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {js.additional_internal_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </EditorContext.Provider>
  );
}
