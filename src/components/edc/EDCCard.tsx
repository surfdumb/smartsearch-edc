"use client";

import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import Motivation from "@/components/edc/Motivation";
import Concerns from "@/components/edc/Concerns";
import OurTake from "@/components/edc/OurTake";
import EDCFooter from "@/components/edc/EDCFooter";
import { type EDCData, type EDCContext, buildCandidateContext } from "@/lib/types";

interface OurTakeResult {
  text: string;
  recommendation?: "ADVANCE" | "HOLD" | "PASS";
  discussion_points?: string[];
  ai_rationale?: string;
  original_note?: string;
}

interface EDCCardProps {
  data: EDCData;
  isConsultantView?: boolean;
  onOurTakeGenerated?: (result: OurTakeResult) => void;
  /** When true, card stretches to 100% (for split view) */
  fluid?: boolean;
  /** Controls which header fields are rendered */
  context?: EDCContext;
  /** Used to namespace localStorage edits/toggles per candidate */
  candidateId?: string;
}

export default function EDCCard({
  data,
  isConsultantView = false,
  onOurTakeGenerated,
  fluid = false,
  context = 'standalone',
  candidateId,
}: EDCCardProps) {
  return (
    <div
      className="edc-card"
      style={{
        maxWidth: fluid ? "100%" : "820px",
        margin: "0 auto",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(197,165,114,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 30px 100px rgba(0,0,0,0.4), 0 0 120px rgba(197,165,114,0.04)",
      }}
    >
      <EDCHeader
        candidate_name={data.candidate_name}
        current_title={data.current_title}
        current_company={data.current_company}
        location={data.location}
        role_title={data.role_title}
        consultant_name={data.consultant_name}
        generated_date={data.generated_date}
        context={context}
      />
      <div style={{ background: "white" }}>
        <ScopeMatch
          scope_match={data.scope_match}
          scope_seasoning={data.scope_seasoning}
        />
        <KeyCriteria key_criteria={data.key_criteria} />
        <Compensation
          compensation={data.compensation}
          notice_period={data.notice_period}
          earliest_start_date={data.earliest_start_date}
          candidateId={candidateId}
        />
        <Motivation why_interested={data.why_interested} />
        <Concerns potential_concerns={data.potential_concerns} candidateId={candidateId} />

        {/* Gold divider between evidence and judgment */}
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
            &#10022;
          </span>
        </div>

        <OurTake
          text={data.our_take.text}
          consultant_name={data.consultant_name}
          recommendation={data.our_take.recommendation}
          discussion_points={data.our_take.discussion_points}
          original_note={data.our_take.original_note}
          ai_rationale={data.our_take.ai_rationale}
          isConsultantView={isConsultantView}
          candidateId={candidateId}
          candidateContext={
            isConsultantView ? buildCandidateContext(data) : undefined
          }
          onOurTakeGenerated={onOurTakeGenerated}
        />
      </div>
      <EDCFooter
        search_name={data.search_name}
        generated_date={data.generated_date}
      />
    </div>
  );
}
