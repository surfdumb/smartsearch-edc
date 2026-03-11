/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import IntroCard from "@/components/deck/IntroCard";
import DeckEDCView from "@/components/deck/DeckEDCView";
import { useDeckTheme } from "@/hooks/useDeckTheme";
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

  // Job Summary slide-over
  const [showJobSummary, setShowJobSummary] = useState(false);
  const jobSummaryUrl = data.job_summary_pdf_url;

  // ── Sync URL hash with selected candidate ─────────────────────────────────
  // On mount: if URL has #candidateId, jump straight to that EDC (no flip)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const index = data.candidates.findIndex((c) => c.candidate_id === hash);
    if (index !== -1) {
      setView({ mode: "edc", candidateIndex: index, split: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When view changes, update URL hash
  useEffect(() => {
    if (view.mode === "edc") {
      const candidateId = data.candidates[view.candidateIndex]?.candidate_id;
      if (candidateId) {
        const newHash = `#${candidateId}`;
        if (window.location.hash !== newHash) {
          window.history.pushState(null, "", newHash);
        }
      }
    } else if (view.mode === "grid") {
      if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [view, data.candidates]);

  // Handle browser back/forward
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const index = data.candidates.findIndex((c) => c.candidate_id === hash);
        if (index !== -1) {
          setView({ mode: "edc", candidateIndex: index, split: false });
          return;
        }
      }
      setView({ mode: "grid" });
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [data.candidates]);

  // ── Card flip handler ───────────────────────────────────────────────────────
  const handleCardClick = (index: number) => {
    setCandidateSlide(null);
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
      setView({ ...view, candidateIndex: view.candidateIndex - 1 });
    }
  }, [view]);

  const handleNext = useCallback(() => {
    if (view.mode === "edc" && view.candidateIndex < data.candidates.length - 1) {
      setCandidateSlide('right');
      setView({ ...view, candidateIndex: view.candidateIndex + 1 });
    }
  }, [view, data.candidates.length]);

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
          }}
        >
          <img
            src="/logos/smartsearch-white.png"
            alt="SmartSearch"
            style={{ height: "28px", opacity: 0.6 }}
          />
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
          {/* ── Left panel (search context sidebar) ── */}
          <div
            style={{
              width: "280px",
              minWidth: "280px",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(197,165,114,0.06)",
              background: "rgba(45,40,36,0.3)",
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
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
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
                    fontSize: "0.82rem",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.55)",
                    padding: "3px 0",
                    display: "flex",
                    gap: "8px",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "var(--ss-gold)", opacity: 0.5, fontWeight: 600, minWidth: "14px", fontSize: "0.75rem" }}>
                    {i + 1}.
                  </span>
                  {name}
                </li>
              ))}
            </ol>

            {/* Search Lead */}
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", marginBottom: "0" }}>
              Search Lead
            </p>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", fontWeight: 500, marginBottom: "0" }}>
              {data.search_lead}
            </p>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* View Job Summary button */}
            {jobSummaryUrl && (
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
                  marginBottom: "16px",
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
                View Job Summary →
              </button>
            )}

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
            style={{
              flex: 1,
              background: "#2d2824",
              padding: "32px 32px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Instructional text */}
            <p
              style={{
                fontSize: "0.88rem",
                fontWeight: 400,
                color: "rgba(255,255,255,0.45)",
                marginBottom: "24px",
              }}
            >
              Click any candidate to view their full assessment
            </p>

            {/* Card grid — flex wrap with fixed-width cards */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                alignContent: "flex-start",
              }}
            >
              {data.candidates.map((candidate, i) => (
                <div
                  key={candidate.candidate_id}
                  ref={(el) => { cardRefs.current[i] = el; }}
                  style={{ width: "250px" }}
                >
                  <IntroCard
                    card={candidate}
                    onClick={() => handleCardClick(i)}
                    editMode={editMode}
                  />
                </div>
              ))}
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

        {/* ── Job Summary slide-over ── */}
        {showJobSummary && jobSummaryUrl && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowJobSummary(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
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
                width: "580px",
                maxWidth: "90vw",
                background: "#1a1816",
                borderLeft: "1px solid rgba(197,165,114,0.15)",
                zIndex: 901,
                display: "flex",
                flexDirection: "column",
                animation: "slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
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
                }}
              >
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.3px" }}>
                  Job Summary
                </span>
                <button
                  onClick={() => setShowJobSummary(false)}
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
              {/* PDF iframe */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <iframe
                  src={jobSummaryUrl}
                  title="Job Summary"
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
  const candidate = data.candidates[view.candidateIndex];
  const prevCandidate = view.candidateIndex > 0
    ? data.candidates[view.candidateIndex - 1]
    : undefined;
  const nextCandidate = view.candidateIndex < data.candidates.length - 1
    ? data.candidates[view.candidateIndex + 1]
    : undefined;

  return (
    <DeckEDCView
      candidate={candidate}
      candidateIndex={view.candidateIndex}
      totalCount={data.candidates.length}
      split={view.split}
      searchId={searchId}
      isEditRoute={isEditRoute}
      prevCandidateName={prevCandidate?.candidate_name}
      nextCandidateName={nextCandidate?.candidate_name}
      candidateSlideFrom={candidateSlide}
      deckTheme={theme}
      onBack={handleBack}
      onPrev={view.candidateIndex > 0 ? handlePrev : undefined}
      onNext={view.candidateIndex < data.candidates.length - 1 ? handleNext : undefined}
      onToggleSplit={handleToggleSplit}
    />
  );
}
