"use client";

import { useState, useRef, useCallback } from "react";
import type { SearchContext } from "@/lib/types";
import { EditorContext } from "@/contexts/EditorContext";
import EditableField from "@/components/edc/EditableField";
import "@/styles/job-summary-print.css";

interface JobSummaryBriefProps {
  data: SearchContext;
  isEditMode: boolean;
  searchId: string;
  isFullPage?: boolean;
}

type Criterion = { name: string; detail?: string; priority?: string };

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

// ─── Editable text field (inline, no label) ─────────────────────────────────

function BriefField({
  value,
  field,
  onSave,
  isEdit,
  style,
  as = "p",
}: {
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  isEdit: boolean;
  style?: React.CSSProperties;
  as?: "p" | "div" | "span";
}) {
  if (!value && !isEdit) return null;
  if (isEdit) {
    return (
      <EditableField
        value={value || ""}
        as={as}
        html={false}
        style={style}
        onUpdate={(v) => onSave(field, v)}
      />
    );
  }
  const Tag = as;
  return <Tag style={style}>{value}</Tag>;
}

// ─── Role Profile row (editable) ────────────────────────────────────────────

function ProfileRow({
  label,
  value,
  field,
  onSave,
  isEdit,
}: {
  label: string;
  value?: string;
  field?: string;
  onSave?: (field: string, value: string) => void;
  isEdit?: boolean;
}) {
  if (!value && !isEdit) return null;
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
      {isEdit && field && onSave ? (
        <EditableField
          value={value || ""}
          as="span"
          html={false}
          style={{ fontSize: "0.82rem", color: "#3a3a3a", lineHeight: 1.5, flex: 1 }}
          onUpdate={(v) => onSave(field, v)}
        />
      ) : (
        <span style={{ fontSize: "0.82rem", color: "#3a3a3a", lineHeight: 1.5 }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Compensation row (editable) ────────────────────────────────────────────

function CompRow({
  label,
  value,
  field,
  onSave,
  isEdit,
}: {
  label: string;
  value?: string;
  field?: string;
  onSave?: (field: string, value: string) => void;
  isEdit?: boolean;
}) {
  if (!value && !isEdit) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(197,165,114,0.08)",
      }}
    >
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a" }}>
        {label}
      </span>
      {isEdit && field && onSave ? (
        <EditableField
          value={value || ""}
          as="span"
          html={false}
          style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1a1a1a", textAlign: "right" as const }}
          onUpdate={(v) => onSave(field, v)}
        />
      ) : (
        <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1a1a1a" }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Internal panel field (editable, dark theme) ────────────────────────────

function IntelField({
  label,
  value,
  field,
  onSave,
}: {
  label: string;
  value?: string;
  field: string;
  onSave: (field: string, value: string) => void;
}) {
  if (!value) return null;
  return (
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
        {label}
      </p>
      <EditableField
        value={value}
        as="p"
        html={false}
        style={{
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap" as const,
        }}
        onUpdate={(v) => onSave(field, v)}
      />
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

  // Local state for key criteria (supports add/remove)
  const [criteria, setCriteria] = useState<Criterion[]>(
    () => js?.key_criteria_detailed || []
  );

  if (!js) return null;

  const hasCompData =
    js.budget_base || js.budget_bonus || js.budget_lti || js.budget_di || isEditMode;
  const hasProfileData =
    data.client_location ||
    js.line_manager ||
    js.team_size ||
    js.remit ||
    js.confidentiality ||
    isEditMode;
  const hasInternalData =
    js.red_flag_title ||
    js.red_flag_detail ||
    js.predecessor_context ||
    js.candidate_messaging ||
    js.additional_internal_notes;

  // ── Debounced save ────────────────────────────────────────────────────────

  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const handleFieldSave = useCallback((field: string, value: string | unknown) => {
    const saveTimers = saveTimersRef.current;
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
  }, [searchId]);

  // ── Key criteria mutations ────────────────────────────────────────────────

  const saveCriteria = useCallback((updated: Criterion[]) => {
    setCriteria(updated);
    handleFieldSave("key_criteria", updated);
  }, [handleFieldSave]);

  const updateCriterionName = (index: number, name: string) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, name } : c
    );
    saveCriteria(updated);
  };

  const updateCriterionDetail = (index: number, detail: string) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, detail } : c
    );
    saveCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    const updated = criteria.filter((_, i) => i !== index);
    saveCriteria(updated);
  };

  const addCriterion = () => {
    const updated = [...criteria, { name: "New Criterion", detail: "", priority: "preferred" }];
    saveCriteria(updated);
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
                    <ProfileRow label="Line Manager" value={js.line_manager} field="line_manager" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Team Size" value={js.team_size} field="team_size" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Remit" value={js.remit} field="remit" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Confidentiality" value={js.confidentiality} field="confidentiality" onSave={handleFieldSave} isEdit={isEditMode} />
                  </div>
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Core Mission ────────────────────────────────────── */}
            {(js.core_mission || isEditMode) && (
              <>
                <Section label="Core Mission">
                  <BriefField
                    value={js.core_mission || ""}
                    field="core_mission"
                    onSave={handleFieldSave}
                    isEdit={isEditMode}
                    style={{
                      fontSize: "0.88rem",
                      color: "#3a3a3a",
                      lineHeight: 1.65,
                      fontStyle: "italic",
                    }}
                  />
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Why Is This Role Open? ──────────────────────────── */}
            {(js.why_open || isEditMode) && (
              <>
                <Section label="Why Is This Role Open?">
                  <BriefField
                    value={js.why_open || ""}
                    field="why_open"
                    onSave={handleFieldSave}
                    isEdit={isEditMode}
                    style={{
                      fontSize: "0.85rem",
                      color: "#3a3a3a",
                      lineHeight: 1.6,
                    }}
                  />
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Key Criteria ────────────────────────────────────── */}
            {(criteria.length > 0 || isEditMode) && (
              <>
                <Section label="Key Criteria">
                  <ol
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {criteria.map((kc, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "14px",
                          lineHeight: 1.55,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--ss-gold, #c5a572)",
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            minWidth: "18px",
                            flexShrink: 0,
                            paddingTop: "1px",
                          }}
                        >
                          {i + 1}.
                        </span>
                        <div style={{ flex: 1 }}>
                          {isEditMode ? (
                            <>
                              <EditableField
                                value={kc.name}
                                as="span"
                                html={false}
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.88rem",
                                  color: "#1a1a1a",
                                  display: "inline",
                                }}
                                onUpdate={(v) => updateCriterionName(i, v)}
                              />
                              <span style={{ color: "#4a4a4a", fontSize: "0.85rem" }}> &mdash; </span>
                              <EditableField
                                value={kc.detail || ""}
                                as="span"
                                html={false}
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#4a4a4a",
                                  display: "inline",
                                }}
                                onUpdate={(v) => updateCriterionDetail(i, v)}
                              />
                            </>
                          ) : (
                            <>
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
                                  {" "}&mdash; {kc.detail}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {/* Remove button (edit mode only) */}
                        {isEditMode && (
                          <button
                            onClick={() => removeCriterion(i)}
                            title="Remove criterion"
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "1px solid rgba(197,165,114,0.2)",
                              background: "transparent",
                              color: "rgba(197,165,114,0.4)",
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: "2px",
                              transition: "all 0.15s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,84,80,0.4)";
                              (e.currentTarget as HTMLButtonElement).style.color = "rgba(184,84,80,0.7)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
                              (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)";
                            }}
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                  {/* Add criterion button (edit mode only) */}
                  {isEditMode && (
                    <button
                      onClick={addCriterion}
                      style={{
                        background: "transparent",
                        border: "1px dashed rgba(197,165,114,0.25)",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        color: "rgba(197,165,114,0.5)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        width: "100%",
                        textAlign: "left",
                        marginTop: "4px",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.5)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold, #c5a572)";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.25)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)";
                      }}
                    >
                      + Add criterion
                    </button>
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Key Responsibilities ────────────────────────────── */}
            {(js.key_responsibilities || isEditMode) && (
              <>
                <Section label="Key Responsibilities">
                  <BriefField
                    value={js.key_responsibilities || ""}
                    field="key_responsibilities"
                    onSave={handleFieldSave}
                    isEdit={isEditMode}
                    as="div"
                    style={{
                      fontSize: "0.85rem",
                      color: "#3a3a3a",
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                    }}
                  />
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Compensation Framework ──────────────────────────── */}
            {hasCompData && (
              <>
                <Section label="Compensation">
                  <div>
                    <CompRow label="Base Salary" value={js.budget_base} field="budget_base" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="Target Bonus" value={js.budget_bonus} field="budget_bonus" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="LTIP / MIP" value={js.budget_lti} field="budget_lti" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="Direct Investment" value={js.budget_di} field="budget_di" onSave={handleFieldSave} isEdit={isEditMode} />
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
        {isEditMode && (hasInternalData || isEditMode) && (
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

                {/* Red Flags — title */}
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
                  <EditableField
                    value={js.red_flag_title || ""}
                    as="p"
                    html={false}
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.8)",
                      marginBottom: "4px",
                    }}
                    onUpdate={(v) => handleFieldSave("red_flag_title", v)}
                  />
                  <EditableField
                    value={js.red_flag_detail || ""}
                    as="p"
                    html={false}
                    style={{
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap" as const,
                    }}
                    onUpdate={(v) => handleFieldSave("red_flag_detail", v)}
                  />
                </div>

                <IntelField label="Predecessor Context" value={js.predecessor_context} field="predecessor_context" onSave={handleFieldSave} />
                <IntelField label="Candidate Messaging" value={js.candidate_messaging} field="candidate_messaging" onSave={handleFieldSave} />
                <IntelField label="Additional Intelligence" value={js.additional_internal_notes} field="additional_internal_notes" onSave={handleFieldSave} />
              </div>
            )}
          </>
        )}
      </div>
    </EditorContext.Provider>
  );
}
