/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { SearchContext } from "@/lib/types";
import { EditorContext } from "@/contexts/EditorContext";
import EditableField from "@/components/edc/EditableField";
import { useDeckTheme } from "@/hooks/useDeckTheme";

interface ComparisonViewProps {
  data: SearchContext;
  searchId: string;
  isEditRoute?: boolean;
}

/** Inject inline bold+italic styles onto <strong> tags for comparison cells. */
function styleEvidence(html: string): string {
  return html
    .replace(/<strong>/gi, '<strong style="font-weight:700;font-style:italic;color:rgba(var(--deck-text-rgb),0.85)">')
    .replace(/<b>/gi, '<b style="font-weight:700;font-style:italic;color:rgba(var(--deck-text-rgb),0.85)">');
}

/** Strip HTML to plain text. */
function toPlain(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export default function ComparisonView({ data, searchId, isEditRoute = false }: ComparisonViewProps) {
  const { candidates, key_criteria_names } = data;
  const { theme } = useDeckTheme(searchId);
  const [isEditing, setIsEditing] = useState(false);
  const isEditable = isEditRoute && isEditing;

  // For each candidate, build a map from criterion name → evidence + anchor
  const criteriaByCandidate = candidates.map((c) => {
    const map: Record<string, { evidence: string; context_anchor?: string }> = {};
    for (const kc of c.edc_data.key_criteria) {
      map[kc.name] = { evidence: kc.evidence, context_anchor: kc.context_anchor };
    }
    return map;
  });

  const colWidth = `${Math.max(200, Math.floor((100 - 16) / candidates.length))}px`;

  return (
    <EditorContext.Provider value={{ isEditable: isEditable }}>
      <main data-deck-theme={theme} style={{ minHeight: "100vh", background: "var(--deck-bg)", paddingBottom: "60px" }}>

        {/* ── Top nav ── */}
        <div
          className="comparison-nav"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--deck-bg)",
            borderBottom: `1px solid rgba(197,165,114,var(--deck-gold-border-alpha))`,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <img
              className="comparison-nav-logo"
              src="/logos/smartsearch-white.png"
              alt="SmartSearch"
              style={{ height: "22px", opacity: 0.5 }}
            />
            <a
              href={isEditRoute ? `/deck/${searchId}/edit` : `/deck/${searchId}`}
              style={{
                fontSize: "0.78rem",
                color: "var(--ss-gold)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 600,
                letterSpacing: "0.2px",
              }}
            >
              ← Back to Deck
            </a>
          </div>

          <span
            className="font-cormorant"
            style={{ fontSize: "1rem", color: "rgba(var(--deck-text-rgb),0.4)", letterSpacing: "0.5px" }}
          >
            Candidate <em style={{ fontStyle: "italic", color: "var(--ss-gold)" }}>Comparison</em>
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "120px", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(var(--deck-text-rgb),0.2)" }}>
              {candidates.length} candidates
            </span>
            {isEditRoute && (
              <button
                onClick={() => setIsEditing((v) => !v)}
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: isEditing
                    ? "1px solid rgba(197,165,114,0.5)"
                    : "1px solid rgba(var(--deck-text-rgb),0.1)",
                  background: isEditing ? "rgba(197,165,114,0.08)" : "transparent",
                  color: isEditing ? "var(--ss-gold)" : "rgba(var(--deck-text-rgb),0.3)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {isEditing ? "🔓 Editing" : "🔒 Edit"}
              </button>
            )}
          </div>
        </div>

        {/* ── Search context line ── */}
        <div className="comparison-context" style={{ padding: "24px 32px 16px" }}>
          <p style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.25)", letterSpacing: "0.5px" }}>
            <span style={{ color: "var(--ss-gold)", fontWeight: 600 }}>{data.search_name}</span>
            {data.client_company && (
              <>
                <span style={{ margin: "0 8px", color: "rgba(197,165,114,0.25)" }}>·</span>
                {data.client_company}
              </>
            )}
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="comparison-table-wrap" style={{ padding: "0 32px" }}>
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: "16px",
              border: "1px solid rgba(197,165,114,0.1)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: `calc(180px + ${candidates.length} * ${colWidth})`,
              }}
            >

              {/* ── Two-row header: info row + button row ── */}
              <thead>
                {/* Row 1 — candidate identity */}
                <tr>
                  {/* Label column spans both header rows */}
                  <th
                    rowSpan={2}
                    style={{
                      width: "180px",
                      minWidth: "180px",
                      background: "var(--deck-card-bg)",
                      padding: "20px 20px",
                      borderRight: "1px solid rgba(197,165,114,0.08)",
                      borderBottom: "1px solid rgba(197,165,114,0.15)",
                      textAlign: "left",
                      verticalAlign: "middle",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color: "rgba(var(--deck-text-rgb),0.25)",
                      }}
                    >
                      Criterion
                    </span>
                  </th>

                  {/* Candidate info cells */}
                  {candidates.map((candidate, i) => (
                    <th
                      key={candidate.candidate_id}
                      style={{
                        background: "var(--deck-card-bg)",
                        padding: "24px 24px 16px",
                        borderRight: i < candidates.length - 1 ? "1px solid rgba(197,165,114,0.08)" : undefined,
                        borderBottom: "1px solid rgba(197,165,114,0.06)",
                        textAlign: "left",
                        verticalAlign: "top",
                        width: colWidth,
                        minWidth: "200px",
                      }}
                    >
                      {/* Initials avatar */}
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          className="font-cormorant"
                          style={{ fontSize: "15px", fontWeight: 600, color: "var(--ss-dark)", lineHeight: 1 }}
                        >
                          {candidate.initials}
                        </span>
                      </div>

                      <p
                        className="font-cormorant"
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 500,
                          color: "rgba(var(--deck-text-rgb),0.9)",
                          marginBottom: "3px",
                          letterSpacing: "-0.1px",
                          lineHeight: 1.2,
                        }}
                      >
                        {candidate.candidate_name}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--ss-gold)", marginBottom: "2px", fontWeight: 500 }}>
                        {candidate.current_title}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "rgba(var(--deck-text-rgb),0.3)" }}>
                        {candidate.current_company}
                      </p>
                    </th>
                  ))}
                </tr>

                {/* Row 2 — "View Full EDC" buttons, all on the same baseline */}
                <tr>
                  {candidates.map((candidate, i) => (
                    <th
                      key={`btn-${candidate.candidate_id}`}
                      style={{
                        background: "var(--deck-card-bg)",
                        padding: "12px 24px 20px",
                        borderRight: i < candidates.length - 1 ? "1px solid rgba(197,165,114,0.08)" : undefined,
                        borderBottom: "1px solid rgba(197,165,114,0.15)",
                        textAlign: "left",
                        verticalAlign: "bottom",
                      }}
                    >
                      <a
                        href={`/search/${searchId}/edc/${candidate.candidate_id}`}
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          color: "rgba(197,165,114,0.5)",
                          textDecoration: "none",
                          letterSpacing: "0.5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          border: "1px solid rgba(197,165,114,0.15)",
                          borderRadius: "6px",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)";
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.35)";
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.5)";
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.15)";
                        }}
                      >
                        View Full EDC →
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ── Current Role row ── */}
                <CompareRow
                  label="Current Role"
                  candidates={candidates}
                  renderCell={(c, _i, _expanded) => (
                    <span style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.55)", lineHeight: 1.5 }}>
                      {c.current_title}
                      <br />
                      <span style={{ color: "rgba(var(--deck-text-rgb),0.3)", fontSize: "0.72rem" }}>{c.current_company}</span>
                    </span>
                  )}
                />

                {/* ── Key Criteria rows ── */}
                {key_criteria_names.map((criterionName, rowIdx) => (
                  <CompareRow
                    key={criterionName}
                    label={criterionName}
                    isAlt={rowIdx % 2 === 0}
                    expandable
                    candidates={candidates}
                    renderCell={(c, i, isExpanded) => {
                      const entry = criteriaByCandidate[i][criterionName];
                      if (!entry) {
                        return (
                          <span style={{ fontSize: "0.75rem", color: "rgba(var(--deck-text-rgb),0.2)", fontStyle: "italic" }}>
                            Not assessed
                          </span>
                        );
                      }
                      const styledHtml = styleEvidence(entry.evidence);
                      const plain = toPlain(entry.evidence);
                      const cellStyle: React.CSSProperties = {
                        fontSize: "0.78rem",
                        color: "rgba(var(--deck-text-rgb),0.55)",
                        lineHeight: 1.6,
                        margin: 0,
                        ...(isExpanded ? {} : {
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }),
                      };
                      return (
                        <div>
                          {isEditable ? (
                            <EditableField
                              value={plain}
                              originalValue={plain}
                              as="p"
                              style={cellStyle}
                            />
                          ) : (
                            <p
                              style={cellStyle}
                              dangerouslySetInnerHTML={{ __html: styledHtml }}
                            />
                          )}
                          {entry.context_anchor && (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: "8px",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                color: "var(--ss-blue)",
                                background: "var(--ss-blue-light)",
                                padding: "3px 9px",
                                borderRadius: "10px",
                              }}
                            >
                              {entry.context_anchor}
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                ))}

                {/* ── Compensation row ── */}
                <CompareRow
                  label="Compensation"
                  candidates={candidates}
                  renderCell={(c, _i, _expanded) => (
                    <div style={{ fontSize: "0.78rem", lineHeight: 1.7 }}>
                      <div>
                        <span style={{ color: "rgba(var(--deck-text-rgb),0.3)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                          Current
                        </span>
                        <br />
                        <span style={{ color: "rgba(var(--deck-text-rgb),0.6)" }}>
                          {c.edc_data.compensation.current_total || c.edc_data.compensation.current_base}
                        </span>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span style={{ color: "rgba(var(--deck-text-rgb),0.3)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                          Expected
                        </span>
                        <br />
                        <span style={{ color: "var(--ss-gold-light)" }}>
                          {c.edc_data.compensation.expected_total || c.edc_data.compensation.expected_base}
                        </span>
                      </div>
                    </div>
                  )}
                />

                {/* ── Notice Period row ── */}
                <CompareRow
                  label="Notice Period"
                  candidates={candidates}
                  isLast
                  renderCell={(c, _i, _expanded) => (
                    <span style={{ fontSize: "0.78rem", color: "rgba(var(--deck-text-rgb),0.55)" }}>
                      {c.edc_data.notice_period}
                    </span>
                  )}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", padding: "48px 24px 16px" }}>
          <span
            className="font-cormorant"
            style={{
              display: "block",
              fontStyle: "italic",
              fontSize: "0.9rem",
              color: "rgba(var(--deck-text-rgb),0.15)",
              marginBottom: "6px",
            }}
          >
            Show Evidence. Let Humans Judge.
          </span>
          <span style={{ fontSize: "0.72rem", color: "rgba(var(--deck-text-rgb),0.1)" }}>
            SmartSearch &copy; 2026
          </span>
        </div>
      </main>
    </EditorContext.Provider>
  );
}

// ── Helper component ────────────────────────────────────────────────────────

interface CompareRowProps {
  label: string;
  candidates: SearchContext["candidates"];
  renderCell: (candidate: SearchContext["candidates"][number], index: number, isExpanded: boolean) => React.ReactNode;
  isAlt?: boolean;
  isLast?: boolean;
  expandable?: boolean;
}

function CompareRow({ label, candidates, renderCell, isAlt, isLast, expandable }: CompareRowProps) {
  const rowBg = isAlt ? "rgba(var(--deck-text-rgb),0.015)" : "transparent";
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <tr>
      {/* Label cell */}
      <td
        style={{
          background: "var(--deck-surface)",
          padding: "16px 20px",
          borderRight: "1px solid rgba(197,165,114,0.08)",
          borderBottom: isLast ? "none" : "1px solid rgba(var(--deck-text-rgb),0.04)",
          verticalAlign: "top",
          width: "180px",
          minWidth: "180px",
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "rgba(197,165,114,0.5)",
            lineHeight: 1.4,
            display: "block",
            marginBottom: expandable ? "10px" : undefined,
          }}
        >
          {label}
        </span>
        {expandable && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: isExpanded ? "var(--ss-gold)" : "rgba(var(--deck-text-rgb),0.2)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "color 0.15s",
            }}
          >
            {isExpanded ? "↑ Less" : "↓ More"}
          </button>
        )}
      </td>

      {/* Candidate cells */}
      {candidates.map((candidate, i) => (
        <td
          key={candidate.candidate_id}
          style={{
            background: rowBg,
            padding: "16px 20px",
            borderRight: i < candidates.length - 1 ? "1px solid rgba(197,165,114,0.06)" : undefined,
            borderBottom: isLast ? "none" : "1px solid rgba(var(--deck-text-rgb),0.04)",
            verticalAlign: "top",
          }}
        >
          {renderCell(candidate, i, isExpanded)}
        </td>
      ))}
    </tr>
  );
}
