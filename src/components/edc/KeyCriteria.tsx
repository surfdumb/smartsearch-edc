"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import ContextAnchorPill from "@/components/ui/ContextAnchorPill";
import { useEditorContext } from "@/contexts/EditorContext";

interface CriterionItem {
  name: string;
  evidence: string;
  context_anchor?: string;
}

interface KeyCriteriaProps {
  key_criteria: CriterionItem[];
}

/* ── Editable pill with remove button ── */
function EditablePill({
  text,
  originalText,
  onUpdate,
  onRemove,
}: {
  text: string;
  originalText: string;
  onUpdate: (v: string) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isModified = text !== originalText;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="editable-cell"
        onBlur={(e) => onUpdate(e.currentTarget.textContent || "")}
        style={{
          display: "inline-block",
          fontSize: "0.72rem",
          fontWeight: 600,
          padding: "4px 22px 4px 11px",
          borderRadius: "12px",
          background: "rgba(74, 106, 140, 0.10)",
          color: "#4a6a8c",
          whiteSpace: "nowrap",
          outline: "none",
        }}
      >
        {text}
      </span>
      {/* Remove pill × */}
      <button
        onClick={onRemove}
        style={{
          position: "absolute",
          right: "5px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          fontSize: "0.7rem",
          color: "rgba(74, 106, 140, 0.4)",
          cursor: "pointer",
          padding: "0 2px",
          lineHeight: 1,
          transition: "color 0.15s",
        }}
        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(74, 106, 140, 0.4)"; }}
        title="Remove pill"
      >
        ×
      </button>
      {/* Reset indicator */}
      {isModified && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onUpdate(originalText);
            if (ref.current) ref.current.textContent = originalText;
          }}
          className="editable-reset"
          style={{ position: "absolute", top: "-6px", right: "-8px", opacity: 1 }}
          title="Reset pill"
        >
          ↺
        </button>
      )}
    </span>
  );
}

export default function KeyCriteria({ key_criteria }: KeyCriteriaProps) {
  const { isEditable } = useEditorContext();
  const [items, setItems] = useState<CriterionItem[]>(key_criteria);
  const originalItems = useRef<CriterionItem[]>(key_criteria);

  useEffect(() => {
    setItems(key_criteria);
    originalItems.current = key_criteria;
  }, [key_criteria]);

  const updateField = (index: number, field: keyof CriterionItem, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removePill = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, context_anchor: undefined } : item
    ));
  };

  const addPill = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, context_anchor: "at Company" } : item
    ));
  };

  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setItems(prev => [...prev, {
      name: "New criterion",
      evidence: "",
      context_anchor: undefined,
    }]);
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Key Criteria" />

      <div className="flex flex-col gap-0">
        {items.map((item, i) => {
          const orig = originalItems.current[i];
          const nameModified = orig && item.name !== orig.name;
          const evidenceModified = orig && item.evidence !== orig.evidence;

          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: isEditable ? "24px 1fr 20px" : "24px 1fr",
                gap: "10px",
                alignItems: "flex-start",
                padding: "7px 0",
                borderBottom:
                  i < items.length - 1
                    ? "1px solid var(--ss-border-light)"
                    : "none",
              }}
            >
              {/* Green number badge */}
              <span
                className="inline-flex items-center justify-center shrink-0 font-bold"
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "0.68rem",
                  borderRadius: "50%",
                  background: "var(--ss-green-badge)",
                  color: "var(--ss-green)",
                  marginTop: "2px",
                }}
              >
                {i + 1}
              </span>

              {/* Content */}
              <div>
                {/* Criterion name */}
                {isEditable ? (
                  <span className="editable-wrap" style={{ position: "relative", display: "block" }}>
                    <h4
                      contentEditable
                      suppressContentEditableWarning
                      className="editable-cell"
                      onBlur={(e) => updateField(i, "name", e.currentTarget.textContent || "")}
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "var(--ss-dark)",
                        marginBottom: "3px",
                        padding: "1px 6px",
                        margin: "-1px -6px 3px",
                      }}
                    >
                      {item.name}
                    </h4>
                    {nameModified && (
                      <button
                        className="editable-reset"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateField(i, "name", orig.name);
                        }}
                        title="Reset name"
                      >
                        ↺
                      </button>
                    )}
                  </span>
                ) : (
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "var(--ss-dark)",
                      marginBottom: "3px",
                    }}
                  >
                    {item.name}
                  </h4>
                )}

                {/* Evidence + pill row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  {isEditable ? (
                    <span className="editable-wrap" style={{ position: "relative", display: "block", flex: 1, minWidth: 0 }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="editable-cell"
                        onBlur={(e) => updateField(i, "evidence", e.currentTarget.innerHTML)}
                        style={{
                          fontSize: "0.95rem",
                          lineHeight: 1.5,
                          color: "var(--ss-gray)",
                          padding: "1px 6px",
                          margin: "-1px -6px",
                        }}
                        dangerouslySetInnerHTML={{ __html: item.evidence }}
                      />
                      {evidenceModified && (
                        <button
                          className="editable-reset"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateField(i, "evidence", orig.evidence);
                          }}
                          title="Reset evidence"
                        >
                          ↺
                        </button>
                      )}
                    </span>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        color: "var(--ss-gray)",
                        flex: 1,
                        minWidth: 0,
                      }}
                      dangerouslySetInnerHTML={{ __html: item.evidence }}
                    />
                  )}

                  {/* Context anchor pill */}
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    {isEditable ? (
                      item.context_anchor ? (
                        <EditablePill
                          text={item.context_anchor}
                          originalText={orig?.context_anchor ?? item.context_anchor}
                          onUpdate={(v) => updateField(i, "context_anchor", v)}
                          onRemove={() => removePill(i)}
                        />
                      ) : (
                        <button
                          onClick={() => addPill(i)}
                          style={{
                            background: "none",
                            border: "1px dashed rgba(74, 106, 140, 0.25)",
                            borderRadius: "12px",
                            padding: "3px 10px",
                            fontSize: "0.65rem",
                            color: "rgba(74, 106, 140, 0.5)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 106, 140, 0.5)";
                            (e.currentTarget as HTMLButtonElement).style.color = "#4a6a8c";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 106, 140, 0.25)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(74, 106, 140, 0.5)";
                          }}
                          title="Add context anchor"
                        >
                          + pill
                        </button>
                      )
                    ) : (
                      item.context_anchor && <ContextAnchorPill text={item.context_anchor} />
                    )}
                  </div>
                </div>
              </div>

              {/* Row remove — edit mode */}
              {isEditable && (
                <button
                  onClick={() => removeRow(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "transparent",
                    transition: "color 0.15s",
                    padding: "2px",
                    lineHeight: 1,
                    marginTop: "4px",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "transparent"; }}
                  title="Remove criterion"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Ghost add-row */}
        {isEditable && (
          <button
            onClick={addRow}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 0",
              background: "none",
              border: "none",
              borderTop: "1px dashed var(--ss-border)",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--ss-gray-light)",
              textAlign: "left",
              transition: "color 0.15s",
              marginTop: "2px",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
          >
            + Add criterion
          </button>
        )}
      </div>
    </section>
  );
}
