"use client";

import DeckNavigation from "@/components/deck/DeckNavigation";
import EDCStatusBar from "@/components/deck/EDCStatusBar";
import EDCCard from "@/components/edc/EDCCard";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import { EditorContext } from "@/contexts/EditorContext";
import { useEDCState } from "@/hooks/useEDCState";
import type { IntroCardData } from "@/lib/types";

interface DeckEDCViewProps {
  candidate: IntroCardData;
  candidateIndex: number;
  totalCount: number;
  split: boolean;
  searchId: string;
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
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
}: DeckEDCViewProps) {
  const { state, lock, unlock } = useEDCState(candidate.candidate_id);
  const edc = candidate.edc_data;

  return (
    <EditorContext.Provider value={{ isEditable: state === "draft" }}>
      <main style={{ minHeight: "100vh", background: "#0a0a0a" }}>
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

        <EDCStatusBar
          state={state}
          candidateId={candidate.candidate_id}
          searchId={searchId}
          candidateName={edc.candidate_name}
          roleTitle={edc.role_title}
          onLock={lock}
          onUnlock={unlock}
        />

        <SplitViewContainer
          active={split}
          cvUrl={edc.cv_url}
          candidateId={candidate.candidate_id}
        >
          <div
            className={split ? "" : "deck-edc-wrapper"}
            style={{ padding: split ? "0" : "0 24px 80px" }}
          >
            <EDCCard
              data={edc}
              isConsultantView={state === "draft"}
              fluid={split}
              context="deck"
              candidateId={candidate.candidate_id}
            />
          </div>
        </SplitViewContainer>
      </main>
    </EditorContext.Provider>
  );
}
