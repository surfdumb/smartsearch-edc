"use client";

import type { IntroCardData } from "@/lib/types";

interface IntroCardProps {
  card: IntroCardData;
  onClick: () => void;
}

export default function IntroCard({ card, onClick }: IntroCardProps) {
  const alignmentColor = {
    green: "var(--ss-green)",
    amber: "var(--ss-yellow)",
    red: "var(--ss-red)",
    not_set: "var(--ss-gray-light)",
  }[card.compensation_alignment ?? "not_set"];

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(26, 26, 26, 0.95)",
        border: "1px solid rgba(197, 165, 114, 0.12)",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(197, 165, 114, 0.35)";
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(197, 165, 114, 0.06)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(197, 165, 114, 0.12)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Header zone — warm charcoal */}
      <div
        style={{
          background: "var(--ss-header-bg)",
          padding: "28px 24px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-40px", right: "-40px",
            width: "180px", height: "180px",
            background: "radial-gradient(circle, rgba(197,165,114,0.07) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Avatar circle */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 0 0 3px rgba(197,165,114,0.15)",
          }}
        >
          <span
            className="font-cormorant"
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ss-dark)",
              lineHeight: 1,
            }}
          >
            {card.initials}
          </span>
        </div>

        <h3
          className="font-cormorant"
          style={{
            fontSize: "1.35rem",
            fontWeight: 500,
            color: "#f5f0ea",
            marginBottom: "4px",
            letterSpacing: "-0.2px",
          }}
        >
          {card.candidate_name}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--ss-gold)", marginBottom: "2px", fontWeight: 500 }}>
          {card.current_title}
        </p>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
          {card.current_company}
          {card.location && (
            <>
              <span style={{ margin: "0 6px", color: "rgba(197,165,114,0.3)" }}>·</span>
              {card.location}
            </>
          )}
        </p>
      </div>

      {/* Body zone */}
      <div style={{ padding: "18px 24px 14px" }}>
        {/* Flash summary */}
        {card.flash_summary && (
          <p
            style={{
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
              marginBottom: "14px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: card.flash_summary }}
          />
        )}

        {/* Key strengths */}
        {card.key_strengths && card.key_strengths.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
            {card.key_strengths.map((strength, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                <span style={{ color: "var(--ss-gold)", fontSize: "0.7rem", flexShrink: 0 }}>▸</span>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                  {strength}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notice period + compensation alignment */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {card.notice_period && (
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
              <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Notice:</span>{" "}
              {card.notice_period}
            </span>
          )}
          {card.compensation_alignment && card.compensation_alignment !== "not_set" && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                background: `${alignmentColor}18`,
                color: alignmentColor,
                letterSpacing: "0.5px",
              }}
            >
              {card.compensation_alignment === "green"
                ? "Comp aligned"
                : card.compensation_alignment === "amber"
                ? "Comp stretch"
                : "Comp gap"}
            </span>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          padding: "10px 24px",
          borderTop: "1px solid rgba(197,165,114,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Executive Decision Card
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--ss-gold)",
          }}
        >
          View →
        </span>
      </div>
    </div>
  );
}
