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
  const [isModified, setIsModified] = useState(
    originalValue !== undefined && value.trim() !== originalValue.trim()
  );

  const handleBlur = () => {
    const el = ref.current;
    if (!el) return;
    const newVal = html ? el.innerHTML : el.textContent || "";
    const modified = newVal.trim() !== original.current.trim();
    setIsModified(modified);
    if (onUpdate) onUpdate(newVal);
  };

  const handleReset = (e: React.MouseEvent) => {
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
    padding: isEditable ? "2px 6px" : undefined,
    margin: isEditable ? "-2px -6px" : undefined,
  };

  const editProps = isEditable
    ? {
        contentEditable: true as const,
        suppressContentEditableWarning: true,
        onBlur: handleBlur,
      }
    : {};

  const isBlock = Tag !== "span";
  const WrapperTag: React.ElementType = isBlock ? "div" : "span";

  const content = html
    ? (
      <Tag
        ref={ref as unknown as React.RefObject<HTMLDivElement>}
        className={`${className} ${isEditable ? "editable-cell" : ""}`}
        style={editableStyles}
        {...(editProps as React.HTMLAttributes<HTMLElement>)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
    : (
      <Tag
        ref={ref as unknown as React.RefObject<HTMLDivElement>}
        className={`${className} ${isEditable ? "editable-cell" : ""}`}
        style={editableStyles}
        {...(editProps as React.HTMLAttributes<HTMLElement>)}
      >
        {value}
      </Tag>
    );

  if (!isEditable) return content;

  return (
    <WrapperTag
      className="editable-wrap"
      style={{
        position: "relative",
        display: isBlock ? "block" : "inline-block",
      }}
    >
      {content}
      {isModified && (
        <button
          className="editable-reset"
          onMouseDown={handleReset}
          title="Reset to original"
        >
          ↺
        </button>
      )}
    </WrapperTag>
  );
}
