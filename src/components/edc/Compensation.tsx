"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

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

      {/* Three-column grid — prototype: 1fr 1fr 1fr, gap 16px */}
      <div
        className="comp-grid grid grid-cols-3 mb-4"
        style={{ gap: "16px" }}
      >
        {/* Current */}
        <CompCard title="Current Package">
          <CompValue value={compensation.current_base} />
          <CompDetail text={compensation.current_total} />
        </CompCard>

        {/* Expectation */}
        <CompCard title="Expectation">
          <CompValue value={compensation.expected_base} />
          <CompDetail text={compensation.expected_total} />
        </CompCard>

        {/* Budget — gold highlight */}
        <CompCard title="Client Budget" highlighted>
          <CompValue value={compensation.budget_range || "Not specified"} />
        </CompCard>
      </div>

      {/* Flexibility note */}
      {compensation.flexibility && (
        <EditableField
          value={compensation.flexibility}
          as="p"
          className="text-body text-ss-gray mb-5"
          style={{ lineHeight: 1.65 }}
        />
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
          <EditableField
            value={notice_period}
            as="span"
            className="text-body text-ss-dark font-medium"
          />
        </div>
        <div>
          <span className="text-meta-label uppercase text-ss-gray-light block mb-1">
            Earliest Start
          </span>
          <EditableField
            value={earliest_start_date}
            as="span"
            className="text-body text-ss-dark font-medium"
          />
        </div>
      </div>
    </section>
  );
}

function CompCard({
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
      style={{
        background: highlighted ? "var(--ss-gold-glow)" : "var(--ss-warm-tint)",
        border: highlighted
          ? "1px solid rgba(197, 165, 114, 0.2)"
          : "1px solid transparent",
        borderRadius: "12px",
        padding: "20px 22px",
        textAlign: "center",
      }}
    >
      <div
        className="uppercase font-semibold"
        style={{
          fontSize: "0.68rem",
          letterSpacing: "1.5px",
          color: highlighted ? "var(--ss-gold-deep)" : "var(--ss-gray-light)",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function CompValue({ value }: { value: string }) {
  return (
    <div
      className="font-cormorant"
      style={{
        fontSize: "1.7rem",
        fontWeight: 600,
        color: "var(--ss-dark)",
      }}
    >
      {value}
    </div>
  );
}

function CompDetail({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: "0.8rem",
        color: "var(--ss-gray)",
        marginTop: "4px",
      }}
    >
      {text}
    </div>
  );
}
