"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DeckNavigation from "@/components/deck/DeckNavigation";
import EDCStatusBar from "@/components/deck/EDCStatusBar";
import EDCCard from "@/components/edc/EDCCard";
import OurTakeSavedToast from "@/components/edc/OurTakeSavedToast";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import { EditorContext } from "@/contexts/EditorContext";
import CandidateNavigation from "@/components/deck/CandidateNavigation";
import type { IntroCardData, EDCData } from "@/lib/types";
import { useAutoSave, clearDirty } from "@/hooks/useAutoSave";
import { isEditFresh, clearEditWithHash } from "@/lib/edit-hash";

type OurTakeOverride = {
  text: string;
  recommendation?: "ADVANCE" | "HOLD" | "PASS";
  discussion_points?: string[];
  ai_rationale?: string;
  original_note?: string;
};

function ourTakeStorageKey(candidateId: string) {
  return `edc_ourtake_result_${candidateId}`;
}

interface DeckEDCViewProps {
  candidate: IntroCardData;
  candidateIndex: number;
  totalCount: number;
  split: boolean;
  searchId: string;
  isEditRoute?: boolean;
  prevCandidateName?: string;
  nextCandidateName?: string;
  candidateSlideFrom?: 'left' | 'right' | null;
  deckTheme?: 'dark' | 'hybrid' | 'light';
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleSplit: () => void;
  initialPanel?: 1 | 2 | 3;
  initialOurTakeOpen?: boolean;
  onPanelChange?: (panel: 1 | 2 | 3) => void;
  onOurTakeChange?: (open: boolean) => void;
  /** Canonical per-search scope dimensions; threaded to EDCCard → ScopeMatch. */
  searchDimensions?: { name: string; role_requirement: string }[];
  /** Canonical per-search target compensation; threaded to EDCCard → Compensation. */
  searchBudget?: { base?: string; bonus?: string; lti?: string; di?: string };
  /** When true (deck_settings.js_in_portal), the Role Brief is the SSOT for Key
   *  Criteria structure; threaded to EDCCard → KeyCriteria to gate add/remove UI. */
  roleBriefMode?: boolean;
  /** Server-hydrated flag: candidate is in searches.hidden_candidates (deck-level gate). */
  isHiddenFromClient?: boolean;
  /** Lock & Share side-effect: remove candidate from hidden_candidates (server-persisted). */
  onClientVisible?: () => Promise<void>;
  /** Hide from Client side-effect: add candidate to hidden_candidates (server-persisted). */
  onHideFromClient?: () => Promise<void>;
}

export default function DeckEDCView({
  candidate,
  candidateIndex,
  totalCount,
  split,
  searchId,
  isEditRoute = false,
  prevCandidateName,
  nextCandidateName,
  candidateSlideFrom,
  deckTheme,
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
  initialPanel,
  initialOurTakeOpen,
  onPanelChange,
  onOurTakeChange,
  searchDimensions,
  searchBudget,
  roleBriefMode = false,
  isHiddenFromClient = false,
  onClientVisible,
  onHideFromClient,
}: DeckEDCViewProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);
  const edc = candidate.edc_data;
  const isEditable = isEditRoute;

  // Our Take result — persisted in localStorage so generated text survives page nav
  const [ourTakeOverride, setOurTakeOverride] = useState<OurTakeOverride | null>(null);

  // Our Take popover edits — read from localStorage so the client-view overlay
  // shows edits immediately (same pattern as KeyCriteria reading localStorage on mount)
  const [ourTakeLocalEdits, setOurTakeLocalEdits] = useState<{ text?: string; fragments?: string[] } | null>(null);

  const ourTakePropData = { text: edc.our_take?.text, fragments: (edc as unknown as Record<string, unknown>).our_take_fragments };
  useEffect(() => {
    try {
      const otKey = ourTakeStorageKey(candidate.candidate_id);
      if (isEditFresh(otKey, ourTakePropData)) {
        const stored = localStorage.getItem(otKey);
        if (stored) setOurTakeOverride(JSON.parse(stored));
        else setOurTakeOverride(null);
      } else {
        setOurTakeOverride(null);
      }
    } catch { /* ignore */ }
    try {
      const popKey = `edc_edit_${candidate.candidate_id}_ourtake`;
      if (isEditFresh(popKey, ourTakePropData)) {
        const popover = localStorage.getItem(popKey);
        if (popover) {
          const p = JSON.parse(popover);
          setOurTakeLocalEdits({ text: p.text, fragments: p.fragments });
        } else {
          setOurTakeLocalEdits(null);
        }
      } else {
        setOurTakeLocalEdits(null);
      }
    } catch { setOurTakeLocalEdits(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.candidate_id]);

  // Merge any generated/stored Our Take AND popover edits into the EDC data.
  // This ensures the client-view overlay (which reads from data, not localStorage)
  // shows the consultant's edits — matching how KeyCriteria works.
  const edcWithOurTake: EDCData = useMemo(() => {
    let result = ourTakeOverride
      ? { ...edc, our_take: { ...edc.our_take, ...ourTakeOverride } }
      : { ...edc };
    if (ourTakeLocalEdits) {
      if (ourTakeLocalEdits.text !== undefined) {
        result = { ...result, our_take: { ...result.our_take, text: ourTakeLocalEdits.text } };
      }
      if (ourTakeLocalEdits.fragments && ourTakeLocalEdits.fragments.length > 0) {
        result = { ...result, our_take_fragments: ourTakeLocalEdits.fragments };
      }
    }
    return result;
  }, [edc, ourTakeOverride, ourTakeLocalEdits]);

  // Auto-save edits to Vercel Blob on every change (debounced)
  useAutoSave(searchId, candidate.candidate_id, edcWithOurTake);

  // Collect all localStorage edits, merge into full EDCData, and POST to server.
  // Called as the flush pre-flight before Lock & Share's visibility flip.
  const handleFlushEdits = useCallback(async () => {
    const cid = candidate.candidate_id;
    const merged: EDCData = { ...edcWithOurTake };

    try {
      // Header edits
      const headerRaw = localStorage.getItem(`edc_edit_${cid}_header`);
      if (headerRaw) {
        const h = JSON.parse(headerRaw);
        if (h.candidate_name) merged.candidate_name = h.candidate_name;
        if (h.current_title) merged.current_title = h.current_title;
        if (h.current_company) merged.current_company = h.current_company;
        if (h.location) merged.location = h.location;
        if (h.linkedin_url) merged.linkedin_url = h.linkedin_url;
      }

      // Scope edits
      const scopeRaw = localStorage.getItem(`edc_edit_${cid}_scope`);
      if (scopeRaw) merged.scope_match = JSON.parse(scopeRaw);

      // Criteria edits
      const criteriaRaw = localStorage.getItem(`edc_edit_${cid}_criteria`);
      if (criteriaRaw) merged.key_criteria = JSON.parse(criteriaRaw);

      // Compensation edits
      const compRaw = localStorage.getItem(`edc_edit_${cid}_comp`);
      if (compRaw) {
        const c = JSON.parse(compRaw);
        if (c.comp) merged.compensation = c.comp;
        if (c.notice) merged.notice_period = c.notice;
      }

      // Our Take edits
      const otRaw = localStorage.getItem(`edc_edit_${cid}_ourtake`);
      if (otRaw) {
        const ot = JSON.parse(otRaw);
        if (ot.fragments) merged.our_take_fragments = ot.fragments;
        if (ot.text !== undefined) merged.our_take = { ...merged.our_take, text: ot.text };
        if (ot.name && ot.showName) merged.consultant_name = ot.name;
      }

      // Motivation edits
      const motRaw = localStorage.getItem(`edc_edit_${cid}_motivation`);
      if (motRaw) merged.motivation_hook = motRaw;

      // Photo URL
      const photoUrl = localStorage.getItem(`edc_photo_${cid}`);
      if (photoUrl) merged.photo_url = photoUrl;
    } catch (err) {
      console.warn('[flush] Failed to collect localStorage edits:', err);
    }

    // POST to server
    try {
      const res = await fetch('/api/edits/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId, candidateId: cid, edcData: merged }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('[flush] Save failed:', err);
        alert('Failed to save edits. Please try again.');
        return;
      }
    } catch (err) {
      console.error('[flush] Save request failed:', err);
      alert('Failed to save edits. Please check your connection and try again.');
      return;
    }
  }, [candidate.candidate_id, edcWithOurTake, searchId]);

  return (
    <EditorContext.Provider value={{ isEditable }}>
      <OurTakeSavedToast />
      <main data-deck-theme={deckTheme} style={{ minHeight: "100vh", background: "var(--deck-bg)" }}>
        <DeckNavigation
          onBack={onBack}
          onPrev={onPrev}
          onNext={onNext}
          onToggleSplit={onToggleSplit}
          currentIndex={candidateIndex}
          totalCount={totalCount}
          splitActive={split}
          roleTitle={edc.role_title}
        />

        {isEditRoute && (
          <EDCStatusBar
            candidateId={candidate.candidate_id}
            searchId={searchId}
            candidateName={edc.candidate_name}
            roleTitle={edc.role_title}
            isHiddenFromClient={isHiddenFromClient}
            onFlushEdits={handleFlushEdits}
            onClientVisible={onClientVisible}
            onHideFromClient={onHideFromClient}
            onReset={async () => {
              const cid = candidate.candidate_id;
              // clearDirty also aborts any in-flight POST and cancels pending debounced saves,
              // so the DELETE below is the last word on what's in the Blob.
              clearDirty(cid);
              try {
                clearEditWithHash(`edc_edit_${cid}_scope`);
                clearEditWithHash(`edc_edit_${cid}_criteria`);
                clearEditWithHash(`edc_edit_${cid}_comp`);
                clearEditWithHash(`edc_edit_${cid}_header`);
                clearEditWithHash(`edc_edit_${cid}_ourtake`);
                clearEditWithHash(`edc_edit_${cid}_motivation`);
                localStorage.removeItem(`card_edits_${cid}`);
                localStorage.removeItem(`edc_ourtake_result_${cid}`);
              } catch { /* ignore */ }
              setOurTakeOverride(null);
              setOurTakeLocalEdits(null);
              setResetKey(k => k + 1);

              // Clear server-side overlay so the next page render uses fixture data.
              // Without this, the Blob overlay would re-overwrite the fixture on reload.
              try {
                const res = await fetch(
                  `/api/edits/save?searchId=${encodeURIComponent(searchId)}&candidateId=${encodeURIComponent(cid)}`,
                  { method: 'DELETE' }
                );
                if (!res.ok) {
                  console.warn('[reset] DELETE overlay failed:', res.status);
                }
              } catch (err) {
                console.warn('[reset] DELETE overlay request failed:', err);
              }
              router.refresh();
            }}
          />
        )}

        <SplitViewContainer
          active={split}
          cvUrl={edc.cv_url}
          candidateId={candidate.candidate_id}
          searchId={searchId}
        >
          <div
            className={split ? "" : "deck-edc-wrapper"}
            style={{ padding: split ? "0 0 40px" : "0 24px 24px" }}
          >
            <EDCCard
              key={`${candidate.candidate_id}-${resetKey}`}
              data={edcWithOurTake}
              fluid={split}
              context="deck"
              candidateId={candidate.candidate_id}
              searchId={searchId}
              onSwipePrev={onPrev}
              onSwipeNext={onNext}
              candidateSlideFrom={candidateSlideFrom}
              initialPanel={initialPanel}
              initialOurTakeOpen={initialOurTakeOpen}
              onPanelChange={onPanelChange}
              onOurTakeChange={onOurTakeChange}
              searchDimensions={searchDimensions}
              searchBudget={searchBudget}
              roleBriefMode={roleBriefMode}
            />
            {!split && (
              <CandidateNavigation
                currentIndex={candidateIndex}
                totalCount={totalCount}
                prevName={prevCandidateName}
                nextName={nextCandidateName}
                onPrev={onPrev}
                onNext={onNext}
              />
            )}
          </div>
        </SplitViewContainer>
      </main>
    </EditorContext.Provider>
  );
}
