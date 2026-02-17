import { getCandidateData } from "@/lib/data";
import { notFound } from "next/navigation";
import EDCHeader from "@/components/edc/EDCHeader";

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

        {/* === CARD BODY (white, remaining sections as plain text for now) === */}
        <div className="bg-white rounded-b-card">
          <section className="px-section-x py-section-y border-b border-ss-border">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Scope Match
            </h2>
            {data.scope_match.map((item, i) => (
              <div key={i} className="mb-2 text-body text-ss-gray">
                <span className="font-semibold text-ss-dark">{item.dimension}</span>{" "}
                [{item.alignment}]
                <br />
                Candidate: {item.candidate_actual}
                <br />
                Requirement: {item.role_requirement}
              </div>
            ))}
            {data.scope_seasoning && (
              <p className="text-body text-ss-gray italic mt-3">
                Seasoning: {data.scope_seasoning}
              </p>
            )}
          </section>

          <section className="px-section-x py-section-y border-b border-ss-border">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Key Criteria Assessment
            </h2>
            {data.key_criteria.map((item, i) => (
              <div key={i} className="mb-3 text-body text-ss-gray">
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

          <section className="px-section-x py-section-y border-b border-ss-border">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Compensation & Timeline
            </h2>
            <div className="text-body text-ss-gray space-y-1">
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

          <section className="px-section-x py-section-y border-b border-ss-border">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Why Are They Interested?
            </h2>
            {data.why_interested.map((item, i) => (
              <div key={i} className="mb-2 text-body text-ss-gray">
                <span className="font-semibold text-ss-dark">
                  [{item.type}] {item.headline}
                </span>
                <br />
                {item.detail}
              </div>
            ))}
          </section>

          <section className="px-section-x py-section-y border-b border-ss-border">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Potential Concerns
            </h2>
            {data.potential_concerns.map((item, i) => (
              <div key={i} className="mb-2 text-body text-ss-gray">
                <span className="font-semibold text-ss-dark">
                  [{item.severity}]
                </span>{" "}
                {item.concern}
              </div>
            ))}
          </section>

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

          <section className="px-section-x py-section-y">
            <h2 className="text-section-label uppercase text-ss-gray-light mb-4">
              Our Take
            </h2>
            <p className="text-body text-ss-gray">{data.our_take.text}</p>
          </section>

          {/* Footer */}
          <footer
            className="px-section-x py-4 flex justify-between items-center rounded-b-card"
            style={{ background: "#faf9f6" }}
          >
            <span className="text-footer text-ss-gray-light">
              {data.search_name}
            </span>
            <span className="text-footer text-ss-gray-pale">
              SmartSearch Executive Search
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
