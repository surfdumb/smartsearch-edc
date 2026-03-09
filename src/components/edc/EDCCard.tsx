"use client";

import { useState, useEffect, useRef } from "react";
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
  /** Deck-level settings for toggling sections */
  deckSettings?: DeckSettings;
  /** Swipe callbacks for candidate navigation */
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  /** Direction the new candidate content should enter from */
  candidateSlideFrom?: 'left' | 'right' | null;
  /** Whether to show the motivation tagline strip (default: false) */
  showMotivation?: boolean;
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
  showMotivation = false,
}: EDCCardProps) {
  const [currentPanel, setCurrentPanel] = useState<1 | 2 | 3>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [ourTakeOpen, setOurTakeOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const ourTakeTriggerRef = useRef<HTMLButtonElement>(null);

  // Reset to panel 1 when candidate changes
  useEffect(() => {
    setCurrentPanel(1);
    setOurTakeOpen(false);
    setInterestOpen(false);
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

  const hasOurTake = (data.our_take_fragments && data.our_take_fragments.length > 0) ||
    (data.our_take?.text && data.our_take.text.trim().length > 0);

  const hasInterest = data.why_interested && data.why_interested.length > 0;

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

          {/* Motivation strip — dark bg continuing from header (toggled via settings) */}
          {showMotivation && data.why_interested && data.why_interested.length > 0 && (
            <MotivationStrip why_interested={data.why_interested} />
          )}

          {/* Comp ticker — visible on panel 2 only */}
          {currentPanel === 2 && (
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
              className={`criteria-scroll ${slideDirection === 'right' ? 'panel-enter-right' : 'panel-enter-left'}`}
              style={{
                height: "100%",
                background: "white",
              }}
            >
              {currentPanel === 1 && (
                <div style={{ position: "relative" }}>
                  {/* Our Take + Interest pills — top-right of scope page */}
                  {(hasOurTake || hasInterest) && (
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
                      {hasOurTake && (
                        <button
                          ref={ourTakeTriggerRef}
                          onClick={() => { setOurTakeOpen(v => !v); setInterestOpen(false); }}
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "var(--ss-gold)",
                            background: "rgba(197,165,114,0.06)",
                            border: "1px solid rgba(197,165,114,0.2)",
                            borderRadius: "22px",
                            padding: "8px 18px",
                            height: "38px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s",
                            fontFamily: "inherit",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.12)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.35)";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.06)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
                          }}
                        >
                          <span style={{ animation: "ourTakeShimmer 2s ease-in-out infinite" }}>✦</span>
                          Our Take
                        </button>
                      )}

                      {hasInterest && (
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={() => { setInterestOpen(v => !v); setOurTakeOpen(false); }}
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "var(--ss-green)",
                              background: "rgba(74, 124, 89, 0.06)",
                              border: "1px solid rgba(74, 124, 89, 0.2)",
                              borderRadius: "22px",
                              padding: "8px 18px",
                              height: "38px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.15s",
                              fontFamily: "inherit",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = "rgba(74, 124, 89, 0.12)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 124, 89, 0.35)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = "rgba(74, 124, 89, 0.06)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74, 124, 89, 0.2)";
                            }}
                          >
                            Interest
                          </button>

                          {/* Interest dropdown */}
                          {interestOpen && (
                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                minWidth: "280px",
                                background: "#faf8f5",
                                border: "1px solid rgba(74, 124, 89, 0.15)",
                                borderRadius: "12px",
                                padding: "16px 20px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                                zIndex: 20,
                                animation: "ourTakeSlideUp 0.2s ease-out forwards",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {data.why_interested.slice(0, 4).map((item, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "4px",
                                        fontSize: "0.6rem",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: item.type === "pull" ? "var(--ss-green-light)" : "var(--ss-yellow-light)",
                                        color: item.type === "pull" ? "var(--ss-green)" : "var(--ss-yellow)",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {item.type === "pull" ? "↗" : "↙"}
                                    </span>
                                    <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--ss-dark)", lineHeight: 1.3 }}>
                                      {item.headline}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <ScopeMatch
                    scope_match={data.scope_match}
                    scope_seasoning={showNarrative ? data.scope_seasoning : undefined}
                  />
                </div>
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
