"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export interface Conflict {
  field: string;
  field_label: string;
  consultant_value: unknown;
  ai_value: unknown;
}

interface ReviewChangesModalProps {
  searchId: string;
  candidateSlug: string;
  candidateName: string;
  conflicts: Conflict[];
  /** Called when the user has applied (or rejected) all conflicts. Modal closes. */
  onApplied?: () => void;
  /** Called when the user dismisses without saving. */
  onClose?: () => void;
}

type Decision = "consultant" | "ai";

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <em style={{ color: "rgba(45,40,36,0.5)" }}>(empty)</em>;
  }
  if (typeof value === "string") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc", display: "flex", flexDirection: "column", gap: 6 }}>
        {value.map((item, i) => (
          <li key={i} style={{ fontSize: "0.8rem", lineHeight: 1.45 }}>
            {renderArrayItem(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} style={{ fontSize: "0.78rem", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "rgba(45,40,36,0.7)" }}>{k}:</span>{' '}
            <span>{renderInlineValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function renderArrayItem(item: unknown): React.ReactNode {
  if (item === null || item === undefined) return <em>(empty)</em>;
  if (typeof item === "string") return <span style={{ whiteSpace: "pre-wrap" }}>{item}</span>;
  if (typeof item !== "object") return <span>{String(item)}</span>;
  // Object — render name+detail lines if the shape looks like a known one.
  const obj = item as Record<string, unknown>;
  if (typeof obj.name === "string") {
    const detailFields = ["evidence", "candidate_actual", "headline", "detail"];
    const detail = detailFields.map((f) => obj[f]).find((v) => typeof v === "string" && v.length > 0);
    return (
      <span>
        <strong>{obj.name}</strong>
        {detail ? ` — ${String(detail)}` : null}
      </span>
    );
  }
  if (typeof obj.headline === "string") {
    return <span><strong>{obj.headline}</strong>{obj.detail ? ` — ${String(obj.detail)}` : null}</span>;
  }
  if (typeof obj.text === "string") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{obj.text}</span>;
  }
  return <code style={{ fontSize: "0.72rem" }}>{JSON.stringify(obj)}</code>;
}

function renderInlineValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export default function ReviewChangesModal({
  searchId,
  candidateSlug,
  candidateName,
  conflicts,
  onApplied,
  onClose,
}: ReviewChangesModalProps) {
  // Default everyone to "consultant" (keep my edit) — least destructive default.
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const initial: Record<string, Decision> = {};
    for (const c of conflicts) initial[c.field] = "consultant";
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useMounted();

  const { accept, reject } = useMemo(() => {
    const acc: string[] = [];
    const rej: string[] = [];
    for (const c of conflicts) {
      if (decisions[c.field] === "ai") acc.push(c.field);
      else rej.push(c.field);
    }
    return { accept: acc, reject: rej };
  }, [decisions, conflicts]);

  const apply = async (mode: "selected" | "keep_all") => {
    setIsSubmitting(true);
    setError(null);
    const accept_fields = mode === "selected" ? accept : [];
    const reject_fields = mode === "selected" ? reject : conflicts.map((c) => c.field);
    try {
      const res = await fetch(`/api/deck/${searchId}/candidates/${candidateSlug}/apply-regeneration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept_fields, reject_fields }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("regenerate-toast", {
            detail: {
              kind: "success",
              candidateName,
              message: mode === "selected" && accept.length > 0 ? "Changes applied" : "Edits kept",
            },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("candidate-regenerate-complete", {
            detail: { candidateSlug, applied: accept_fields },
          }),
        );
      }
      onApplied?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose?.();
      }}
    >
      <div
        style={{
          background: "#faf8f5",
          borderRadius: 12,
          maxWidth: 760,
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
          border: "1px solid rgba(197,165,114,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(197,165,114,0.18)" }}>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--ss-dark)",
              margin: 0,
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              letterSpacing: "0.2px",
            }}
          >
            Review AI suggestions for {candidateName}
          </h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(45,40,36,0.7)", margin: "6px 0 0", lineHeight: 1.4 }}>
            Fresh AI output differs from your edits on {conflicts.length} {conflicts.length === 1 ? "field" : "fields"}. Choose what to keep.
          </p>
          <p
            style={{
              fontSize: "0.72rem",
              color: "rgba(45,40,36,0.55)",
              margin: "8px 0 0",
              fontStyle: "italic",
              lineHeight: 1.35,
            }}
          >
            Edits are tracked at the section level — accepting AI will replace the whole section.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          {conflicts.map((c) => {
            const decision = decisions[c.field] ?? "consultant";
            return (
              <div
                key={c.field}
                style={{
                  marginBottom: 18,
                  paddingBottom: 14,
                  borderBottom: "1px dashed rgba(197,165,114,0.18)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--ss-dark)",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {c.field_label}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Consultant (left) */}
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      padding: 12,
                      borderRadius: 8,
                      border:
                        decision === "consultant"
                          ? "1.5px solid rgba(74,124,89,0.55)"
                          : "1px solid rgba(45,40,36,0.12)",
                      background: decision === "consultant" ? "rgba(74,124,89,0.06)" : "rgba(247,244,239,0.6)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="radio"
                        name={`decision-${c.field}`}
                        checked={decision === "consultant"}
                        onChange={() => setDecisions((prev) => ({ ...prev, [c.field]: "consultant" }))}
                        disabled={isSubmitting}
                      />
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(45,40,36,0.85)" }}>
                        Keep my edit
                      </span>
                    </span>
                    <div style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--ss-dark)" }}>
                      {renderValue(c.consultant_value)}
                    </div>
                  </label>

                  {/* AI (right) */}
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      padding: 12,
                      borderRadius: 8,
                      border:
                        decision === "ai"
                          ? "1.5px solid rgba(197,165,114,0.7)"
                          : "1px solid rgba(45,40,36,0.12)",
                      background: decision === "ai" ? "rgba(197,165,114,0.08)" : "rgba(247,244,239,0.6)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="radio"
                        name={`decision-${c.field}`}
                        checked={decision === "ai"}
                        onChange={() => setDecisions((prev) => ({ ...prev, [c.field]: "ai" }))}
                        disabled={isSubmitting}
                      />
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ss-gold)" }}>
                        Accept AI
                      </span>
                    </span>
                    <div style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--ss-dark)" }}>
                      {renderValue(c.ai_value)}
                    </div>
                  </label>
                </div>
              </div>
            );
          })}

          {error && (
            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 6,
                background: "rgba(184,84,80,0.08)",
                border: "1px solid rgba(184,84,80,0.3)",
                color: "#b85450",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(197,165,114,0.18)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#f7f4ef",
          }}
        >
          <button
            type="button"
            onClick={() => apply("keep_all")}
            disabled={isSubmitting}
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1.5px solid rgba(45,40,36,0.2)",
              background: "transparent",
              color: "var(--ss-dark)",
              cursor: isSubmitting ? "default" : "pointer",
            }}
          >
            Keep all my edits
          </button>
          <button
            type="button"
            onClick={() => apply("selected")}
            disabled={isSubmitting}
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: 8,
              border: "1.5px solid var(--ss-gold)",
              background: "var(--ss-gold)",
              color: "white",
              cursor: isSubmitting ? "default" : "pointer",
              letterSpacing: "0.3px",
            }}
          >
            {isSubmitting ? "Applying…" : "Apply selected"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
