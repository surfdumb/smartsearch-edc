/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchContextHeader from "@/components/deck/SearchContextHeader";
import IntroCard from "@/components/deck/IntroCard";
import CandidateGrid from "@/components/deck/CandidateGrid";
import DeckEDCView from "@/components/deck/DeckEDCView";
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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      setView({ ...view, candidateIndex: view.candidateIndex - 1 });
    }
  }, [view]);

  const handleNext = useCallback(() => {
    if (view.mode === "edc" && view.candidateIndex < data.candidates.length - 1) {
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
      <main style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: "20px" }}>
        {/* Sticky header */}
        <div
          className="deck-sticky-header"
          style={{
            padding: "16px 32px",
            borderBottom: "1px solid rgba(197,165,114,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(180deg, rgba(45, 40, 36, 0.3) 0%, transparent 100%)",
          }}
        >
          <img
            src="/logos/smartsearch-white.png"
            alt="SmartSearch"
            style={{ height: "24px", opacity: 0.55 }}
          />
          <span
            className="deck-header-title font-cormorant"
            style={{ fontSize: "1.05rem", color: "var(--ss-gold)", letterSpacing: "0.5px" }}
          >
            Executive <em style={{ fontStyle: "italic" }}>Decision</em> Deck
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isEditRoute ? (
              <>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(201,149,58,0.7)",
                    background: "rgba(201,149,58,0.08)",
                    border: "1px solid rgba(201,149,58,0.2)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                  }}
                >
                  Edit Mode
                </span>
                <button
                  onClick={() => setEditMode((v) => !v)}
                  style={{
                    background: editMode ? "rgba(197,165,114,0.12)" : "transparent",
                    border: `1px solid ${editMode ? "rgba(197,165,114,0.45)" : "rgba(197,165,114,0.15)"}`,
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: editMode ? "var(--ss-gold)" : "rgba(197,165,114,0.5)",
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                    transition: "all 0.2s",
                  }}
                >
                  {editMode ? "Cards: On" : "Cards: Off"}
                </button>
                <a
                  href={`/deck/${searchId}`}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "rgba(197,165,114,0.45)",
                    textDecoration: "none",
                    letterSpacing: "0.5px",
                    padding: "6px 14px",
                    border: "1px solid rgba(197,165,114,0.12)",
                    borderRadius: "8px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.35)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.45)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.12)";
                  }}
                >
                  Client View →
                </a>
              </>
            ) : null}
            <a
              href={isEditRoute ? `/deck/${searchId}/edit/compare` : `/deck/${searchId}/compare`}
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "rgba(197,165,114,0.6)",
                textDecoration: "none",
                letterSpacing: "0.5px",
                padding: "6px 14px",
                border: "1px solid rgba(197,165,114,0.15)",
                borderRadius: "8px",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.4)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.6)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(197,165,114,0.15)";
              }}
            >
              Compare All →
            </a>
            {isEditRoute && (
              <a
                href={`/deck/${searchId}/settings`}
                title="Deck settings"
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(197,165,114,0.35)",
                  textDecoration: "none",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  transition: "color 0.2s",
                  lineHeight: 1,
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ss-gold)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(197,165,114,0.35)";
                }}
              >
                ⚙
              </a>
            )}
          </div>
        </div>

        <div className="deck-main-pad" style={{ padding: "40px 24px" }}>
          <SearchContextHeader
            search_name={data.search_name}
            client_company={data.client_company}
            client_location={data.client_location}
            key_criteria_names={data.key_criteria_names}
            search_lead={data.search_lead}
            client_logo_url={data.client_logo_url}
            searchId={searchId}
          />

          <p
            className="font-cormorant"
            style={{
              textAlign: "center",
              fontSize: "1.05rem",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.25)",
              marginBottom: "32px",
            }}
          >
            Click any candidate to view their full assessment
          </p>

          <CandidateGrid>
            {data.candidates.map((candidate, i) => (
              <div
                key={candidate.candidate_id}
                ref={(el) => { cardRefs.current[i] = el; }}
                style={{ height: "100%" }}
              >
                <IntroCard
                  card={candidate}
                  onClick={() => handleCardClick(i)}
                  editMode={editMode}
                />
              </div>
            ))}
          </CandidateGrid>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "48px 24px 32px" }}>
          <span
            className="font-cormorant"
            style={{
              display: "block",
              fontStyle: "italic",
              fontSize: "0.95rem",
              color: "rgba(255,255,255,0.2)",
              marginBottom: "8px",
            }}
          >
            Show Evidence. Let Humans Judge.
          </span>
          <span style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.15)" }}>
            SmartSearch &copy; 2026
          </span>
        </div>
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
      onBack={handleBack}
      onPrev={view.candidateIndex > 0 ? handlePrev : undefined}
      onNext={view.candidateIndex < data.candidates.length - 1 ? handleNext : undefined}
      onToggleSplit={handleToggleSplit}
    />
  );
}
