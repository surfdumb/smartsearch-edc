"use client";

import type { IntroCardData } from "@/lib/types";

function formatCardName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}`;
}

interface IntroCardProps {
  card: IntroCardData;
  onClick: () => void;
}

export default function IntroCard({ card, onClick }: IntroCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-8px) scale(1.02)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
      }}
    >
      {/* Dark header zone */}
      <div
        style={{
          background: "var(--ss-header-bg)",
          padding: "28px 24px 24px",
          textAlign: "center",
        }}
      >
        {/* Avatar circle */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--ss-gold), var(--ss-gold-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <span
            className="font-cormorant"
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--ss-dark)",
            }}
          >
            {card.initials}
          </span>
        </div>

        <h3
          className="font-cormorant"
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#f5f0ea",
            marginBottom: "4px",
          }}
        >
          {formatCardName(card.candidate_name)}
        </h3>
        <p style={{ fontSize: "14px", color: "var(--ss-gold)", marginBottom: "2px" }}>
          {card.current_title}
        </p>
        <p style={{ fontSize: "13px", color: "var(--ss-gray-light)" }}>
          {card.current_company} · {card.location}
        </p>
      </div>

      {/* Body zone */}
      <div style={{ padding: "20px 24px 16px" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--ss-gray)",
            lineHeight: 1.5,
            marginBottom: "14px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.flash_summary}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "16px" }}>
          {card.key_strengths.map((strength, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
              <span style={{ color: "var(--ss-gold)", fontSize: "14px" }}>·</span>
              <span style={{ fontSize: "13px", color: "var(--ss-gray)" }}>{strength}</span>
            </div>
          ))}
        </div>

        {card.notice_period && (
          <p style={{ fontSize: "12px", color: "var(--ss-gray-light)", marginBottom: "12px" }}>
            <span style={{ fontWeight: 600 }}>Notice:</span> {card.notice_period}
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--ss-border)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--ss-gold)",
            letterSpacing: "0.5px",
          }}
        >
          View Full Assessment →
        </span>
      </div>
    </div>
  );
}
