"use client";

import { useState, useEffect } from "react";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import WhyInterested from "@/components/edc/WhyInterested";
import Miscellaneous from "@/components/edc/Miscellaneous";
import EDCFooter from "@/components/edc/EDCFooter";
import OurTakePopover from "@/components/edc/OurTakePopover";
import PageNavigation from "@/components/edc/PageNavigation";
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
}

export default function EDCCard({
  data,
  fluid = false,
  context = 'standalone',
  candidateId,
  deckSettings,
}: EDCCardProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when candidate changes
  useEffect(() => {
    setCurrentPage(1);
  }, [candidateId]);

  const showNarrative = deckSettings?.scope_narrative_display !== 'HIDE';

  return (
    <div
      className="edc-card"
      style={{
        position: "relative",
        maxWidth: fluid ? "100%" : "820px",
        margin: "0 auto",
        borderRadius: "20px",
        overflow: "visible",
        boxShadow:
          "0 0 0 1px rgba(197,165,114,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 30px 100px rgba(0,0,0,0.4), 0 0 120px rgba(197,165,114,0.04)",
      }}
    >
      <EDCHeader
        candidate_name={data.candidate_name}
        current_title={data.current_title}
        current_company={data.current_company}
        location={data.location}
        context={context}
      />
      <div style={{ background: "white" }}>
        {/* Page 1: Scope Match */}
        {currentPage === 1 && (
          <ScopeMatch
            scope_match={data.scope_match}
            scope_seasoning={showNarrative ? data.scope_seasoning : undefined}
          />
        )}

        {/* Page 2: Key Criteria */}
        {currentPage === 2 && (
          <KeyCriteria key_criteria={data.key_criteria} />
        )}

        {/* Page 3: Compensation + Motivation */}
        {currentPage === 3 && (
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
      <OurTakePopover
        fragments={data.our_take_fragments}
        text={data.our_take?.text}
        consultantName={data.consultant_name}
      />
      <PageNavigation current={currentPage} total={3} onChange={setCurrentPage} />
      <EDCFooter
        search_name={data.search_name}
        generated_date={data.generated_date}
      />
    </div>
  );
}
