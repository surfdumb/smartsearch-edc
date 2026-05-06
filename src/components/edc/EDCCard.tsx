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
import OurTakeEmptyState from "@/components/edc/OurTakeEmptyState";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useEditorContext } from "@/contexts/EditorContext";
import { isEditFresh, writeBaseHash } from "@/lib/edit-hash";
import { markDirty } from "@/hooks/useAutoSave";
import { type EDCData, type EDCContext, buildCandidateContext } from "@/lib/types";

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
  /** Initial panel to show (restored from URL hash on refresh) */
  initialPanel?: 1 | 2 | 3;
  /** Initial Our Take open state (restored from URL hash on refresh) */
  initialOurTakeOpen?: boolean;
  /** Called when panel changes — parent syncs to URL hash */
  onPanelChange?: (panel: 1 | 2 | 3) => void;
  /** Called when Our Take popover opens/closes — parent syncs to URL hash */
  onOurTakeChange?: (open: boolean) => void;
  /** Canonical per-search scope dimensions from searches.scope_match_dimensions.
   *  Threaded through to ScopeMatch so role_requirement is read from the search
   *  config rather than the candidate snapshot. */
  searchDimensions?: { name: string; role_requirement: string }[];
  /** Canonical per-search target compensation from searches.budget_*.
   *  Threaded to Compensation so Target Range is read from the search config
   *  rather than the candidate snapshot. */
  searchBudget?: { base?: string; bonus?: string; lti?: string; di?: string };
  /** When true, the Role Brief is the SSOT for Key Criteria structure;
   *  KeyCriteria hides add/remove UI and shows a hint pointing to the brief. */
  roleBriefMode?: boolean;
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
  initialPanel,
  initialOurTakeOpen,
  onPanelChange,
  onOurTakeChange,
  searchDimensions,
  searchBudget,
  roleBriefMode = false,
}: EDCCardProps) {
  const { isEditable } = useEditorContext();
  const [currentPanel, setCurrentPanel] = useState<1 | 2 | 3>(initialPanel || 1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [ourTakeOpen, setOurTakeOpen] = useState(initialOurTakeOpen || false);
  const ourTakeTriggerRef = useRef<HTMLButtonElement>(null);

  // Header field edits — persisted in localStorage
  const headerKey = candidateId ? `edc_edit_${candidateId}_header` : null;
  const headerPropData = { candidate_name: data.candidate_name, current_title: data.current_title, current_company: data.current_company, location: data.location, linkedin_url: data.linkedin_url };
  type HeaderEdits = { candidate_name?: string; current_title?: string; current_company?: string; location?: string; linkedin_url?: string };
  const [headerEdits, setHeaderEdits] = useState<HeaderEdits>(() => {
    if (headerKey && typeof window !== 'undefined' && isEditFresh(headerKey, headerPropData)) {
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
        try { localStorage.setItem(headerKey, JSON.stringify(next)); writeBaseHash(headerKey, headerPropData); } catch { /* ignore */ }
        if (candidateId) { markDirty(candidateId); import("@/hooks/useAutoSave").then(m => m.signalEdit(candidateId)); }
      }
      return next;
    });
  };
  const handleLinkedInUpdate = (url: string) => {
    handleHeaderFieldUpdate('linkedin_url', url);
  };

  // Photo upload state — persisted in localStorage (blob URLs are small)
  const photoKey = candidateId ? `edc_photo_${candidateId}` : null;
  const validPhoto = (v: string | null) => v && v.length > 100 ? v : null;
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(() => {
    if (!photoKey || typeof window === 'undefined') return null;
    try { return validPhoto(localStorage.getItem(photoKey)); } catch { return null; }
  });
  const handlePhotoUpload = (blobUrl: string) => {
    setUploadedPhoto(blobUrl);
    if (photoKey) {
      try { localStorage.setItem(photoKey, blobUrl); } catch { /* ignore */ }
      if (candidateId) { import("@/hooks/useAutoSave").then(m => m.signalEdit(candidateId)); }
    }
  };

  // Reset to panel 1 when candidate changes (unless initialPanel is set from URL hash)
  useEffect(() => {
    setCurrentPanel(initialPanel || 1);
    setOurTakeOpen(initialOurTakeOpen || false);
    // Load persisted photo for new candidate
    if (photoKey) {
      try { setUploadedPhoto(validPhoto(localStorage.getItem(photoKey))); } catch { /* ignore */ }
    } else {
      setUploadedPhoto(null);
    }
    // Load persisted header edits
    if (headerKey && isEditFresh(headerKey, { candidate_name: data.candidate_name, current_title: data.current_title, current_company: data.current_company, location: data.location, linkedin_url: data.linkedin_url })) {
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
    onPanelChange?.(target);
  };

  const handleOurTakeToggle = (open: boolean) => {
    setOurTakeOpen(open);
    onOurTakeChange?.(open);
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

  // Our Take overlay: shows Our Take as a full-panel cover on first open
  const PLACEHOLDER_TEXT = "Our take will be added following consultant review";
  const ourTakeText = data.our_take?.text?.trim() || "";
  const hasRealFragments = (data.our_take_fragments?.length ?? 0) > 0;
  const hasRealText = ourTakeText.length > 0 && !ourTakeText.includes(PLACEHOLDER_TEXT);
  const hasRealOurTake = (hasRealFragments || hasRealText)
  && deckSettings?.our_take_display !== 'HIDE';

  // Overlay only in client view (not edit mode) — edit mode uses the editable popover
  const [ourTakeOverlayOpen, setOurTakeOverlayOpen] = useState(
    !isEditable && hasRealOurTake && (initialOurTakeOpen || !initialPanel)
  );

  // Reset overlay state when candidate changes
  useEffect(() => {
    if (isEditable) { setOurTakeOverlayOpen(false); return; }
    const text = data.our_take?.text?.trim() || "";
    const frags = data.our_take_fragments && data.our_take_fragments.length > 0;
    const real = (frags || (text.length > 0 && !text.includes(PLACEHOLDER_TEXT))) && deckSettings?.our_take_display !== 'HIDE';
    // Show overlay on new candidate if they have real Our Take (unless restoring a specific panel from hash)
    setOurTakeOverlayOpen(real && !initialPanel);
  }, [candidateId, isEditable]);

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
            photo_url={uploadedPhoto || data.photo_url || undefined}
            linkedin_url={headerEdits.linkedin_url ?? data.linkedin_url}
            context={context}
            candidateId={candidateId}
            searchId={searchId}
            onPhotoUpload={handlePhotoUpload}
            onFieldUpdate={handleHeaderFieldUpdate}
            onLinkedInUpdate={handleLinkedInUpdate}
          />

          {/* Motivation scrambler — visible only when real motivation data exists */}
          {data.why_interested && data.why_interested.length > 0 &&
           !data.why_interested.every(w => w.headline === 'See candidate overview' || !w.headline) && (
            <MotivationStrip
              why_interested={data.why_interested}
              motivation={data.motivation_hook}
              our_take_fragments={data.our_take_fragments}
              candidateId={candidateId}
            />
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {/* Our Take pill — persistent across all panels, top-right */}
            {hasOurTake && !ourTakeOverlayOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: fluid ? "16px" : "32px",
                  display: "flex",
                  gap: "8px",
                  zIndex: 10,
                }}
              >
                <button
                  ref={ourTakeTriggerRef}
                  onClick={() => {
                    if (!isEditable && hasRealOurTake) {
                      // Client view: reopen the overlay
                      setOurTakeOverlayOpen(true);
                      onOurTakeChange?.(true);
                    } else {
                      // Edit mode: open the editable popover
                      handleOurTakeToggle(!ourTakeOpen);
                    }
                  }}
                  className={ourTakeOpen ? "" : "our-take-glow"}
                  style={{
                    fontSize: fluid ? "0.82rem" : "0.92rem",
                    fontWeight: 500,
                    color: "var(--ss-gold)",
                    background: ourTakeOpen ? "rgba(197,165,114,0.14)" : "rgba(250,248,245,0.97)",
                    border: "1.5px solid rgba(197,165,114,0.4)",
                    borderRadius: "22px",
                    padding: fluid ? "6px 14px" : "8px 20px",
                    height: fluid ? "32px" : "38px",
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

            {/* Empty-state CTA — only when no Our Take content, edit mode, deck setting allows */}
            {!hasOurTake
              && deckSettings?.our_take_display !== 'HIDE'
              && isEditable
              && !ourTakeOverlayOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: fluid ? "16px" : "32px",
                  display: "flex",
                  gap: "8px",
                  zIndex: 10,
                }}
              >
                <OurTakeEmptyState
                  ref={ourTakeTriggerRef}
                  fluid={fluid}
                  onClick={() => handleOurTakeToggle(true)}
                />
              </div>
            )}

            {/* Our Take overlay — fills content area on first open */}
            {ourTakeOverlayOpen && hasRealOurTake ? (
              <div
                style={{
                  height: "100%",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "auto",
                }}
              >
                <div style={{ flex: 1, padding: fluid ? "28px 20px" : "36px 48px" }}>
                  {/* Our Take header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                    <span style={{ color: "var(--ss-gold)", fontSize: "1rem" }}>&#10022;</span>
                    <span
                      className="font-cormorant"
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        color: "var(--ss-dark)",
                        fontStyle: "italic",
                      }}
                    >
                      Our Take
                    </span>
                  </div>

                  {/* Our Take text content */}
                  <div
                    style={{
                      border: "1px solid rgba(74,124,89,0.2)",
                      borderRadius: "12px",
                      padding: "20px 24px",
                      background: "rgba(74,124,89,0.03)",
                      marginBottom: "24px",
                    }}
                  >
                    {/* Fragments */}
                    {data.our_take_fragments && data.our_take_fragments.length > 0 && (
                      <div style={{ marginBottom: 0 }}>
                        {data.our_take_fragments.map((frag, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ color: "var(--ss-gold)", fontSize: "0.7rem", marginTop: "3px", flexShrink: 0 }}>●</span>
                            <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--ss-dark)", margin: 0, whiteSpace: "pre-line" }}>{frag}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Render text only when no consultant fragments exist — prevents AI paragraph
                        stacking behind bullets (Tara cvw-ops-dir, Apr 22). Bullet-only migration
                        handles deeper data cleanup separately. */}
                    {(!data.our_take_fragments || data.our_take_fragments.length === 0) && data.our_take?.text && (
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--ss-dark)", margin: 0, whiteSpace: "pre-line" }}>
                        {data.our_take.text}
                      </p>
                    )}
                  </div>

                  {/* View Evidence button */}
                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={() => {
                        setOurTakeOverlayOpen(false);
                        onOurTakeChange?.(false);
                      }}
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--ss-gold)",
                        background: "transparent",
                        border: "1.5px solid rgba(197,165,114,0.35)",
                        borderRadius: "10px",
                        padding: "10px 28px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        letterSpacing: "0.3px",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.06)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.5)";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.35)";
                      }}
                    >
                      View Evidence →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
                    searchDimensions={searchDimensions}
                  />
                </div>

                <div style={{ display: currentPanel === 2 ? 'block' : 'none' }}>
                  <KeyCriteria
                    key_criteria={data.key_criteria}
                    candidateId={candidateId}
                    roleBriefMode={roleBriefMode}
                  />
                </div>

                <div style={{ display: currentPanel === 3 ? 'block' : 'none' }}>
                  <Compensation
                    compensation={data.compensation}
                    notice_period={data.notice_period}
                    candidateId={candidateId}
                    searchBudget={searchBudget}
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
            )}
          </div>
        </div>
      </div>

      {/* ── Static zone: tab nav + footer (don't swipe) ──────────────── */}
      {!ourTakeOverlayOpen && (
        <TabNavigation current={currentPanel} onChange={navigateToPanel} />
      )}

      <EDCFooter
        search_name={data.search_name}
        roleTitle={data.role_title}
      />

      {/* Our Take Popover — portal rendered (only when overlay is NOT showing).
          Allow opening from empty state in edit mode so consultant can compose
          Our Take from scratch when our_take is null in Supabase. */}
      {ourTakeOpen && (hasOurTake || isEditable) && !ourTakeOverlayOpen && (
        <OurTakePopover
          fragments={data.our_take_fragments}
          text={data.our_take?.text}
          consultantName={data.consultant_name}
          candidateId={candidateId}
          candidateName={data.candidate_name}
          searchId={searchId}
          triggerRef={ourTakeTriggerRef}
          onClose={() => handleOurTakeToggle(false)}
          candidateContext={buildCandidateContext(data)}
          manualNotes={data.our_take?.original_note}
        />
      )}
    </div>
  );
}
