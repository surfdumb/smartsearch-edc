"use client";

import { useRef, useState } from "react";
import { useEditorContext } from "@/contexts/EditorContext";

interface EditableFieldProps {
  value: string;
  /** The original fixture value. Reset restores to this. Defaults to mount-time value. */
  originalValue?: string;
  as?: "p" | "span" | "div" | "h1";
  className?: string;
  style?: React.CSSProperties;
  html?: boolean;
  onUpdate?: (newValue: string) => void;
  /** Called on reset instead of restoring originalValue locally (for parent-managed state). */
  onReset?: () => void;
}

export default function EditableField({
  value,
  originalValue,
  as: Tag = "div",
  className = "",
  style,
  html = false,
  onUpdate,
  onReset,
}: EditableFieldProps) {
  const { isEditable } = useEditorContext();
  const ref = useRef<HTMLElement>(null);
  const original = useRef(originalValue ?? value);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Track modification: if originalValue provided, compare against it; otherwise track if user edited
  const [isModified, setIsModified] = useState(
    originalValue !== undefined && value.trim() !== originalValue.trim()
  );

  const handleBlur = () => {
    setIsFocused(false);
    const el = ref.current;
    if (!el) return;
    const newVal = html ? el.innerHTML : el.textContent || "";
    const modified = newVal.trim() !== original.current.trim();
    setIsModified(modified);
    if (onUpdate) onUpdate(newVal);
  };

  const handleReset = (e: React.MouseEvent) => {
    // preventDefault keeps focus in contentEditable so blur doesn't fire first
    e.preventDefault();
    if (onReset) {
      onReset();
      setIsModified(false);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (html) el.innerHTML = original.current;
    else el.textContent = original.current;
    setIsModified(false);
    if (onUpdate) onUpdate(original.current);
    el.blur();
  };

  const editableStyles: React.CSSProperties = {
    ...style,
    outline: "none",
    borderRadius: isEditable ? "4px" : undefined,
    padding: isEditable ? "2px 4px" : undefined,
    margin: isEditable ? "-2px -4px" : undefined,
    transition: isEditable ? "box-shadow 0.15s ease, background-color 0.15s ease" : undefined,
    boxShadow: isEditable && isFocused ? "0 0 0 2px rgba(197, 165, 114, 0.5)" : "none",
    backgroundColor: isEditable
      ? isFocused
        ? "rgba(197, 165, 114, 0.06)"
        : isHovered
          ? "rgba(197, 165, 114, 0.04)"
          : "transparent"
      : "transparent",
  };

  const editProps = isEditable
    ? {
        contentEditable: true as const,
        suppressContentEditableWarning: true,
        onFocus: () => setIsFocused(true),
        onBlur: handleBlur,
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  const isBlock = Tag !== "span";
  const WrapperTag: React.ElementType = isBlock ? "div" : "span";

  const content = html
    ? (
      <Tag
        ref={ref as unknown as React.RefObject<HTMLDivElement>}
        className={className}
        style={editableStyles}
        {...(editProps as React.HTMLAttributes<HTMLElement>)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
    : (
      <Tag
        ref={ref as unknown as React.RefObject<HTMLDivElement>}
        className={className}
        style={editableStyles}
        {...(editProps as React.HTMLAttributes<HTMLElement>)}
      >
        {value}
      </Tag>
    );

  if (!isEditable) return content;

  return (
    <WrapperTag
      style={{
        position: "relative",
        display: isBlock ? "block" : "inline-block",
      }}
    >
      {content}
      {isModified && (
        <button
          onMouseDown={handleReset}
          title="Reset to original"
          style={{
            position: "absolute",
            top: "1px",
            right: isBlock ? "2px" : "-20px",
            background: "transparent",
            border: "none",
            color: "rgba(197,165,114,0.55)",
            fontSize: "0.82rem",
            cursor: "pointer",
            padding: "1px 3px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.55)"; }}
        >
          ↺
        </button>
      )}
    </WrapperTag>
  );
}
