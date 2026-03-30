"use client";

import { useState, useEffect, useRef } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import { useEditorContext } from "@/contexts/EditorContext";

interface WhyInterestedItem {
  type: 'pull' | 'push';
  headline: string;
  detail: string;
}

interface WhyInterestedProps {
  why_interested: WhyInterestedItem[];
}

export default function WhyInterested({ why_interested }: WhyInterestedProps) {
  const { isEditable } = useEditorContext();
  const [items, setItems] = useState<WhyInterestedItem[]>(why_interested);
  const originalItems = useRef<WhyInterestedItem[]>(why_interested);

  useEffect(() => {
    setItems(why_interested);
    originalItems.current = why_interested;
  }, [why_interested]);

  // Hide section entirely if no real motivation data
  const hasRealData = items.length > 0 &&
    !items.every((item) => item.headline === 'See candidate overview' || !item.headline);
  if (!hasRealData) return null;

  const updateHeadline = (index: number, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, headline: value } : item
    ));
  };

  return (
    <section className="px-8 py-5 border-b border-ss-border">
      <SectionLabel label="Why Are They Interested?" />

      <div className="flex flex-col" style={{ gap: "5px" }}>
        {items.slice(0, 4).map((item, i) => {
          const orig = originalItems.current[i];
          const isModified = orig && item.headline !== orig.headline;

          return (
            <div
              key={i}
              className="flex items-center"
              style={{ gap: "8px" }}
            >
              {/* Directional arrow */}
              <span
                className="shrink-0 inline-flex items-center justify-center"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  fontSize: "0.6rem",
                  background:
                    item.type === "pull"
                      ? "var(--ss-green-light)"
                      : "var(--ss-yellow-light)",
                  color:
                    item.type === "pull"
                      ? "var(--ss-green)"
                      : "var(--ss-yellow)",
                }}
              >
                {item.type === "pull" ? "↗" : "↙"}
              </span>

              {/* Headline — editable with reset in edit mode */}
              {isEditable ? (
                <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block", flex: 1 }}>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    className="editable-cell"
                    onBlur={(e) => updateHeadline(i, e.currentTarget.textContent || "")}
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      color: "var(--ss-dark)",
                      lineHeight: 1.3,
                      display: "block",
                      padding: "1px 6px",
                      margin: "-1px -6px",
                    }}
                  >
                    {item.headline}
                  </span>
                  {isModified && (
                    <button
                      className="edc-field__reset-dot"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        updateHeadline(i, orig.headline);
                      }}
                      title="Reset to original"
                    />
                  )}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: "var(--ss-dark)",
                    lineHeight: 1.3,
                  }}
                >
                  {item.headline}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
