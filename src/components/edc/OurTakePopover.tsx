"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEditorContext } from "@/contexts/EditorContext";
import { signalEdit } from "@/hooks/useAutoSave";

interface OurTakePopoverProps {
  fragments?: string[];
  text?: string;
  consultantName?: string;
  candidateId?: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  candidateContext?: string;
  manualNotes?: string;
}

export default function OurTakePopover({
  fragments: initialFragments,
  text: initialText,
  consultantName: initialName,
  candidateId,
  triggerRef,
  onClose,
  candidateContext,
  manualNotes,
}: OurTakePopoverProps) {
  const { isEditable } = useEditorContext();
  const popoverRef = useRef<HTMLDivElement>(null);
  const storageKey = candidateId ? `edc_edit_${candidateId}_ourtake` : null;
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Load persisted edits or fall back to props
  const loadStored = () => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored) as { fragments?: string[]; text?: string; name?: string; showName?: boolean };
      } catch { /* ignore */ }
    }
    return null;
  };

  const stored = loadStored();
  const [fragments, setFragments] = useState<string[]>(stored?.fragments ?? initialFragments ?? []);
  const [text, setText] = useState(stored?.text ?? initialText ?? "");
  const [name, setName] = useState(stored?.name ?? initialName ?? "");
  const [showName, setShowName] = useState(stored?.showName ?? !!initialName);

  // Position state — calculated from triggerRef (drops DOWN from pill)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Keep refs to originals for reset
  const origFragments = useRef(initialFragments ?? []);
  const origText = useRef(initialText ?? "");
  const origName = useRef(initialName ?? "");

  // Sync when props change (candidate navigation) — prefer localStorage
  useEffect(() => {
    const s = loadStored();
    setFragments(s?.fragments ?? initialFragments ?? []);
    setText(s?.text ?? initialText ?? "");
    setName(s?.name ?? initialName ?? "");
    setShowName(s?.showName ?? !!initialName);
    origFragments.current = initialFragments ?? [];
    origText.current = initialText ?? "";
    origName.current = initialName ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFragments, initialText, initialName]);

  // Persist edits to localStorage
  useEffect(() => {
    if (storageKey && isEditable) {
      try { localStorage.setItem(storageKey, JSON.stringify({ fragments, text, name, showName })); } catch { /* ignore */ }
      if (candidateId) signalEdit(candidateId);
    }
  }, [fragments, text, name, showName, storageKey, isEditable, candidateId]);

  // Position popover BELOW the trigger button (drops down)
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [triggerRef]);

  // Close on click outside or Escape
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose, triggerRef]);

  const hasFragments = fragments.length > 0;
  const hasText = text.trim().length > 0;

  const updateFragment = (index: number, value: string) => {
    setFragments(prev => prev.map((f, i) => i === index ? value : f));
  };

  const removeFragment = (index: number) => {
    setFragments(prev => prev.filter((_, i) => i !== index));
  };

  const addFragment = () => {
    setFragments(prev => [...prev, ""]);
  };

  const resetFragment = (index: number) => {
    const orig = origFragments.current[index];
    if (orig !== undefined) {
      setFragments(prev => prev.map((f, i) => i === index ? orig : f));
    }
  };

  const handleRegenerate = useCallback(async () => {
    if (!candidateContext || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/generate-our-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateContext, manualNotes }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const result = await res.json();
      if (result.text) {
        setText(result.text);
        setFragments([]);
      }
    } catch (err) {
      console.error('Regenerate Our Take failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  }, [candidateContext, manualNotes, isRegenerating]);

  if (!pos) return null;

  const popover = (
    <>
      {/* Click-away backdrop */}
      <div
        onClick={handleClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      />
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          top: `${pos.top}px`,
          right: `${pos.right}px`,
          maxWidth: "400px",
          width: "380px",
          maxHeight: "360px",
          overflowY: "auto",
          borderRadius: "14px",
          padding: "24px 24px 20px",
          background: "#faf7f2",
          border: "1px solid rgba(197,165,114,0.2)",
          borderLeft: "3px solid var(--ss-green)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 9999,
          animation: "ourTakeDropDown 0.25s ease-out forwards",
          fontFamily: "var(--font-outfit), Outfit, sans-serif",
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

        {/* Consultant name row — flex: name left, regenerate right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEditable ? (
          showName ? (
            <span className="editable-wrap" style={{ position: "relative", display: "inline-block" }}>
              <span
                contentEditable
                suppressContentEditableWarning
                className="editable-cell"
                onInput={(e) => setName(e.currentTarget.textContent || "")}
                onBlur={(e) => setName(e.currentTarget.textContent || "")}
                style={{
                  fontSize: "0.72rem",
                  color: "var(--ss-gray-light)",
                  fontWeight: 400,
                  display: "inline-block",
                  padding: "1px 20px 1px 4px",
                  margin: "-1px -4px",
                }}
              >
                {name}
              </span>
              {/* Remove name */}
              <button
                onClick={() => { setShowName(false); setName(""); }}
                style={{
                  position: "absolute",
                  right: "0",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: "0.7rem",
                  color: "rgba(160,160,160,0.5)",
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(160,160,160,0.5)"; }}
                title="Remove name"
              >
                ×
              </button>
              {/* Reset name */}
              {origName.current && name !== origName.current && (
                <button
                  className="edc-field__reset-dot"
                  style={{ top: "-4px", right: "-4px" }}
                  onMouseDown={(e) => { e.preventDefault(); setName(origName.current); }}
                  title="Reset to original"
                />
              )}
            </span>
          ) : (
            <button
              onClick={() => { setShowName(true); setName(origName.current || "Consultant"); }}
              style={{
                background: "none",
                border: "1px dashed rgba(160,160,160,0.3)",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "0.68rem",
                color: "var(--ss-gray-light)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ss-gold)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(160,160,160,0.3)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)";
              }}
            >
              + Add name
            </button>
          )
        ) : (
          name && (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--ss-gray-light)",
                fontWeight: 400,
              }}
            >
              {name}
            </span>
          )
        )}

        {/* Regenerate button — edit mode only */}
        {isEditable && candidateContext && (
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title={isRegenerating ? "Regenerating…" : "Regenerate"}
            style={{
              background: "transparent",
              border: "none",
              padding: "4px",
              color: isRegenerating ? "var(--ss-gray-light)" : "#b0a080",
              fontSize: "16px",
              lineHeight: 1,
              cursor: isRegenerating ? "default" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              if (!isRegenerating) {
                (e.currentTarget as HTMLButtonElement).style.color = "#c5a572";
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(197,165,114,0.08)";
              }
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = isRegenerating ? "var(--ss-gray-light)" : "#b0a080";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            <span style={isRegenerating ? { display: "inline-block", animation: "regenerateSpin 1s linear infinite" } : undefined}>↻</span>
          </button>
        )}
        </div>
      </div>

      {/* Fragment list */}
      {hasFragments ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {fragments.map((fragment, i) => {
            const orig = origFragments.current[i];
            const isModified = orig !== undefined && fragment !== orig;

            return isEditable ? (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ color: "var(--ss-gray-light)", fontSize: "0.85rem", lineHeight: 1.55, flexShrink: 0 }}>—</span>
                <span className={`editable-wrap ${isModified ? "edc-field--edited" : ""}`} style={{ position: "relative", display: "block", flex: 1 }}>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="editable-cell"
                    onInput={(e) => updateFragment(i, e.currentTarget.textContent || "")}
                    onBlur={(e) => updateFragment(i, e.currentTarget.textContent || "")}
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--ss-dark)",
                      lineHeight: 1.55,
                      padding: "1px 6px",
                      margin: "-1px -6px",
                    }}
                  >
                    {fragment}
                  </div>
                  {isModified && (
                    <button
                      className="edc-field__reset-dot"
                      onMouseDown={(e) => { e.preventDefault(); resetFragment(i); }}
                      title="Reset to original"
                    />
                  )}
                </span>
                {/* Remove fragment */}
                <button
                  onClick={() => removeFragment(i)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "0.75rem",
                    color: "rgba(160,160,160,0.4)",
                    cursor: "pointer",
                    padding: "2px",
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: "color 0.15s",
                    marginTop: "2px",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-red)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(160,160,160,0.4)"; }}
                  title="Remove fragment"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                key={i}
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 400,
                  color: "var(--ss-dark)",
                  lineHeight: 1.55,
                }}
              >
                — {fragment}
              </div>
            );
          })}

          {/* Add fragment — edit mode */}
          {isEditable && (
            <button
              onClick={addFragment}
              style={{
                background: "none",
                border: "none",
                borderTop: "1px dashed rgba(197,165,114,0.15)",
                padding: "6px 0 0",
                fontSize: "0.75rem",
                color: "var(--ss-gray-light)",
                cursor: "pointer",
                textAlign: "left",
                transition: "color 0.15s",
                marginTop: "4px",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
            >
              + Add observation
            </button>
          )}
        </div>
      ) : isEditable ? (
        /* Editable text block or empty prompt */
        <div>
          <span className="editable-wrap" style={{ position: "relative", display: "block" }}>
            <div
              contentEditable
              suppressContentEditableWarning
              className="editable-cell"
              onInput={(e) => setText(e.currentTarget.textContent || "")}
              onBlur={(e) => setText(e.currentTarget.textContent || "")}
              style={{
                fontSize: "0.85rem",
                color: hasText ? "var(--ss-dark)" : "var(--ss-gray-light)",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
                padding: "2px 6px",
                margin: "-2px -6px",
                minHeight: "40px",
              }}
            >
              {hasText ? text : "Write your take here..."}
            </div>
            {hasText && text !== origText.current && (
              <button
                className="edc-field__reset-dot"
                onMouseDown={(e) => { e.preventDefault(); setText(origText.current); }}
                title="Reset to original"
              />
            )}
          </span>
          {/* Switch to fragments mode */}
          <button
            onClick={() => {
              const lines = text.split("\n").filter(l => l.trim());
              if (lines.length > 0) {
                setFragments(lines);
                setText("");
              } else {
                setFragments([""]);
                setText("");
              }
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.68rem",
              color: "var(--ss-gray-light)",
              cursor: "pointer",
              padding: "6px 0 0",
              transition: "color 0.15s",
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
          >
            Switch to bullet points
          </button>
        </div>
      ) : (
        /* Read-only text fallback */
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 400,
            color: "var(--ss-dark)",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {text}
        </div>
      )}
      </div>
      <style>{`@keyframes regenerateSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  return createPortal(popover, document.body);
}
