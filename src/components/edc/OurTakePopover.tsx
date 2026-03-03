"use client";

import { useState, useEffect, useRef } from "react";

interface OurTakePopoverProps {
  fragments?: string[];
  text?: string;
  consultantName?: string;
}

export default function OurTakePopover({ fragments, text, consultantName }: OurTakePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);

  // Determine if there's any content to show
  const hasFragments = fragments && fragments.length > 0;
  const hasText = text && text.trim().length > 0;
  if (!hasFragments && !hasText) return null;

  // Close on click outside or Escape
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        iconRef.current && !iconRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating icon — bottom-right of card */}
      <button
        ref={iconRef}
        onClick={() => setIsOpen((v) => !v)}
        className="our-take-icon"
        style={{
          position: "absolute",
          bottom: "56px",
          right: "24px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "var(--ss-cream)",
          border: isOpen ? "1.5px solid var(--ss-gold-light)" : "1.5px solid var(--ss-gold)",
          boxShadow: isOpen
            ? "0 2px 16px rgba(0,0,0,0.12)"
            : "0 2px 12px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 40,
          transition: "all 0.2s ease",
          transform: isOpen ? "scale(1.08)" : "scale(1)",
        }}
      >
        <span style={{ color: "var(--ss-gold)", fontSize: "18px", lineHeight: 1 }}>
          ✦
        </span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            bottom: "108px",
            right: "24px",
            maxWidth: "400px",
            width: "calc(100% - 48px)",
            maxHeight: "70vh",
            overflowY: "auto",
            borderRadius: "14px",
            padding: "24px 24px 20px",
            background: "#faf7f2",
            border: "1px solid rgba(197,165,114,0.2)",
            borderLeft: "3px solid var(--ss-green)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 50,
            animation: "ourTakeSlideUp 0.25s ease-out forwards",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "14px" }}>
            <span
              className="font-cormorant"
              style={{
                fontSize: "1.05rem",
                fontStyle: "italic",
                fontWeight: 500,
                color: "var(--ss-gold-deep)",
                display: "block",
              }}
            >
              Our Take
            </span>
            <div
              style={{
                width: "32px",
                height: "1px",
                background: "rgba(197,165,114,0.2)",
                margin: "6px 0",
              }}
            />
            {consultantName && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--ss-gray-light)",
                  fontWeight: 400,
                }}
              >
                {consultantName}
              </span>
            )}
          </div>

          {/* Fragment list */}
          {hasFragments ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {fragments!.map((fragment, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--ss-dark)",
                    lineHeight: 1.55,
                  }}
                  dangerouslySetInnerHTML={{ __html: `— ${fragment}` }}
                />
              ))}
            </div>
          ) : (
            /* Fallback: legacy single-block text */
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--ss-dark)",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {text}
            </div>
          )}
        </div>
      )}

      {/* Slide-up animation + pulse keyframes */}
      <style>{`
        @keyframes ourTakeSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes ourTakePulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 8px rgba(197,165,114,0.12); }
        }
        .our-take-icon {
          animation: ourTakePulse 1.5s ease-in-out 2;
        }
        .our-take-icon:hover {
          border-color: var(--ss-gold-light) !important;
          transform: scale(1.08) !important;
        }
      `}</style>
    </>
  );
}
