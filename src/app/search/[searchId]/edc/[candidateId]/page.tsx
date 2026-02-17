import { getCandidateData } from "@/lib/data";
import { notFound } from "next/navigation";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import Motivation from "@/components/edc/Motivation";
import Concerns from "@/components/edc/Concerns";
import OurTake from "@/components/edc/OurTake";
import EDCFooter from "@/components/edc/EDCFooter";

export default async function CandidateEDCPage({
  params,
}: {
  params: { searchId: string; candidateId: string };
}) {
  const data = await getCandidateData(params.searchId, params.candidateId);

  if (!data) {
    notFound();
  }

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

          {/* Gold divider between evidence and judgment */}
          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, transparent 10%, var(--ss-gold) 30%, var(--ss-gold) 70%, transparent 90%)",
              margin: "0 48px",
              opacity: 0.25,
            }}
          />

          {/* 6. Our Take */}
          <OurTake text={data.our_take.text} />
        </div>

        {/* === FOOTER === */}
        <EDCFooter search_name={data.search_name} />
      </div>
    </main>
  );
}
