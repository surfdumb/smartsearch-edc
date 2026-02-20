/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import SearchContextHeader from "@/components/deck/SearchContextHeader";
import IntroCard from "@/components/deck/IntroCard";
import CandidateGrid from "@/components/deck/CandidateGrid";
import DeckNavigation from "@/components/deck/DeckNavigation";
import SplitViewContainer from "@/components/split/SplitViewContainer";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import Motivation from "@/components/edc/Motivation";
import Concerns from "@/components/edc/Concerns";
import OurTake from "@/components/edc/OurTake";
import EDCFooter from "@/components/edc/EDCFooter";
import type { SearchContext } from "@/lib/types";

type DeckView =
  | { mode: "grid" }
  | { mode: "edc"; candidateIndex: number; split: boolean };

interface DeckClientProps {
  data: SearchContext;
}

export default function DeckClient({ data }: DeckClientProps) {
  const [view, setView] = useState<DeckView>({ mode: "grid" });

  const handleCardClick = (index: number) => {
    setView({ mode: "edc", candidateIndex: index, split: false });
  };

  const handleBack = () => {
    setView({ mode: "grid" });
  };

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

      if (e.key === "Escape" && view.mode === "edc") {
        e.preventDefault();
        handleBack();
      }
      if (e.key === "ArrowLeft" && view.mode === "edc") {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "ArrowRight" && view.mode === "edc") {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "s" && view.mode === "edc" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleToggleSplit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, handlePrev, handleNext, handleToggleSplit]);

  // GRID VIEW
  if (view.mode === "grid") {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: "60px" }}>
        {/* Sticky header */}
        <div
          style={{
            padding: "16px 32px",
            borderBottom: "1px solid rgba(197,165,114,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <img
            src="/logos/smartsearch-white.png"
            alt="SmartSearch"
            style={{ height: "24px", opacity: 0.6 }}
          />
          <span
            className="font-sorts-mill"
            style={{
              fontSize: "1.1rem",
              fontWeight: 400,
              color: "var(--ss-gold)",
            }}
          >
            Executive <em style={{ fontStyle: "italic" }}>Decision</em> Deck
          </span>
        </div>

        <div style={{ padding: "40px 24px" }}>
          <SearchContextHeader
            search_name={data.search_name}
            client_company={data.client_company}
            client_location={data.client_location}
            key_criteria_names={data.key_criteria_names}
            search_lead={data.search_lead}
            client_logo_url={data.client_logo_url}
          />

          <p
            className="font-cormorant"
            style={{
              textAlign: "center",
              fontSize: "1.1rem",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "32px",
            }}
          >
            Click any candidate to view their full assessment
          </p>

          <CandidateGrid>
            {data.candidates.map((candidate, i) => (
              <IntroCard
                key={candidate.candidate_id}
                card={candidate}
                onClick={() => handleCardClick(i)}
              />
            ))}
          </CandidateGrid>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            padding: "40px 24px",
            color: "rgba(255,255,255,0.25)",
            fontSize: "0.8rem",
          }}
        >
          <span className="font-cormorant" style={{ fontStyle: "italic", fontSize: "0.95rem" }}>
            Show Evidence. Let Humans Judge.
          </span>
          <br />
          <span style={{ marginTop: "8px", display: "inline-block" }}>SmartSearch &copy; 2026</span>
        </div>
      </main>
    );
  }

  // EDC VIEW (full candidate)
  const candidate = data.candidates[view.candidateIndex];
  const edc = candidate.edc_data;

  const edcCard = (
    <div
      style={{
        maxWidth: view.split ? "100%" : "820px",
        margin: "0 auto",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(197,165,114,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 30px 100px rgba(0,0,0,0.4)",
      }}
    >
      <EDCHeader
        candidate_name={edc.candidate_name}
        current_title={edc.current_title}
        current_company={edc.current_company}
        location={edc.location}
        role_title={edc.role_title}
        consultant_name={edc.consultant_name}
        generated_date={edc.generated_date}
      />
      <div className="bg-white">
        <ScopeMatch scope_match={edc.scope_match} scope_seasoning={edc.scope_seasoning} />
        <KeyCriteria key_criteria={edc.key_criteria} />
        <Compensation
          compensation={edc.compensation}
          notice_period={edc.notice_period}
          earliest_start_date={edc.earliest_start_date}
        />
        <Motivation why_interested={edc.why_interested} />
        <Concerns potential_concerns={edc.potential_concerns} />
        <div
          style={{
            height: "4px",
            background:
              "linear-gradient(90deg, transparent 0%, var(--ss-gold-pale) 15%, var(--ss-gold) 50%, var(--ss-gold-pale) 85%, transparent 100%)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              color: "var(--ss-gold)",
              fontSize: "1rem",
              padding: "0 16px",
              zIndex: 1,
            }}
          >
            ✦
          </span>
        </div>
        <OurTake
          text={edc.our_take.text}
          consultant_name={edc.consultant_name}
          recommendation={edc.our_take.recommendation}
          discussion_points={edc.our_take.discussion_points}
          original_note={edc.our_take.original_note}
          ai_rationale={edc.our_take.ai_rationale}
          isConsultantView={false}
        />
      </div>
      <EDCFooter search_name={edc.search_name} generated_date={edc.generated_date} />
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <DeckNavigation
        onBack={handleBack}
        onPrev={view.candidateIndex > 0 ? handlePrev : undefined}
        onNext={view.candidateIndex < data.candidates.length - 1 ? handleNext : undefined}
        onToggleSplit={handleToggleSplit}
        currentIndex={view.candidateIndex}
        totalCount={data.candidates.length}
        splitActive={view.split}
      />

      <SplitViewContainer active={view.split} cvUrl={edc.cv_url}>
        <div style={{ padding: view.split ? "0" : "0 24px 80px" }}>
          {edcCard}
        </div>
      </SplitViewContainer>
    </main>
  );
}
