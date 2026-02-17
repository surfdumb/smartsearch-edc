"use client";

import { useRef, useState } from "react";

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
    borderRadius: "4px",
    padding: "2px 4px",
    margin: "-2px -4px",
    transition: "box-shadow 0.15s ease, background-color 0.15s ease",
    boxShadow: isFocused
      ? "0 0 0 2px rgba(197, 165, 114, 0.5)"
      : "none",
    backgroundColor: isFocused
      ? "rgba(197, 165, 114, 0.06)"
      : isHovered
        ? "rgba(197, 165, 114, 0.04)"
        : "transparent",
  };

  const commonProps = {
    ref: ref as React.RefObject<HTMLElement>,
    className,
    style: editableStyles,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: () => setIsFocused(true),
    onBlur: handleBlur,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
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
