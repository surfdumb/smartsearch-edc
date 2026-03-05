"use client";

import { useState, useEffect } from "react";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import WhyInterested from "@/components/edc/WhyInterested";
import Miscellaneous from "@/components/edc/Miscellaneous";
import EDCFooter from "@/components/edc/EDCFooter";
import TabNavigation from "@/components/edc/TabNavigation";
import MotivationStrip from "@/components/edc/MotivationStrip";
import CompTicker from "@/components/edc/CompTicker";
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
  deckSettings,
  onSwipePrev,
  onSwipeNext,
  candidateSlideFrom,
}: EDCCardProps) {
  const [currentPanel, setCurrentPanel] = useState<1 | 2 | 3>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  // Reset to panel 1 when candidate changes
  useEffect(() => {
    setCurrentPanel(1);
  }, [candidateId]);

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
            candidate_name={data.candidate_name}
            current_title={data.current_title}
            current_company={data.current_company}
            location={data.location}
            photo_url={data.photo_url}
            context={context}
          />

          {/* Motivation strip — dark bg continuing from header */}
          {data.why_interested && data.why_interested.length > 0 && (
            <MotivationStrip why_interested={data.why_interested} />
          )}

          {/* Comp ticker — visible on panels 1 & 2, collapses on panel 3 */}
          {currentPanel !== 3 && (
            <div style={{ transition: "opacity 0.3s, max-height 0.3s", opacity: 1, maxHeight: "40px", overflow: "hidden" }}>
              <CompTicker
                currentTotal={data.compensation?.current_total}
                expectedTotal={data.compensation?.expected_total}
                onNavigateToComp={() => navigateToPanel(3)}
              />
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div
              key={`${candidateId}-panel-${currentPanel}`}
              className={slideDirection === 'right' ? 'panel-enter-right' : 'panel-enter-left'}
              style={{
                height: "100%",
                overflowY: "auto",
                background: "white",
              }}
            >
              {currentPanel === 1 && (
                <ScopeMatch
                  scope_match={data.scope_match}
                  scope_seasoning={showNarrative ? data.scope_seasoning : undefined}
                />
              )}

              {currentPanel === 2 && (
                <KeyCriteria key_criteria={data.key_criteria} />
              )}

              {currentPanel === 3 && (
                <>
                  <Compensation
                    compensation={data.compensation}
                    notice_period={data.notice_period}
                  />
                  <WhyInterested why_interested={data.why_interested} />
                  {data.miscellaneous && (
                    <Miscellaneous
                      text={data.miscellaneous.text}
                      display={data.miscellaneous.display}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Static zone: tab nav + footer (don't swipe) ──────────────── */}
      <TabNavigation current={currentPanel} onChange={navigateToPanel} />

      <EDCFooter
        search_name={data.search_name}
        roleTitle={data.role_title}
        ourTakeFragments={data.our_take_fragments}
        ourTakeText={data.our_take?.text}
        consultantName={data.consultant_name}
      />
    </div>
  );
}
