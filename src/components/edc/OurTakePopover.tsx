"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEditorContext } from "@/contexts/EditorContext";
import { signalEdit, markDirty } from "@/hooks/useAutoSave";
import { isEditFresh, writeBaseHash, hashData } from "@/lib/edit-hash";

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
  candidateName?: string;
  searchId?: string;
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
  candidateName,
  searchId,
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

  // --- Save-button dirty tracking -----------------------------------------
  // Snapshot hash reflects what's currently persisted (hydrated state = what's
  // in localStorage after the equality-gated hydration effect). Button starts
  // clean on every open and every candidate switch.
  type SaveStatus = 'idle' | 'saving' | 'just-saved' | 'error';
  const [savedSnapshotHash, setSavedSnapshotHash] = useState<string>(
    () => hashData({ text: stored?.text ?? initialText ?? "", fragments: stored?.fragments ?? initialFragments ?? [] })
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const currentSnapshotHash = useMemo(() => hashData({ text, fragments }), [text, fragments]);
  const isDirty = currentSnapshotHash !== savedSnapshotHash;

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
    // Reset save-button baseline on candidate switch so the button reads clean.
    setSavedSnapshotHash(hashData({ text: targetText, fragments: targetFragments }));
    setSaveStatus('idle');
    setLastError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFragments, initialText, initialName]);

  // When the user resumes typing after a saved/error state, revert the button
  // label to idle so it stops reading "✓ Saved" mid-edit.
  useEffect(() => {
    setSaveStatus(prev => (prev === 'just-saved' || prev === 'error') ? 'idle' : prev);
  }, [currentSnapshotHash]);

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

  // --- Explicit Save path --------------------------------------------------
  // localStorage is the source of truth: onInput handlers write to it
  // synchronously via flushToStorage, but don't setState. So when the user
  // types and clicks Save without blurring first, React state is stale but
  // localStorage is fresh. Helper reads the latest persisted values with
  // per-render fallback.
  const readLatestFromStorage = useCallback((): { text: string; fragments: string[]; name: string } => {
    const fallback = { text, fragments, name };
    if (!storageKey || typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        text: typeof parsed.text === 'string' ? parsed.text : fallback.text,
        fragments: Array.isArray(parsed.fragments) ? parsed.fragments : fallback.fragments,
        name: typeof parsed.name === 'string' ? parsed.name : fallback.name,
      };
    } catch {
      return fallback;
    }
  }, [storageKey, text, fragments, name]);

  // A snapshot ref mirrored on every render so unmount + beforeunload see the
  // latest values without stale closure capture. Includes savedSnapshotHash so
  // the unmount cleanup can dirty-check against the last persisted baseline.
  const flushRef = useRef({
    storageKey,
    candidateId,
    candidateName,
    searchId,
    text,
    fragments,
    name,
    savedSnapshotHash,
    initialText,
    initialFragments,
    initialName,
  });
  useEffect(() => {
    flushRef.current = {
      storageKey,
      candidateId,
      candidateName,
      searchId,
      text,
      fragments,
      name,
      savedSnapshotHash,
      initialText,
      initialFragments,
      initialName,
    };
  });

  const handleSave = useCallback(async () => {
    if (saveStatus === 'saving') return;
    if (!candidateId || !searchId) return;
    // Force any focused contentEditable to blur so pending onBlur handlers
    // flush (belt-and-suspenders — localStorage is already up-to-date via
    // onInput, but blur triggers commitText/commitFragments which syncs React
    // state for post-save UI consistency).
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const latest = readLatestFromStorage();
    const latestHash = hashData({ text: latest.text, fragments: latest.fragments });
    if (latestHash === savedSnapshotHash) return; // nothing to save
    setSaveStatus('saving');
    setLastError(null);
    // Sync React state + localStorage + signalEdit via commitOurTake so the
    // manual save and the debounced autosave stay consistent.
    commitOurTake({ text: latest.text, fragments: latest.fragments });
    try {
      const res = await fetch('/api/edits/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          candidateId,
          edcData: {
            our_take: { text: latest.text },
            our_take_fragments: latest.fragments,
            consultant_name: latest.name,
          },
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSavedSnapshotHash(latestHash);
      setSaveStatus('just-saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSaveStatus(prev => prev === 'just-saved' ? 'idle' : prev), 5000);
    } catch (err) {
      setSaveStatus('error');
      setLastError((err as Error)?.message ?? 'Save failed');
    }
  }, [saveStatus, candidateId, searchId, savedSnapshotHash, readLatestFromStorage, commitOurTake]);

  // Unmount flush — the bug fix that makes field-blur-then-navigate reliable.
  // Runs exactly once at unmount (empty deps). Reads latest from localStorage
  // (covers unblurred-typing case) and dirty-checks against savedSnapshotHash.
  useEffect(() => {
    return () => {
      const snap = flushRef.current;
      if (!snap.candidateId) return;
      // Read the latest persisted values. onInput handlers write here, so this
      // captures text/fragments even if React state hasn't caught up via blur.
      let latestText = snap.text;
      let latestFragments = snap.fragments;
      let latestName = snap.name;
      if (snap.storageKey) {
        try {
          const raw = localStorage.getItem(snap.storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.text === 'string') latestText = parsed.text;
            if (Array.isArray(parsed.fragments)) latestFragments = parsed.fragments;
            if (typeof parsed.name === 'string') latestName = parsed.name;
          }
        } catch { /* ignore */ }
      }
      const latestHash = hashData({ text: latestText, fragments: latestFragments });
      if (latestHash === snap.savedSnapshotHash) return; // nothing to flush
      // Ensure localStorage + autosave signal are consistent (in case the ref
      // lags behind by a tick).
      if (snap.storageKey) {
        try {
          localStorage.setItem(snap.storageKey, JSON.stringify({
            fragments: latestFragments,
            text: latestText,
            name: latestName,
            showName: !!latestName,
          }));
          writeBaseHash(snap.storageKey, { text: snap.initialText, fragments: snap.initialFragments, name: snap.initialName });
        } catch { /* ignore */ }
      }
      markDirty(snap.candidateId);
      signalEdit(snap.candidateId);
      // Fire-and-forget POST with keepalive so the request survives unmount.
      if (snap.searchId) {
        try {
          fetch('/api/edits/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchId: snap.searchId,
              candidateId: snap.candidateId,
              edcData: {
                our_take: { text: latestText },
                our_take_fragments: latestFragments,
                consultant_name: latestName,
              },
            }),
            keepalive: true,
          }).catch(() => { /* component is gone */ });
        } catch { /* ignore */ }
      }
      // Dispatch toast — listener lives outside the unmounting tree.
      try {
        window.dispatchEvent(new CustomEvent('our-take-auto-saved', {
          detail: {
            candidateId: snap.candidateId,
            candidateName: snap.candidateName,
            savedAt: new Date().toISOString(),
          },
        }));
      } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser-close safety net. sendBeacon with Blob so the payload survives unload.
  useEffect(() => {
    const handler = () => {
      const snap = flushRef.current;
      if (!snap.candidateId || !snap.searchId) return;
      // Read fresh from localStorage (same rationale as unmount flush).
      let latestText = snap.text;
      let latestFragments = snap.fragments;
      let latestName = snap.name;
      if (snap.storageKey) {
        try {
          const raw = localStorage.getItem(snap.storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.text === 'string') latestText = parsed.text;
            if (Array.isArray(parsed.fragments)) latestFragments = parsed.fragments;
            if (typeof parsed.name === 'string') latestName = parsed.name;
          }
        } catch { /* ignore */ }
      }
      const latestHash = hashData({ text: latestText, fragments: latestFragments });
      if (latestHash === snap.savedSnapshotHash) return;
      try {
        const payload = JSON.stringify({
          searchId: snap.searchId,
          candidateId: snap.candidateId,
          edcData: {
            our_take: { text: latestText },
            our_take_fragments: latestFragments,
            consultant_name: latestName,
          },
        });
        navigator.sendBeacon('/api/edits/save', new Blob([payload], { type: 'application/json' }));
      } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [searchId, candidateId]);

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

      {/* Footer: mode-switch link (left) + Save button (right). Edit mode only. */}
      {isEditable && (
        <>
          {saveStatus === 'error' && lastError && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.72rem",
                color: "#b85a5a",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span aria-hidden="true">⚠</span>
              <span>{lastError}</span>
            </div>
          )}
          <div
            style={{
              marginTop: saveStatus === 'error' ? "6px" : "12px",
              paddingTop: "8px",
              borderTop: "1px dashed rgba(197,165,114,0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Left: mode switch — contextual */}
            {hasFragments ? (
              <button
                onClick={addFragment}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0",
                  fontSize: "0.72rem",
                  color: "var(--ss-gray-light)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
              >
                + Add observation
              </button>
            ) : (
              <button
                onClick={() => {
                  const lines = text.split("\n").filter(l => l.trim());
                  commitOurTake({ fragments: lines.length > 0 ? lines : [""], text: "" });
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0",
                  fontSize: "0.72rem",
                  color: "var(--ss-gray-light)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "color 0.15s",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gray-light)"; }}
              >
                Switch to bullet points
              </button>
            )}

            {/* Right: Save changes — only when we can actually POST. Always
                clickable in idle/error states because the real dirty-check
                happens inside handleSave via a fresh localStorage read (covers
                the type-then-click-Save-without-blur case). Visual muting
                still reflects React-state isDirty. */}
            {candidateId && searchId && (() => {
              const isError = saveStatus === 'error';
              const isSaved = saveStatus === 'just-saved';
              const isSaving = saveStatus === 'saving';
              const disabled = isSaving || isSaved;

              let border: string;
              let color: string;
              if (isError) { border = "rgba(184,90,90,0.7)"; color = "#b85a5a"; }
              else if (isSaved) { border = "rgba(74,124,89,0.6)"; color = "#4a7c4a"; }
              else if (isDirty || isSaving) { border = "#c5a572"; color = "var(--ss-gold-deep)"; }
              else { border = "rgba(197,165,114,0.35)"; color = "rgba(45,40,36,0.45)"; }

              let label: React.ReactNode;
              if (isSaving) {
                label = (
                  <>
                    <span style={{ display: "inline-block", animation: "regenerateSpin 1s linear infinite" }}>↻</span>
                    <span>Saving…</span>
                  </>
                );
              } else if (isSaved && lastSavedAt) {
                const hh = String(lastSavedAt.getHours()).padStart(2, '0');
                const mm = String(lastSavedAt.getMinutes()).padStart(2, '0');
                label = <>✓ Saved {hh}:{mm}</>;
              } else if (isError) {
                label = 'Retry save';
              } else {
                label = 'Save changes';
              }

              return (
                <button
                  onClick={handleSave}
                  disabled={disabled}
                  style={{
                    background: "#faf7f2",
                    border: `1px solid ${border}`,
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color,
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "box-shadow 0.15s, transform 0.15s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "inherit",
                    lineHeight: 1.2,
                  }}
                  onMouseOver={(e) => {
                    if (isDirty && !isSaving && !isError && !isSaved) {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(197,165,114,0.2)";
                    }
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  {label}
                </button>
              );
            })()}
          </div>
        </>
      )}
      </div>
      <style>{`@keyframes regenerateSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  return createPortal(popover, document.body);
}
