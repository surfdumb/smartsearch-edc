import { getCandidateData } from "@/lib/data";
import { notFound } from "next/navigation";

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
    <main className="min-h-screen p-page-top px-5 pb-page-bottom">
      <div className="max-w-card mx-auto font-inter">
        <h1 className="text-2xl font-bold text-ss-dark mb-1">
          {data.candidate_name}
        </h1>
        <p className="text-ss-gray mb-6">
          {data.current_title} · {data.current_company} · {data.location}
        </p>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Scope Match
          </h2>
          {data.scope_match.map((item, i) => (
            <div key={i} className="mb-2 text-sm text-ss-gray">
              <span className="font-semibold text-ss-dark">{item.dimension}</span>{" "}
              [{item.alignment}]
              <br />
              Candidate: {item.candidate_actual}
              <br />
              Requirement: {item.role_requirement}
            </div>
          ))}
          {data.scope_seasoning && (
            <p className="text-sm text-ss-gray italic mt-2">
              Seasoning: {data.scope_seasoning}
            </p>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Key Criteria
          </h2>
          {data.key_criteria.map((item, i) => (
            <div key={i} className="mb-3 text-sm text-ss-gray">
              <span className="font-semibold text-ss-dark">
                {i + 1}. {item.name}
              </span>
              {item.context_anchor && (
                <span className="ml-2 text-ss-blue text-xs">
                  [{item.context_anchor}]
                </span>
              )}
              <br />
              <span dangerouslySetInnerHTML={{ __html: item.evidence }} />
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Compensation & Timeline
          </h2>
          <div className="text-sm text-ss-gray space-y-1">
            <p>Current Base: {data.compensation.current_base}</p>
            <p>Current Total: {data.compensation.current_total}</p>
            <p>Expected Base: {data.compensation.expected_base}</p>
            <p>Expected Total: {data.compensation.expected_total}</p>
            <p>Flexibility: {data.compensation.flexibility}</p>
            {data.compensation.budget_range && (
              <p>Budget Range: {data.compensation.budget_range}</p>
            )}
            <p>Notice Period: {data.notice_period}</p>
            <p>Earliest Start: {data.earliest_start_date}</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Why Are They Interested?
          </h2>
          {data.why_interested.map((item, i) => (
            <div key={i} className="mb-2 text-sm text-ss-gray">
              <span className="font-semibold text-ss-dark">
                [{item.type}] {item.headline}
              </span>
              <br />
              {item.detail}
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Potential Concerns
          </h2>
          {data.potential_concerns.map((item, i) => (
            <div key={i} className="mb-2 text-sm text-ss-gray">
              <span className="font-semibold text-ss-dark">
                [{item.severity}]
              </span>{" "}
              {item.concern}
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ss-gray-light uppercase tracking-wider mb-2">
            Our Take
          </h2>
          <p className="text-sm text-ss-gray">{data.our_take.text}</p>
        </section>

        <footer className="text-xs text-ss-gray-light mt-8 pt-4 border-t border-ss-border">
          <p>
            {data.search_name} · {data.role_title} · Generated{" "}
            {data.generated_date} · {data.consultant_name}
          </p>
          {data.match_score_display === "HIDE" && (
            <p className="italic">Match score: hidden</p>
          )}
        </footer>
      </div>
    </main>
  );
}
