"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DeckNavigation from "@/components/deck/DeckNavigation";
import EDCStatusBar from "@/components/deck/EDCStatusBar";
import EDCCard from "@/components/edc/EDCCard";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import { EditorContext } from "@/contexts/EditorContext";
import { useEDCState } from "@/hooks/useEDCState";
import CandidateNavigation from "@/components/deck/CandidateNavigation";
import type { IntroCardData, EDCData } from "@/lib/types";
import { useAutoSave } from "@/hooks/useAutoSave";

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
}: DeckEDCViewProps) {
  const { state, lock, unlock } = useEDCState(candidate.candidate_id);
  const [resetKey, setResetKey] = useState(0);
  const edc = candidate.edc_data;
  const isEditable = isEditRoute && state === "draft";

  // Our Take result — persisted in localStorage so generated text survives page nav
  const [ourTakeOverride, setOurTakeOverride] = useState<OurTakeOverride | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ourTakeStorageKey(candidate.candidate_id));
      if (stored) setOurTakeOverride(JSON.parse(stored));
      else setOurTakeOverride(null);
    } catch { /* ignore */ }
  }, [candidate.candidate_id]);

  // Merge any generated/stored Our Take into the EDC data
  const edcWithOurTake: EDCData = useMemo(() =>
    ourTakeOverride
      ? { ...edc, our_take: { ...edc.our_take, ...ourTakeOverride } }
      : edc,
    [edc, ourTakeOverride]
  );

  // Auto-save edits to Vercel Blob on every change (debounced)
  useAutoSave(searchId, candidate.candidate_id, edcWithOurTake);

  // Collect all localStorage edits, merge into full EDCData, and POST to server
  const handleLock = useCallback(async () => {
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
      console.warn('[lock] Failed to collect localStorage edits:', err);
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
        console.error('[lock] Save failed:', err);
        alert('Failed to save edits. Please try again.');
        return;
      }
    } catch (err) {
      console.error('[lock] Save request failed:', err);
      alert('Failed to save edits. Please check your connection and try again.');
      return;
    }

    lock();
  }, [candidate.candidate_id, edcWithOurTake, searchId, lock]);

  return (
    <EditorContext.Provider value={{ isEditable }}>
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
            state={state}
            candidateId={candidate.candidate_id}
            searchId={searchId}
            candidateName={edc.candidate_name}
            roleTitle={edc.role_title}
            onLock={handleLock}
            onUnlock={unlock}
            onReset={() => {
              const cid = candidate.candidate_id;
              try {
                localStorage.removeItem(`edc_edit_${cid}_scope`);
                localStorage.removeItem(`edc_edit_${cid}_criteria`);
                localStorage.removeItem(`edc_edit_${cid}_comp`);
                localStorage.removeItem(`edc_edit_${cid}_header`);
                localStorage.removeItem(`edc_edit_${cid}_ourtake`);
                localStorage.removeItem(`edc_edit_${cid}_motivation`);
              } catch { /* ignore */ }
              setOurTakeOverride(null);
              setResetKey(k => k + 1);
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
