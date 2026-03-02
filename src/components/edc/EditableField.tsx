"use client";

import { useRef, useState } from "react";
import { useEditorContext } from "@/contexts/EditorContext";

interface EditableFieldProps {
  value: string;
  as?: "p" | "span" | "div" | "h1";
  className?: string;
  style?: React.CSSProperties;
  html?: boolean;
  onUpdate?: (newValue: string) => void;
}

export default function EditableField({
  value,
  as: Tag = "div",
  className = "",
  style,
  html = false,
  onUpdate,
}: EditableFieldProps) {
  const { isEditable } = useEditorContext();
  const ref = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleBlur = () => {
    setIsFocused(false);
    if (ref.current && onUpdate) {
      onUpdate(html ? ref.current.innerHTML : ref.current.textContent || "");
    }
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

  const commonProps = {
    ref: ref as React.RefObject<HTMLElement>,
    className,
    style: editableStyles,
    ...(isEditable && {
      contentEditable: true as const,
      suppressContentEditableWarning: true,
      onFocus: () => setIsFocused(true),
      onBlur: handleBlur,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    }),
  };

  if (html) {
    return (
      <Tag
        {...(commonProps as React.HTMLAttributes<HTMLElement>)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <Tag {...(commonProps as React.HTMLAttributes<HTMLElement>)}>
      {value}
    </Tag>
  );
}
