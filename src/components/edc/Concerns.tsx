"use client";

import { useState, useEffect } from "react";
import EditableField from "@/components/edc/EditableField";
import { useEditorContext } from "@/contexts/EditorContext";

interface ConcernsProps {
  potential_concerns: {
    concern: string;
    severity: "development" | "significant";
  }[];
  candidateId?: string;
}

function hiddenKey(id: string) {
  return `edc_concerns_hidden_${id}`;
}

export default function Concerns({ potential_concerns, candidateId }: ConcernsProps) {
  const { isEditable } = useEditorContext();
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    try {
      setIsHidden(localStorage.getItem(hiddenKey(candidateId)) === "true");
    } catch { /* ignore */ }
  }, [candidateId]);

  const toggle = () => {
    const next = !isHidden;
    setIsHidden(next);
    if (candidateId) {
      try { localStorage.setItem(hiddenKey(candidateId), String(next)); } catch { /* ignore */ }
    }
  };

  // Client view + hidden → nothing rendered
  if (isHidden && !isEditable) return null;

  // Edit mode + hidden → collapsed placeholder
  if (isHidden && isEditable) {
    return (
      <section
        className="px-section-x border-b border-ss-border"
        style={{ paddingTop: "16px", paddingBottom: "16px" }}
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
            Potential Concerns
          </span>
          <button
            onClick={toggle}
            style={{
              background: "transparent",
              border: "1px solid rgba(201,149,58,0.25)",
              color: "rgba(201,149,58,0.6)",
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(201,149,58,0.06)";
              b.style.color = "var(--ss-yellow)";
            }}
            onMouseOut={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color = "rgba(201,149,58,0.6)";
            }}
          >
            Show section ↓
          </button>
        </div>
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--ss-gray-pale)",
            fontStyle: "italic",
            marginTop: "6px",
          }}
        >
          Hidden from client view
        </p>
      </section>
    );
  }

  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      {/* Section header with hide toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <span
          className="uppercase font-semibold whitespace-nowrap"
          style={{ fontSize: "0.65rem", letterSpacing: "2.5px", color: "var(--ss-gray-light)" }}
        >
          Potential Concerns
        </span>
        <div className="flex-1 h-px" style={{ background: "#eeebe6" }} />
        {isEditable && (
          <button
            onClick={toggle}
            style={{
              background: "transparent",
              border: "1px solid rgba(201,149,58,0.2)",
              color: "rgba(201,149,58,0.55)",
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
              b.style.background = "rgba(201,149,58,0.06)";
              b.style.color = "var(--ss-yellow)";
            }}
            onMouseOut={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.color = "rgba(201,149,58,0.55)";
            }}
          >
            Hide from client ↑
          </button>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: "10px" }}>
        {potential_concerns.map((item, i) => {
          const isSignificant = item.severity === "significant";
          return (
            <div
              key={i}
              className="flex items-start"
              style={{
                gap: "12px",
                padding: "14px 18px",
                background: isSignificant ? "var(--ss-red-light)" : "var(--ss-yellow-light)",
                borderRadius: "10px",
                borderLeft: `3px solid ${isSignificant ? "var(--ss-red)" : "var(--ss-yellow)"}`,
              }}
            >
              <span
                className="shrink-0"
                style={{
                  color: isSignificant ? "var(--ss-red)" : "var(--ss-yellow)",
                  fontSize: "0.85rem",
                  marginTop: "2px",
                }}
              >
                ⚠
              </span>
              <EditableField
                value={item.concern}
                originalValue={item.concern}
                as="p"
                style={{ fontSize: "0.87rem", color: "var(--ss-dark)", lineHeight: 1.65 }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
