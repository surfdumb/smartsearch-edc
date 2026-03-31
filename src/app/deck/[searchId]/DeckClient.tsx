/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import IntroCard from "@/components/deck/IntroCard";
import DeckEDCView from "@/components/deck/DeckEDCView";
import { useDeckTheme } from "@/hooks/useDeckTheme";
import { uploadFile, listBlobs, deleteBlob } from "@/lib/blob";
import { fileStoreGet, fileStoreRemove } from "@/lib/fileStore";
import type { SearchContext } from "@/lib/types";

type DeckView =
  | { mode: "grid" }
  | { mode: "flipping"; candidateIndex: number; cardRect: DOMRect }
  | { mode: "edc"; candidateIndex: number; split: boolean };

interface DeckClientProps {
  data: SearchContext;
  searchId: string;
  isEditRoute?: boolean;
}

export default function DeckClient({ data, searchId, isEditRoute = false }: DeckClientProps) {
  const [view, setView] = useState<DeckView>({ mode: "grid" });
  const [editMode, setEditMode] = useState(false);
  const [candidateSlide, setCandidateSlide] = useState<'left' | 'right' | null>(null);
  // EDC sub-state restored from / synced to URL hash (e.g. #candidateId/2/ourtake)
  const [initialPanel, setInitialPanel] = useState<1 | 2 | 3 | undefined>(undefined);
  const [initialOurTakeOpen, setInitialOurTakeOpen] = useState(false);
  const currentPanelRef = useRef<1 | 2 | 3>(1);
  const currentOurTakeRef = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useDeckTheme(searchId);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Client logo from localStorage or data ──────────────────────────────────
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`search_logo_${searchId}`);
      setClientLogo(stored ?? data.client_logo_url ?? null);
    } catch {
      setClientLogo(data.client_logo_url ?? null);
    }
  }, [searchId, data.client_logo_url]);

  // Job Summary slide-over — supports multiple PDFs
  const [showJobSummary, setShowJobSummary] = useState(false);
  const [jsFullScreen, setJsFullScreen] = useState(false);
  const [jobSummaryFiles, setJobSummaryFiles] = useState<{ name: string; url: string }[]>([]);
  const [currentPdfIdx, setCurrentPdfIdx] = useState(0);
  const jobSummaryFileRef = useRef<HTMLInputElement>(null);
  const jsStorageKey = `job_summary_pdfs_${searchId}`;

  // Load persisted Job Summary PDFs from Vercel Blob on mount
  // Also migrate old IndexedDB/localStorage data to Vercel Blob
  useEffect(() => {
    (async () => {
      try {
        // Check Vercel Blob first
        const blobs = await listBlobs(`job-summary/${searchId}/`);
        if (blobs.length > 0) {
          const files = blobs.map(b => ({
            name: b.pathname.split("/").pop()?.replace(/\.pdf$/i, "") || "Job Summary",
            url: b.url,
          }));
          setJobSummaryFiles(files);
          return;
        }

        // Migration: check IndexedDB for old data and upload to Vercel Blob
        const idbStored = await fileStoreGet<{ name: string; dataUrl: string }[]>(jsStorageKey);
        if (idbStored && idbStored.length > 0) {
          const migrated: { name: string; url: string }[] = [];
          for (const item of idbStored) {
            const response = await fetch(item.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `${item.name}.pdf`, { type: "application/pdf" });
            const result = await uploadFile(`job-summary/${searchId}/${item.name}.pdf`, file);
            migrated.push({ name: item.name, url: result.url });
          }
          setJobSummaryFiles(migrated);
          await fileStoreRemove(jsStorageKey);
          return;
        }
      } catch { /* storage/blob unavailable */ }
    })();
  }, [searchId, jsStorageKey]);

  const handleJobSummaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    const fileName = file.name.replace(/\.pdf$/i, "");

    try {
      const result = await uploadFile(`job-summary/${searchId}/${file.name}`, file);
      const newEntry = { name: fileName, url: result.url };
      setJobSummaryFiles(prev => {
        const updated = [...prev, newEntry];
        setCurrentPdfIdx(updated.length - 1);
        return updated;
      });

      // Fire-and-forget: sync criteria from uploaded JS PDF to Google Sheets
      fetch(`/api/deck/${searchId}/sync-criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: result.url }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log(`[sync-criteria] Synced ${data.criteriaCount} criteria for ${searchId}`);
          } else {
            console.warn('[sync-criteria] Sync failed:', data.error);
          }
        })
        .catch(err => console.error('[sync-criteria] Request failed:', err));
    } catch (err) {
      console.error("Job Summary upload failed:", err);
      alert("Upload failed. Please try again.");
    }

    // Reset input so re-uploading the same file triggers onChange
    e.target.value = "";
  };

  const handleRemoveJobSummary = async (idx: number) => {
    const removed = jobSummaryFiles[idx];
    if (removed?.url?.includes(".blob.vercel-storage.com/")) {
      try { await deleteBlob(removed.url); } catch { /* ignore */ }
    }
    setJobSummaryFiles(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (currentPdfIdx >= updated.length && updated.length > 0) {
        setCurrentPdfIdx(updated.length - 1);
      } else if (updated.length === 0) {
        setCurrentPdfIdx(0);
      }
      return updated;
    });
  };

  const hasJobSummary = jobSummaryFiles.length > 0;

  // ── Card reorder (edit mode only) ─────────────────────────────────────────
  const orderKey = `card_order_${searchId}`;
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [cardOrderReady, setCardOrderReady] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Load persisted order on mount — server-provided order takes priority
  useEffect(() => {
    const defaultOrder = data.candidates.map((c) => c.candidate_id);
    const validSet = new Set(defaultOrder);

    // Server-provided order takes priority (visible to all browsers)
    if (data.card_order?.length) {
      const filtered = data.card_order.filter((id) => validSet.has(id));
      const missing = defaultOrder.filter((id) => !filtered.includes(id));
      setCardOrder([...filtered, ...missing]);
      setCardOrderReady(true);
      return;
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(orderKey);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const filtered = parsed.filter((id) => validSet.has(id));
        const missing = defaultOrder.filter((id) => !filtered.includes(id));
        setCardOrder([...filtered, ...missing]);
      } else {
        setCardOrder(defaultOrder);
      }
    } catch {
      setCardOrder(defaultOrder);
    }
    setCardOrderReady(true);
  }, [data.candidates, data.card_order, orderKey]);

  // Filter candidates by status when candidate_statuses is defined
  // Only show candidates that have a status entry (e.g., "to_send")
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const shortlistCount = data.candidate_statuses
    ? data.candidates.filter((c) => c.candidate_id in (data.candidate_statuses || {})).length
    : data.candidates.length;
  const hasFilter = data.candidate_statuses && shortlistCount < data.candidates.length;
  const visibleCandidates = (hasFilter && !showAllCandidates)
    ? data.candidates.filter((c) => c.candidate_id in (data.candidate_statuses || {}))
    : data.candidates;

  // Derive ordered candidates
  const orderedCandidates = cardOrder.length > 0
    ? cardOrder
        .map((id) => visibleCandidates.find((c) => c.candidate_id === id))
        .filter(Boolean) as typeof visibleCandidates
    : visibleCandidates;

  const persistOrder = useCallback((newOrder: string[]) => {
    setCardOrder(newOrder);
    try { localStorage.setItem(orderKey, JSON.stringify(newOrder)); } catch { /* ignore */ }
    // Also save to server for client view (fire-and-forget)
    fetch(`/api/deck/${searchId}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder }),
    }).catch(() => { /* ignore — localStorage is the fallback */ });
  }, [orderKey, searchId]);

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx !== null && idx !== dragIdx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const newOrder = [...cardOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    persistOrder(newOrder);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // ── Sync URL hash with selected candidate ─────────────────────────────────
  // On mount: if URL has #candidateId (or #candidateId/panel/ourtake), jump to that EDC
  // Wait for cardOrderReady so the index lookup uses the correct ordering
  useEffect(() => {
    if (!cardOrderReady) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const parts = hash.split('/');
    const candidateId = parts[0];
    const panel = parts[1] ? parseInt(parts[1], 10) : undefined;
    const ourTake = parts[2] === 'ourtake';
    const index = orderedCandidates.findIndex((c) => c.candidate_id === candidateId);
    if (index !== -1) {
      if (panel && panel >= 1 && panel <= 3) setInitialPanel(panel as 1 | 2 | 3);
      setInitialOurTakeOpen(ourTake);
      setView({ mode: "edc", candidateIndex: index, split: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOrderReady]);

  // Build and sync URL hash with candidate + panel + ourtake state
  // Don't clear hash until cardOrder is ready (otherwise initial grid render wipes it before restore)
  const updateHash = useCallback(() => {
    if (view.mode === "edc") {
      const candidateId = orderedCandidates[view.candidateIndex]?.candidate_id;
      if (candidateId) {
        let hash = `#${candidateId}/${currentPanelRef.current}`;
        if (currentOurTakeRef.current) hash += '/ourtake';
        if (window.location.hash !== hash) {
          window.history.replaceState(null, "", hash);
        }
      }
    } else if (view.mode === "grid" && cardOrderReady) {
      if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [view, orderedCandidates, cardOrderReady]);

  // When view changes, update URL hash
  useEffect(() => { updateHash(); }, [updateHash]);

  const handlePanelChange = useCallback((panel: 1 | 2 | 3) => {
    currentPanelRef.current = panel;
    updateHash();
  }, [updateHash]);

  const handleOurTakeChange = useCallback((open: boolean) => {
    currentOurTakeRef.current = open;
    updateHash();
  }, [updateHash]);

  // Handle browser back/forward
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const parts = hash.split('/');
        const candidateId = parts[0];
        const panel = parts[1] ? parseInt(parts[1], 10) : undefined;
        const ourTake = parts[2] === 'ourtake';
        const index = orderedCandidates.findIndex((c) => c.candidate_id === candidateId);
        if (index !== -1) {
          if (panel && panel >= 1 && panel <= 3) setInitialPanel(panel as 1 | 2 | 3);
          setInitialOurTakeOpen(ourTake);
          setView({ mode: "edc", candidateIndex: index, split: false });
          return;
        }
      }
      setView({ mode: "grid" });
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [orderedCandidates]);

  // ── Card flip handler ───────────────────────────────────────────────────────
  const handleCardClick = (index: number) => {
    setCandidateSlide(null);
    setInitialPanel(undefined);
    setInitialOurTakeOpen(false);
    currentPanelRef.current = 1;
    currentOurTakeRef.current = false;
    const el = cardRefs.current[index];
    if (!el) {
      // Fallback: skip animation
      setView({ mode: "edc", candidateIndex: index, split: false });
      return;
    }
    const rect = el.getBoundingClientRect();
    setView({ mode: "flipping", candidateIndex: index, cardRect: rect });
  };

  // Once flip animation completes, switch to edc mode
  useEffect(() => {
    if (view.mode !== "flipping") return;
    const timer = setTimeout(() => {
      setView({ mode: "edc", candidateIndex: view.candidateIndex, split: false });
    }, 750);
    return () => clearTimeout(timer);
  }, [view]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleBack = () => setView({ mode: "grid" });

  const handlePrev = useCallback(() => {
    if (view.mode === "edc" && view.candidateIndex > 0) {
      setCandidateSlide('left');
      setInitialPanel(undefined);
      setInitialOurTakeOpen(false);
      currentPanelRef.current = 1;
      currentOurTakeRef.current = false;
      setView({ ...view, candidateIndex: view.candidateIndex - 1 });
    }
  }, [view]);

  const handleNext = useCallback(() => {
    if (view.mode === "edc" && view.candidateIndex < orderedCandidates.length - 1) {
      setCandidateSlide('right');
      setInitialPanel(undefined);
      setInitialOurTakeOpen(false);
      currentPanelRef.current = 1;
      currentOurTakeRef.current = false;
      setView({ ...view, candidateIndex: view.candidateIndex + 1 });
    }
  }, [view, orderedCandidates.length]);

  const handleToggleSplit = useCallback(() => {
    if (view.mode === "edc") {
      setView({ ...view, split: !view.split });
    }
  }, [view]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "Escape" && view.mode === "edc") { e.preventDefault(); handleBack(); }
      if (e.key === "ArrowLeft" && e.shiftKey && view.mode === "edc") { e.preventDefault(); handlePrev(); }
      if (e.key === "ArrowRight" && e.shiftKey && view.mode === "edc") { e.preventDefault(); handleNext(); }
      if (e.key === "s" && view.mode === "edc" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleToggleSplit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, handlePrev, handleNext, handleToggleSplit]);

  // ── FLIP ANIMATION OVERLAY ──────────────────────────────────────────────────
  if (view.mode === "flipping") {
    const { cardRect } = view;
    // Target: centred, full-width up to 820px
    const vpW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vpH = typeof window !== "undefined" ? window.innerHeight : 800;
    const targetW = Math.min(820, vpW - 48);
    const targetH = Math.min(700, vpH - 80);
    const targetLeft = (vpW - targetW) / 2;
    const targetTop = (vpH - targetH) / 2;

    return (
      <>
        {/* Dimmed background */}
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1999,
            background: "rgba(0,0,0,0.6)",
            animation: "fadeInOverlay 0.2s ease forwards",
          }}
        />

        {/* Flying card — animates from card position to centre, flipping 180° */}
        <div
          style={{
            position: "fixed",
            zIndex: 2000,
            left: cardRect.left,
            top: cardRect.top,
            width: cardRect.width,
            height: cardRect.height,
            background: "var(--ss-header-bg)",
            borderRadius: "16px",
            border: "1px solid rgba(197,165,114,0.35)",
            boxShadow: "0 30px 100px rgba(0,0,0,0.5)",
            animation: `cardFly 0.75s cubic-bezier(0.4, 0, 0.2, 1) 0.05s forwards`,
          }}
        >
          {/* Gold shimmer on the flying card */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(circle at 70% 30%, rgba(197,165,114,0.12) 0%, transparent 70%)",
            borderRadius: "16px",
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(197,165,114,0.5), transparent)",
          }} />
        </div>

        <style>{`
          @keyframes fadeInOverlay {
            from { opacity: 0; } to { opacity: 1; }
          }
          @keyframes cardFly {
            0%   { transform: translate(0,0) scale(1) rotateY(0deg); }
            30%  { transform: translate(0,0) scale(1.03) rotateY(0deg); box-shadow: 0 40px 120px rgba(0,0,0,0.6); }
            100% {
              transform:
                translate(
                  calc(${targetLeft}px - ${cardRect.left}px),
                  calc(${targetTop}px - ${cardRect.top}px)
                )
                scaleX(${targetW / cardRect.width})
                scaleY(${targetH / cardRect.height})
                rotateY(180deg);
            }
          }
        `}</style>
      </>
    );
  }

  // ── GRID VIEW ───────────────────────────────────────────────────────────────
  if (view.mode === "grid") {
    return (
      <main data-deck-theme={theme} style={{ minHeight: "100vh", background: "#1a1816", display: "flex", flexDirection: "column" }}>
        {/* ── Top bar ── */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid rgba(197,165,114,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src="/logos/smartsearch-white.png"
              alt="SmartSearch"
              style={{ height: "28px", opacity: 0.6 }}
            />
          </div>
          {/* Centered "Executive Decision Deck" — gold, prominent */}
          <span className="font-cormorant" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "1.75rem", fontWeight: 400, letterSpacing: "0.5px", color: "rgba(197,165,114,0.75)", whiteSpace: "nowrap" }}>
            Executive Decision
            <span style={{ fontWeight: 600, color: "var(--ss-gold)", marginLeft: "7px" }}>Deck</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isEditRoute ? (
              <>
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(201,149,58,0.6)",
                    background: "rgba(201,149,58,0.06)",
                    border: "1px solid rgba(201,149,58,0.15)",
                    borderRadius: "5px",
                    padding: "3px 8px",
                  }}
                >
                  Edit
                </span>
                <button
                  onClick={() => setEditMode((v) => !v)}
                  style={{
                    background: editMode ? "rgba(197,165,114,0.10)" : "transparent",
                    border: `1px solid ${editMode ? "rgba(197,165,114,0.35)" : "rgba(197,165,114,0.12)"}`,
                    borderRadius: "6px",
                    padding: "4px 12px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: editMode ? "var(--ss-gold)" : "rgba(197,165,114,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {editMode ? "Editing" : "Edit Cards"}
                </button>
                <a
                  href={`/deck/${searchId}`}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: "rgba(197,165,114,0.4)",
                    textDecoration: "none",
                    padding: "4px 12px",
                    border: "1px solid rgba(197,165,114,0.10)",
                    borderRadius: "6px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.4)"; }}
                >
                  Client View
                </a>
              </>
            ) : null}
            {isEditRoute && (
              <a
                href={`/deck/${searchId}/settings`}
                title="Deck settings"
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(197,165,114,0.3)",
                  textDecoration: "none",
                  padding: "4px 6px",
                  borderRadius: "6px",
                  transition: "color 0.2s",
                  lineHeight: 1,
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.3)"; }}
              >
                ⚙
              </a>
            )}
          </div>
        </div>

        {/* ── Two-panel layout ── */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* ── Left panel (search context sidebar) — collapsible ── */}
          <div
            style={{
              width: sidebarCollapsed ? "0px" : "280px",
              minWidth: sidebarCollapsed ? "0px" : "280px",
              padding: sidebarCollapsed ? "0" : "32px 28px",
              display: "flex",
              flexDirection: "column",
              overflowY: sidebarCollapsed ? "hidden" : "auto",
              overflowX: "hidden",
              borderRight: sidebarCollapsed ? "none" : "1px solid rgba(197,165,114,0.06)",
              background: "rgba(45,40,36,0.3)",
              transition: "width 0.25s ease, min-width 0.25s ease, padding 0.25s ease",
            }}
          >
            {/* Client logo */}
            {clientLogo && (
              <div style={{ marginBottom: "24px" }}>
                <img
                  src={clientLogo}
                  alt={data.client_company}
                  style={{ maxHeight: "44px", maxWidth: "160px", objectFit: "contain", opacity: 0.85 }}
                />
              </div>
            )}

            {/* Role title */}
            <h1
              className="font-cormorant"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.2,
                marginBottom: "6px",
              }}
            >
              {data.search_name}
            </h1>

            {/* Company + Location */}
            <p style={{ fontSize: "0.85rem", color: "var(--ss-gold)", marginBottom: "2px", fontWeight: 500 }}>
              {data.client_company}
            </p>
            {data.client_location && (
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: "0" }}>
                {data.client_location}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(197,165,114,0.08)", margin: "20px 0" }} />

            {/* Key Criteria */}
            <p
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                marginBottom: "10px",
              }}
            >
              Key Criteria
            </p>
            <ol style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0" }}>
              {data.key_criteria_names.map((name, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.72)",
                    padding: "3px 0",
                    display: "flex",
                    gap: "8px",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "var(--ss-gold)", opacity: 0.65, fontWeight: 600, minWidth: "14px", fontSize: "0.78rem" }}>
                    {i + 1}.
                  </span>
                  {name}
                </li>
              ))}
            </ol>

            {/* Search Lead */}
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginBottom: "0" }}>
              Search Lead
            </p>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.65)", fontWeight: 500, marginBottom: "0" }}>
              {data.search_lead}
            </p>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(197,165,114,0.08)", margin: "20px 0" }} />

            {/* View Job Summary button — or upload prompt */}
            {hasJobSummary ? (
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <button
                  onClick={() => setShowJobSummary(true)}
                  style={{
                    background: "rgba(197,165,114,0.06)",
                    border: "1px solid rgba(197,165,114,0.15)",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--ss-gold)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.10)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.3)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.15)";
                  }}
                >
                  View Job Summary{jobSummaryFiles.length > 1 ? ` (${jobSummaryFiles.length} files)` : ""} →
                </button>
                {isEditRoute && (
                  <button
                    onClick={() => jobSummaryFileRef.current?.click()}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(197,165,114,0.12)",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "0.68rem",
                      fontWeight: 500,
                      color: "rgba(197,165,114,0.35)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "center",
                      width: "100%",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.35)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.12)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.35)";
                    }}
                  >
                    + Add another PDF
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => jobSummaryFileRef.current?.click()}
                style={{
                  background: "transparent",
                  border: "1px dashed rgba(197,165,114,0.2)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "rgba(197,165,114,0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                  width: "100%",
                  marginBottom: "16px",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)";
                }}
              >
                + Upload Job Summary PDF
              </button>
            )}
            <input
              ref={jobSummaryFileRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handleJobSummaryUpload}
            />

            {/* Spacer to push footer down */}
            <div style={{ flex: 1, minHeight: "16px" }} />

            {/* SmartSearch footer in sidebar */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(197,165,114,0.06)" }}>
              <img
                src="/logos/smartsearch-white.png"
                alt="SmartSearch"
                style={{ height: "18px", opacity: 0.25 }}
              />
              <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.12)", marginTop: "4px" }}>
                &copy; 2026 SmartSearch
              </p>
            </div>
          </div>

          {/* ── Right panel (candidate cards) ── */}
          <div
            className="deck-card-grid-scroll"
            style={{
              flex: 1,
              background: "#2d2824",
              padding: "32px 32px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {/* Sidebar collapse/expand toggle */}
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                background: "rgba(197,165,114,0.06)",
                border: "1px solid rgba(197,165,114,0.12)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "rgba(197,165,114,0.4)",
                cursor: "pointer",
                zIndex: 5,
                transition: "all 0.2s",
                lineHeight: 1,
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.35)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.12)";
              }}
            >
              {sidebarCollapsed ? "▶" : "◀"}
            </button>
            {/* Instructional text */}
            <p
              style={{
                fontSize: "0.92rem",
                fontWeight: 400,
                color: "rgba(255,255,255,0.6)",
                marginTop: "32px",
                marginBottom: "24px",
              }}
            >
              Click any candidate to view their full assessment
            </p>

            {/* Show all / filtered toggle (edit mode only, when statuses exist) */}
            {isEditRoute && hasFilter && (
              <button
                onClick={() => setShowAllCandidates(v => !v)}
                style={{
                  background: showAllCandidates ? "rgba(197,165,114,0.10)" : "transparent",
                  border: `1px solid ${showAllCandidates ? "rgba(197,165,114,0.35)" : "rgba(197,165,114,0.12)"}`,
                  borderRadius: "6px",
                  padding: "5px 14px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: showAllCandidates ? "var(--ss-gold)" : "rgba(197,165,114,0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginBottom: "16px",
                }}
              >
                {showAllCandidates
                  ? `Showing all ${data.candidates.length} — Show shortlist (${shortlistCount})`
                  : `Showing ${shortlistCount} of ${data.candidates.length} — Show all`}
              </button>
            )}

            {/* Card grid — flex wrap with fixed-width cards */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                alignContent: "flex-start",
              }}
            >
              {(() => {
                const elements: React.ReactNode[] = [];
                orderedCandidates.forEach((candidate, i) => {
                  // Insert hatched drop zone placeholder BEFORE this card
                  if (editMode && dragIdx !== null && dragOverIdx === i && dragIdx !== i) {
                    elements.push(
                      <div
                        key="drop-zone"
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                        onDrop={handleDrop(i)}
                        style={{
                          width: "310px",
                          minHeight: "280px",
                          borderRadius: "14px",
                          border: "2px dashed rgba(197,165,114,0.30)",
                          background: `repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(197,165,114,0.05) 10px, rgba(197,165,114,0.05) 20px)`,
                          transition: "all 0.15s ease",
                        }}
                      />
                    );
                  }

                  elements.push(
                    <div
                      key={candidate.candidate_id}
                      ref={(el) => { cardRefs.current[i] = el; }}
                      draggable={editMode}
                      onDragStart={editMode ? handleDragStart(i) : undefined}
                      onDragOver={editMode ? handleDragOver(i) : undefined}
                      onDrop={editMode ? handleDrop(i) : undefined}
                      onDragEnd={editMode ? handleDragEnd : undefined}
                      style={{
                        width: "310px",
                        opacity: dragIdx === i ? 0.3 : 1,
                        transition: "opacity 0.15s",
                        borderRadius: "14px",
                        cursor: editMode ? (dragIdx === i ? "grabbing" : "grab") : undefined,
                      }}
                    >
                      <IntroCard
                        card={candidate}
                        onClick={() => handleCardClick(i)}
                        editMode={editMode}
                      />
                    </div>
                  );
                });

                // Handle drop zone at the END (dropping after the last card)
                if (editMode && dragIdx !== null && dragOverIdx !== null && dragOverIdx >= orderedCandidates.length) {
                  elements.push(
                    <div
                      key="drop-zone-end"
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={handleDrop(orderedCandidates.length)}
                      style={{
                        width: "310px",
                        minHeight: "280px",
                        borderRadius: "14px",
                        border: "2px dashed rgba(197,165,114,0.30)",
                        background: `repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(197,165,114,0.05) 10px, rgba(197,165,114,0.05) 20px)`,
                      }}
                    />
                  );
                }

                return elements;
              })()}
            </div>

            {/* Spacer + subtle footer */}
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: "center", padding: "32px 0 8px", opacity: 0.15 }}>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                Confidential
              </span>
            </div>
          </div>
        </div>

        {/* ── Job Summary slide-over (multi-PDF) ── */}
        {showJobSummary && hasJobSummary && (
          <>
            {/* Backdrop — no blur */}
            <div
              onClick={() => setShowJobSummary(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                zIndex: 900,
                animation: "fadeInOverlay 0.2s ease forwards",
              }}
            />
            {/* Panel */}
            <div
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: jsFullScreen ? "100vw" : "62vw",
                maxWidth: jsFullScreen ? "100vw" : "90vw",
                background: "#1a1816",
                borderLeft: jsFullScreen ? "none" : "1px solid rgba(197,165,114,0.15)",
                zIndex: 901,
                display: "flex",
                flexDirection: "column",
                animation: "slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                transition: "width 0.25s ease",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid rgba(197,165,114,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                    Job Summary
                  </span>
                  {/* File name + navigation when multiple */}
                  {jobSummaryFiles.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => setCurrentPdfIdx(prev => Math.max(0, prev - 1))}
                        disabled={currentPdfIdx === 0}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: currentPdfIdx === 0 ? "rgba(255,255,255,0.15)" : "var(--ss-gold)",
                          cursor: currentPdfIdx === 0 ? "default" : "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          transition: "color 0.15s",
                        }}
                      >
                        ‹
                      </button>
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                        {jobSummaryFiles[currentPdfIdx]?.name} ({currentPdfIdx + 1}/{jobSummaryFiles.length})
                      </span>
                      <button
                        onClick={() => setCurrentPdfIdx(prev => Math.min(jobSummaryFiles.length - 1, prev + 1))}
                        disabled={currentPdfIdx === jobSummaryFiles.length - 1}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: currentPdfIdx === jobSummaryFiles.length - 1 ? "rgba(255,255,255,0.15)" : "var(--ss-gold)",
                          cursor: currentPdfIdx === jobSummaryFiles.length - 1 ? "default" : "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          transition: "color 0.15s",
                        }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                  {/* Show name for single file too */}
                  {jobSummaryFiles.length === 1 && (
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {jobSummaryFiles[0].name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  {isEditRoute && (
                    <>
                      <button
                        onClick={() => jobSummaryFileRef.current?.click()}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(197,165,114,0.12)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: "rgba(197,165,114,0.4)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)"; }}
                      >
                        + Add
                      </button>
                      <button
                        onClick={() => {
                          handleRemoveJobSummary(currentPdfIdx);
                          if (jobSummaryFiles.length <= 1) setShowJobSummary(false);
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(197,165,114,0.12)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: "rgba(197,165,114,0.3)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,120,120,0.7)"; }}
                        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.3)"; }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setJsFullScreen(f => !f)}
                    title={jsFullScreen ? "Exit full screen" : "Full screen"}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(197,165,114,0.12)",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      color: "rgba(197,165,114,0.4)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)"; }}
                  >
                    {jsFullScreen ? "Exit ⊡" : "Full ⊞"}
                  </button>
                  <button
                    onClick={() => { setShowJobSummary(false); setJsFullScreen(false); }}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(197,165,114,0.15)",
                      borderRadius: "6px",
                      padding: "4px 12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "rgba(197,165,114,0.5)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold)"; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)"; }}
                  >
                    Close ✕
                  </button>
                </div>
              </div>
              {/* PDF iframe */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <iframe
                  src={jobSummaryFiles[currentPdfIdx]?.url ?? ""}
                  title={jobSummaryFiles[currentPdfIdx]?.name ?? "Job Summary"}
                  style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
                />
              </div>
            </div>
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
          </>
        )}
      </main>
    );
  }

  // ── EDC VIEW ────────────────────────────────────────────────────────────────
  const candidate = orderedCandidates[view.candidateIndex];
  const prevCandidate = view.candidateIndex > 0
    ? orderedCandidates[view.candidateIndex - 1]
    : undefined;
  const nextCandidate = view.candidateIndex < orderedCandidates.length - 1
    ? orderedCandidates[view.candidateIndex + 1]
    : undefined;

  return (
    <DeckEDCView
      candidate={candidate}
      candidateIndex={view.candidateIndex}
      totalCount={orderedCandidates.length}
      split={view.split}
      searchId={searchId}
      isEditRoute={isEditRoute}
      prevCandidateName={prevCandidate?.candidate_name}
      nextCandidateName={nextCandidate?.candidate_name}
      candidateSlideFrom={candidateSlide}
      deckTheme={theme}
      onBack={handleBack}
      onPrev={view.candidateIndex > 0 ? handlePrev : undefined}
      onNext={view.candidateIndex < orderedCandidates.length - 1 ? handleNext : undefined}
      onToggleSplit={handleToggleSplit}
      initialPanel={initialPanel}
      initialOurTakeOpen={initialOurTakeOpen}
      onPanelChange={handlePanelChange}
      onOurTakeChange={handleOurTakeChange}
    />
  );
}
