"use client";

import { useState, useEffect, useRef } from "react";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
// WhyInterested removed — motivation now lives in MotivationStrip scrambler
import Miscellaneous from "@/components/edc/Miscellaneous";
import EDCFooter from "@/components/edc/EDCFooter";
import TabNavigation from "@/components/edc/TabNavigation";
import MotivationStrip from "@/components/edc/MotivationStrip";
import OurTakePopover from "@/components/edc/OurTakePopover";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { type EDCData, type EDCContext } from "@/lib/types";

interface DeckSettings {
  our_take_display?: 'SHOW' | 'HIDE';
  scope_narrative_display?: 'SHOW' | 'HIDE';
}

interface EDCCardProps {
  data: EDCData;
  /** When true, card stretches to 100% (for split view) */
  fluid?: boolean;
  /** Controls which header fields are rendered */
  context?: EDCContext;
  /** Used to namespace localStorage edits/toggles per candidate */
  candidateId?: string;
  /** Search ID — passed through to photo upload */
  searchId?: string;
  /** Deck-level settings for toggling sections */
  deckSettings?: DeckSettings;
  /** Swipe callbacks for candidate navigation */
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  /** Direction the new candidate content should enter from */
  candidateSlideFrom?: 'left' | 'right' | null;
}

export default function EDCCard({
  data,
  fluid = false,
  context = 'standalone',
  candidateId,
  searchId,
  deckSettings,
  onSwipePrev,
  onSwipeNext,
  candidateSlideFrom,
}: EDCCardProps) {
  const [currentPanel, setCurrentPanel] = useState<1 | 2 | 3>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [ourTakeOpen, setOurTakeOpen] = useState(false);
  const ourTakeTriggerRef = useRef<HTMLButtonElement>(null);

  // Header field edits — persisted in localStorage
  const headerKey = candidateId ? `edc_edit_${candidateId}_header` : null;
  type HeaderEdits = { candidate_name?: string; current_title?: string; current_company?: string; location?: string };
  const [headerEdits, setHeaderEdits] = useState<HeaderEdits>(() => {
    if (headerKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(headerKey);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return {};
  });
  const handleHeaderFieldUpdate = (field: keyof HeaderEdits, value: string) => {
    setHeaderEdits(prev => {
      const next = { ...prev, [field]: value };
      if (headerKey) {
        try { localStorage.setItem(headerKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  };

  // Photo upload state — persisted in localStorage (blob URLs are small)
  const photoKey = candidateId ? `edc_photo_${candidateId}` : null;
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(() => {
    if (!photoKey || typeof window === 'undefined') return null;
    try { return localStorage.getItem(photoKey); } catch { return null; }
  });
  const handlePhotoUpload = (blobUrl: string) => {
    setUploadedPhoto(blobUrl);
    if (photoKey) {
      try { localStorage.setItem(photoKey, blobUrl); } catch { /* ignore */ }
    }
  };

  // Reset to panel 1 when candidate changes
  useEffect(() => {
    setCurrentPanel(1);
    setOurTakeOpen(false);
    // Load persisted photo for new candidate
    if (photoKey) {
      try { setUploadedPhoto(localStorage.getItem(photoKey)); } catch { /* ignore */ }
    } else {
      setUploadedPhoto(null);
    }
    // Load persisted header edits
    if (headerKey) {
      try {
        const stored = localStorage.getItem(headerKey);
        setHeaderEdits(stored ? JSON.parse(stored) : {});
      } catch { setHeaderEdits({}); }
    } else {
      setHeaderEdits({});
    }
  }, [candidateId, photoKey, headerKey]);

  const navigateToPanel = (target: 1 | 2 | 3) => {
    if (target === currentPanel) return;
    setSlideDirection(target > currentPanel ? 'right' : 'left');
    setCurrentPanel(target);
  };

  const showNarrative = deckSettings?.scope_narrative_display !== 'HIDE';

  // Swipe detection for candidate navigation
  const swipeRef = useSwipeNavigation({
    onSwipeLeft: onSwipeNext,   // swipe left → next candidate
    onSwipeRight: onSwipePrev,  // swipe right → prev candidate
  });

  // Determine the CSS class for the candidate enter animation
  const candidateAnimClass = candidateSlideFrom === 'left'
    ? 'candidate-enter-left'
    : candidateSlideFrom === 'right'
      ? 'candidate-enter-right'
      : '';

  const hasOurTake = (data.our_take_fragments && data.our_take_fragments.length > 0) ||
    (data.our_take?.text && data.our_take.text.trim().length > 0);

  return (
    <div
      className="edc-card font-outfit"
      style={{
        position: "relative",
        maxWidth: fluid ? "100%" : "820px",
        margin: "0 auto",
        borderRadius: "var(--edc-card-radius)",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(197,165,114,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 30px 100px rgba(0,0,0,0.4), 0 0 120px rgba(197,165,114,0.04)",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 140px)",
        minHeight: "520px",
        maxHeight: "720px",
      }}
    >
      {/* ── Swipeable zone: header → motivation → ticker → content ────── */}
      <div
        ref={swipeRef}
        style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        <div key={candidateId} className={candidateAnimClass} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <EDCHeader
            candidate_name={headerEdits.candidate_name ?? data.candidate_name}
            current_title={headerEdits.current_title ?? data.current_title}
            current_company={headerEdits.current_company ?? data.current_company}
            location={headerEdits.location ?? data.location}
            photo_url={uploadedPhoto || data.photo_url || (candidateId ? `/photos/${candidateId}.jpg` : undefined)}
            context={context}
            candidateId={candidateId}
            searchId={searchId}
            onPhotoUpload={handlePhotoUpload}
            onFieldUpdate={handleHeaderFieldUpdate}
          />

          {/* Motivation scrambler — visible only when real motivation data exists */}
          {data.why_interested && data.why_interested.length > 0 &&
           !data.why_interested.every(w => w.headline === 'See candidate overview' || !w.headline) && (
            <MotivationStrip
              why_interested={data.why_interested}
              our_take_fragments={data.our_take_fragments}
            />
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {/* Our Take pill — persistent across all panels, top-right */}
            {hasOurTake && (
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "32px",
                  display: "flex",
                  gap: "8px",
                  zIndex: 10,
                }}
              >
                <button
                  ref={ourTakeTriggerRef}
                  onClick={() => setOurTakeOpen(v => !v)}
                  className={ourTakeOpen ? "" : "our-take-glow"}
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    color: "var(--ss-gold)",
                    background: ourTakeOpen ? "rgba(197,165,114,0.14)" : "rgba(250,248,245,0.97)",
                    border: "1.5px solid rgba(197,165,114,0.4)",
                    borderRadius: "22px",
                    padding: "8px 20px",
                    height: "38px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    letterSpacing: "0.3px",
                  }}
                  onMouseOver={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = "rgba(197,165,114,0.14)";
                    btn.style.borderColor = "rgba(197,165,114,0.6)";
                    btn.style.transform = "scale(1.03)";
                  }}
                  onMouseOut={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = ourTakeOpen ? "rgba(197,165,114,0.14)" : "rgba(250,248,245,0.97)";
                    btn.style.borderColor = "rgba(197,165,114,0.4)";
                    btn.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ animation: "ourTakeShimmer 2s ease-in-out infinite" }}>✦</span>
                  Our Take
                </button>
              </div>
            )}

            <div
              className={`criteria-scroll ${slideDirection === 'right' ? 'panel-enter-right' : 'panel-enter-left'}`}
              style={{
                height: "100%",
                minHeight: "200px",
                background: "white",
              }}
            >
            {/* Scroll fade indicator — signals content extends below */}
            <div className="scroll-fade-indicator" />
              {/* All tabs stay mounted to preserve edit state across tab switches */}
              <div style={{ display: currentPanel === 1 ? 'block' : 'none' }}>
                <ScopeMatch
                  scope_match={data.scope_match}
                  scope_seasoning={showNarrative ? data.scope_seasoning : undefined}
                  candidateId={candidateId}
                />
              </div>

              <div style={{ display: currentPanel === 2 ? 'block' : 'none' }}>
                <KeyCriteria key_criteria={data.key_criteria} candidateId={candidateId} />
              </div>

              <div style={{ display: currentPanel === 3 ? 'block' : 'none' }}>
                <Compensation
                  compensation={data.compensation}
                  notice_period={data.notice_period}
                  candidateId={candidateId}
                />
                {/* WhyInterested removed — motivation lives in MotivationStrip */}
                {data.miscellaneous && (
                  <Miscellaneous
                    text={data.miscellaneous.text}
                    display={data.miscellaneous.display}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Static zone: tab nav + footer (don't swipe) ──────────────── */}
      <TabNavigation current={currentPanel} onChange={navigateToPanel} />

      <EDCFooter
        search_name={data.search_name}
        roleTitle={data.role_title}
      />

      {/* Our Take Popover — portal rendered */}
      {ourTakeOpen && hasOurTake && (
        <OurTakePopover
          fragments={data.our_take_fragments}
          text={data.our_take?.text}
          consultantName={data.consultant_name}
          triggerRef={ourTakeTriggerRef}
          onClose={() => setOurTakeOpen(false)}
        />
      )}
    </div>
  );
}
