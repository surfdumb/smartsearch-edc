import SectionLabel from "@/components/ui/SectionLabel";

interface CompensationProps {
  compensation: {
    current_base: string;
    current_total: string;
    expected_base: string;
    expected_total: string;
    flexibility: string;
    budget_range?: string;
  };
  notice_period: string;
  earliest_start_date: string;
}

export default function Compensation({
  compensation,
  notice_period,
  earliest_start_date,
}: CompensationProps) {
  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Compensation & Timeline" />

      {/* Three-column grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Current */}
        <CompColumn title="Current Package">
          <CompRow label="Base" value={compensation.current_base} />
          <CompRow label="Total" value={compensation.current_total} />
        </CompColumn>

        {/* Expectation */}
        <CompColumn title="Expectation">
          <CompRow label="Base" value={compensation.expected_base} />
          <CompRow label="Total" value={compensation.expected_total} />
        </CompColumn>

        {/* Budget — gold highlight */}
        <CompColumn title="Client Budget" highlighted>
          <CompRow
            label="Range"
            value={compensation.budget_range || "Not specified"}
          />
        </CompColumn>
      </div>

      {/* Flexibility note */}
      {compensation.flexibility && (
        <p className="text-body text-ss-gray mb-5" style={{ lineHeight: 1.65 }}>
          {compensation.flexibility}
        </p>
      )}

      {/* Notice period and timeline */}
      <div
        className="flex gap-10 pt-4"
        style={{ borderTop: "1px solid var(--ss-border-light)" }}
      >
        <div>
          <span className="text-meta-label uppercase text-ss-gray-light block mb-1">
            Notice Period
          </span>
          <span className="text-body text-ss-dark font-medium">
            {notice_period}
          </span>
        </div>
        <div>
          <span className="text-meta-label uppercase text-ss-gray-light block mb-1">
            Earliest Start
          </span>
          <span className="text-body text-ss-dark font-medium">
            {earliest_start_date}
          </span>
        </div>
      </div>
    </section>
  );
}

function CompColumn({
  title,
  highlighted,
  children,
}: {
  title: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: highlighted ? "var(--ss-gold-glow)" : "var(--ss-warm-tint)",
        border: highlighted
          ? "1px solid rgba(197, 165, 114, 0.2)"
          : "1px solid var(--ss-border-light)",
      }}
    >
      <div
        className="text-meta-label uppercase text-ss-gray-light mb-3"
        style={{
          color: highlighted ? "var(--ss-gold-deep)" : undefined,
        }}
      >
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CompRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-body text-ss-gray-light text-[0.75rem]">
        {label}
      </span>
      <p className="text-body text-ss-dark font-medium">{value}</p>
    </div>
  );
}
