"use client";

import { useState, useEffect } from "react";
import DeckNavigation from "@/components/deck/DeckNavigation";
import EDCStatusBar from "@/components/deck/EDCStatusBar";
import EDCCard from "@/components/edc/EDCCard";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import { EditorContext } from "@/contexts/EditorContext";
import { useEDCState } from "@/hooks/useEDCState";
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
  onBack,
  onPrev,
  onNext,
  onToggleSplit,
}: DeckEDCViewProps) {
  const { state, lock, unlock } = useEDCState(candidate.candidate_id);
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

        {isEditRoute && state === "draft" && (
          <EDCStatusBar
            state={state}
            candidateId={candidate.candidate_id}
            searchId={searchId}
            candidateName={edc.candidate_name}
            roleTitle={edc.role_title}
            onLock={lock}
            onUnlock={unlock}
          />
        )}

        <SplitViewContainer
          active={split}
          cvUrl={edc.cv_url}
          candidateId={candidate.candidate_id}
        >
          <div
            className={split ? "" : "deck-edc-wrapper"}
            style={{ padding: split ? "0 0 40px" : "0 24px 80px" }}
          >
            <EDCCard
              data={edcWithOurTake}
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
