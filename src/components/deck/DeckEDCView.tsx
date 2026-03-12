"use client";

import { useState, useEffect } from "react";
import DeckNavigation from "@/components/deck/DeckNavigation";
import EDCStatusBar from "@/components/deck/EDCStatusBar";
import EDCCard from "@/components/edc/EDCCard";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import { EditorContext } from "@/contexts/EditorContext";
import { useEDCState } from "@/hooks/useEDCState";
import CandidateNavigation from "@/components/deck/CandidateNavigation";
import type { IntroCardData, EDCData } from "@/lib/types";

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
  const edcWithOurTake: EDCData = ourTakeOverride
    ? { ...edc, our_take: { ...edc.our_take, ...ourTakeOverride } }
    : edc;

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

        {isEditRoute && state === "draft" && (
          <EDCStatusBar
            state={state}
            candidateId={candidate.candidate_id}
            searchId={searchId}
            candidateName={edc.candidate_name}
            roleTitle={edc.role_title}
            onLock={lock}
            onUnlock={unlock}
            onReset={() => setResetKey(k => k + 1)}
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
              onSwipePrev={onPrev}
              onSwipeNext={onNext}
              candidateSlideFrom={candidateSlideFrom}
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
