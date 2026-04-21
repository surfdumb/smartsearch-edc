"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEditorContext } from "@/contexts/EditorContext";
import { signalEdit, markDirty } from "@/hooks/useAutoSave";
import { isEditFresh, writeBaseHash } from "@/lib/edit-hash";

// Shallow array equality for fragment lists — `===` is reference identity (new
// array each prop push) and JSON.stringify is overkill. Mirrors the role of
// deepEqualCriteria in KeyCriteria: lets the hydration useEffect no-op when
// target content matches current state, avoiding a render that would race the
// autosave signal.
function shallowEqualFragments(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

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
  const ourTakePropHash = useMemo(
    () => ({ text: initialText, fragments: initialFragments, name: initialName }),
    [initialText, initialFragments, initialName]
  );
  const loadStored = () => {
    if (storageKey && typeof window !== 'undefined' && isEditFresh(storageKey, ourTakePropHash)) {
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

  // Hydrate on prop change (candidate navigation / parent re-render). Mirrors the
  // KeyCriteria post-fix guard: gate each setState with an equality check so a
  // fresh prop reference with identical content doesn't re-trigger renders and
  // race the autosave signal into overwriting fresh localStorage edits.
  useEffect(() => {
    const s = loadStored();
    const targetFragments = s?.fragments ?? initialFragments ?? [];
    const targetText = s?.text ?? initialText ?? "";
    const targetName = s?.name ?? initialName ?? "";
    const targetShowName = s?.showName ?? !!initialName;
    setFragments(prev => shallowEqualFragments(prev, targetFragments) ? prev : targetFragments);
    setText(prev => prev === targetText ? prev : targetText);
    setName(prev => prev === targetName ? prev : targetName);
    setShowName(prev => prev === targetShowName ? prev : targetShowName);
    origFragments.current = initialFragments ?? [];
    origText.current = initialText ?? "";
    origName.current = initialName ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFragments, initialText, initialName]);

  // Write-on-edit: persist to localStorage and signal autosave synchronously in
  // one atomic step. Mirrors KeyCriteria's commitItems. Callers pass a partial
  // update; we compute the consolidated next state, write ONE JSON to
  // localStorage, call writeBaseHash + signalEdit, then update React state.
  // Thin wrappers provide KeyCriteria-style call sites for single-field
  // mutations; callers that change multiple fields in one handler must use
  // commitOurTake directly to avoid back-to-back writes clobbering each
  // other's closure values.
  const commitOurTake = useCallback((updates: {
    fragments?: string[];
    text?: string;
    name?: string;
    showName?: boolean;
  }) => {
    if (candidateId) markDirty(candidateId);
    const nextFragments = updates.fragments ?? fragments;
    const nextText = updates.text ?? text;
    const nextName = updates.name ?? name;
    const nextShowName = updates.showName ?? showName;
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          fragments: nextFragments, text: nextText, name: nextName, showName: nextShowName,
        }));
        writeBaseHash(storageKey, ourTakePropHash);
      } catch { /* ignore */ }
    }
    if (candidateId) signalEdit(candidateId);
    if (updates.fragments !== undefined) setFragments(nextFragments);
    if (updates.text !== undefined) setText(nextText);
    if (updates.name !== undefined) setName(nextName);
    if (updates.showName !== undefined) setShowName(nextShowName);
  }, [candidateId, storageKey, fragments, text, name, showName, ourTakePropHash]);

  const commitFragments = useCallback((next: string[]) => commitOurTake({ fragments: next }), [commitOurTake]);
  const commitText = useCallback((next: string) => commitOurTake({ text: next }), [commitOurTake]);
  const commitName = useCallback((next: string) => commitOurTake({ name: next }), [commitOurTake]);

  // Write to localStorage directly (no React state update, no re-render, no cursor jump).
  // Used by onInput handlers so handleLock always reads fresh data.
  const flushToStorage = useCallback((overrides: { text?: string; fragments?: string[]; name?: string }) => {
    if (!storageKey || !isEditable) return;
    if (candidateId) markDirty(candidateId);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        fragments: overrides.fragments ?? fragments,
        text: overrides.text ?? text,
        name: overrides.name ?? name,
        showName,
      }));
      writeBaseHash(storageKey, { text: initialText, fragments: initialFragments, name: initialName });
    } catch { /* ignore */ }
    if (candidateId) signalEdit(candidateId);
  }, [storageKey, isEditable, fragments, text, name, showName, candidateId, initialText, initialFragments, initialName]);

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
    commitFragments(fragments.map((f, i) => i === index ? value : f));
  };

  const removeFragment = (index: number) => {
    commitFragments(fragments.filter((_, i) => i !== index));
  };

  const addFragment = () => {
    commitFragments([...fragments, ""]);
  };

  const resetFragment = (index: number) => {
    const orig = origFragments.current[index];
    if (orig !== undefined) {
      commitFragments(fragments.map((f, i) => i === index ? orig : f));
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
        commitOurTake({ text: result.text, fragments: [] });
      }
    } catch (err) {
      console.error('Regenerate Our Take failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  }, [candidateContext, manualNotes, isRegenerating, commitOurTake]);

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
                onInput={(e) => flushToStorage({ name: e.currentTarget.textContent || "" })}
                onBlur={(e) => commitName(e.currentTarget.textContent || "")}
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
                onClick={() => commitOurTake({ showName: false, name: "" })}
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
                  onMouseDown={(e) => { e.preventDefault(); commitName(origName.current); }}
                  title="Reset to original"
                />
              )}
            </span>
          ) : (
            <button
              onClick={() => commitOurTake({ showName: true, name: origName.current || "Consultant" })}
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
                    onInput={(e) => { const updated = [...fragments]; updated[i] = e.currentTarget.textContent || ""; flushToStorage({ fragments: updated }); }}
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
              onInput={(e) => flushToStorage({ text: e.currentTarget.textContent || "" })}
              onBlur={(e) => commitText(e.currentTarget.textContent || "")}
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
                onMouseDown={(e) => { e.preventDefault(); commitText(origText.current); }}
                title="Reset to original"
              />
            )}
          </span>
          {/* Switch to fragments mode */}
          <button
            onClick={() => {
              const lines = text.split("\n").filter(l => l.trim());
              commitOurTake({ fragments: lines.length > 0 ? lines : [""], text: "" });
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
