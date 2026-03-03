"use client";

import SectionLabel from "@/components/ui/SectionLabel";

interface CompensationData {
  current_base: string;
  current_total: string;
  expected_base: string;
  expected_total: string;
  flexibility: string;
  budget_range?: string;
}

interface CompensationProps {
  compensation: CompensationData;
  notice_period: string;
}

const EMPTY = ["Not mentioned", "Not available", "N/A", "Not disclosed", "Not specified", ""];

function isEmpty(v: string | undefined): boolean {
  return !v || EMPTY.some((e) => v.trim().toLowerCase() === e.toLowerCase());
}

interface CardData {
  label: string;
  bigNumber: string;
  detail?: string;
  isGold?: boolean;
}

export default function Compensation({ compensation, notice_period }: CompensationProps) {
  const cards: CardData[] = [];

  // Card 1: Current
  if (!isEmpty(compensation.current_total) || !isEmpty(compensation.current_base)) {
    const big = !isEmpty(compensation.current_total)
      ? compensation.current_total
      : compensation.current_base;
    const detail = !isEmpty(compensation.current_total) && !isEmpty(compensation.current_base)
      ? `${compensation.current_base} base`
      : undefined;
    cards.push({ label: "Current", bigNumber: big, detail });
  }

  // Card 2: Expectation
  if (!isEmpty(compensation.expected_base) || !isEmpty(compensation.expected_total)) {
    const big = !isEmpty(compensation.expected_base)
      ? compensation.expected_base
      : compensation.expected_total;
    const detail = !isEmpty(compensation.expected_total) && !isEmpty(compensation.expected_base)
      && compensation.expected_total !== compensation.expected_base
      ? compensation.expected_total
      : undefined;
    cards.push({ label: "Expectation", bigNumber: big, detail });
  }

  // Card 3: Client Budget
  if (!isEmpty(compensation.budget_range)) {
    cards.push({ label: "Client Budget", bigNumber: compensation.budget_range!, isGold: true });
  }

  return (
    <section className="px-section-x py-section-y border-b border-ss-border">
      <SectionLabel label="Compensation" />

      {/* Three-card grid */}
      <div
        className="comp-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(cards.length, 3)}, 1fr)`,
          gap: "12px",
        }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              background: "var(--ss-warm-white)",
              borderRadius: "10px",
              padding: "14px 18px",
              border: card.isGold
                ? "1px solid rgba(197,165,114,0.3)"
                : "1px solid var(--ss-border-light)",
              boxShadow: card.isGold
                ? "0 0 0 1px rgba(197,165,114,0.15)"
                : undefined,
            }}
          >
            <div
              className="uppercase font-semibold"
              style={{
                fontSize: "0.62rem",
                letterSpacing: "1.5px",
                color: "var(--ss-gray-light)",
                marginBottom: "6px",
              }}
            >
              {card.label}
            </div>
            <div
              className="font-cormorant"
              style={{
                fontSize: "1.35rem",
                fontWeight: 600,
                color: "var(--ss-dark)",
                lineHeight: 1.2,
              }}
            >
              {card.bigNumber}
            </div>
            {card.detail && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--ss-gray)",
                  marginTop: "3px",
                }}
              >
                {card.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Flexibility note */}
      {!isEmpty(compensation.flexibility) && (
        <p
          style={{
            fontSize: "0.75rem",
            fontStyle: "italic",
            color: "var(--ss-gray)",
            marginTop: "8px",
            lineHeight: 1.4,
          }}
        >
          {compensation.flexibility}
        </p>
      )}

      {/* Notice + timeline metadata line */}
      {!isEmpty(notice_period) && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--ss-gray-light)",
            marginTop: "6px",
          }}
        >
          Notice: {notice_period}
        </div>
      )}
    </section>
  );
}
