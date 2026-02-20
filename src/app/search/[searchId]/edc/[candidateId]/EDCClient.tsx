"use client";

import { useState } from "react";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import Motivation from "@/components/edc/Motivation";
import Concerns from "@/components/edc/Concerns";
import OurTake from "@/components/edc/OurTake";
import EDCFooter from "@/components/edc/EDCFooter";
import { type EDCData, buildCandidateContext } from "@/lib/types";

interface EDCClientProps {
  initialData: EDCData;
}

export default function EDCClient({ initialData }: EDCClientProps) {
  const [data, setData] = useState<EDCData>(initialData);

  return (
    <main className="min-h-screen pt-page-top px-5 pb-page-bottom bg-ss-page-bg">
      <div className="max-w-card mx-auto font-inter shadow-card rounded-card">
        {/* === HEADER === */}
        <EDCHeader
          candidate_name={data.candidate_name}
          current_title={data.current_title}
          current_company={data.current_company}
          location={data.location}
          role_title={data.role_title}
          consultant_name={data.consultant_name}
          generated_date={data.generated_date}
        />

        {/* === CARD BODY === */}
        <div className="bg-white">
          {/* 1. Scope Match */}
          <ScopeMatch
            scope_match={data.scope_match}
            scope_seasoning={data.scope_seasoning}
          />

          {/* 2. Key Criteria Assessment */}
          <KeyCriteria key_criteria={data.key_criteria} />

          {/* 3. Compensation & Timeline */}
          <Compensation
            compensation={data.compensation}
            notice_period={data.notice_period}
            earliest_start_date={data.earliest_start_date}
          />

          {/* 4. Why Are They Interested? */}
          <Motivation why_interested={data.why_interested} />

          {/* 5. Potential Concerns */}
          <Concerns potential_concerns={data.potential_concerns} />

          {/* ✦ Gold divider between evidence and judgment */}
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

          {/* 6. Our Take */}
          <OurTake
            text={data.our_take.text}
            consultant_name={data.consultant_name}
            recommendation={data.our_take.recommendation}
            discussion_points={data.our_take.discussion_points}
            original_note={data.our_take.original_note}
            ai_rationale={data.our_take.ai_rationale}
            isConsultantView={true}
            candidateContext={buildCandidateContext(data)}
            onOurTakeGenerated={(result) => {
              setData({
                ...data,
                our_take: {
                  text: result.text,
                  recommendation: result.recommendation,
                  discussion_points: result.discussion_points,
                  original_note: result.original_note,
                  ai_rationale: result.ai_rationale,
                },
              });
            }}
          />
        </div>

        {/* === FOOTER === */}
        <EDCFooter
          search_name={data.search_name}
          generated_date={data.generated_date}
        />
      </div>
    </main>
  );
}
