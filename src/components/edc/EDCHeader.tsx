/* eslint-disable @next/next/no-img-element */
import type { EDCContext } from "@/lib/types";

interface EDCHeaderProps {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  role_title: string;
  consultant_name: string;
  generated_date: string;
  context?: EDCContext;
}

export default function EDCHeader({
  candidate_name,
  current_title,
  current_company,
  location,
  role_title,
  consultant_name,
  generated_date,
  context = 'standalone',
}: EDCHeaderProps) {
  // Comparison context: compact — just name + title/company, no brand bar or meta row
  if (context === 'comparison') {
    return (
      <header
        className="relative overflow-hidden rounded-t-card"
        style={{
          background: "var(--ss-header-bg)",
          padding: "24px 32px 20px",
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-60px", right: "-60px",
            width: "240px", height: "240px",
            background: "radial-gradient(circle, rgba(197, 165, 114, 0.06) 0%, transparent 65%)",
          }}
        />
        <h1
          className="relative font-cormorant"
          style={{
            fontSize: "2rem",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.3px",
            color: "#f5f0ea",
            marginBottom: "6px",
          }}
        >
          {candidate_name}
        </h1>
        <p className="relative" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
          {current_title}
          <span style={{ color: "rgba(197, 165, 114, 0.5)", margin: "0 8px" }}>·</span>
          {current_company}
        </p>
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(197, 165, 114, 0.35), transparent)",
          }}
        />
      </header>
    );
  }

  return (
    <header
      className="edc-header relative overflow-hidden rounded-t-card"
      style={{
        background: "var(--ss-header-bg)",
        padding: "24px 40px 20px",
      }}
    >
      {/* Radial gold glow — positioned top-right, matching prototype ::before */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-80px",
          right: "-80px",
          width: "340px",
          height: "340px",
          background:
            "radial-gradient(circle, rgba(197, 165, 114, 0.08) 0%, transparent 65%)",
        }}
      />

      {/* Top row: brand logo + EDC badge */}
      <div className="edc-header-toprow relative flex items-start justify-between" style={{ marginBottom: "16px" }}>
        {/* SmartSearch logo */}
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          style={{
            height: "24px",
            opacity: 0.55,
          }}
        />

        {/* EDC Badge — Sorts Mill Goudy treatment */}
        <div className="flex flex-col items-end gap-0">
          <span
            className="font-sorts-mill"
            style={{
              fontSize: "1.15rem",
              fontWeight: 400,
              color: "var(--ss-gold-light)",
              letterSpacing: "0.5px",
              lineHeight: 1.15,
            }}
          >
            Executive{" "}
            <em style={{ fontStyle: "italic", color: "var(--ss-gold)" }}>
              Decision
            </em>
          </span>
          <span
            className="uppercase font-semibold"
            style={{
              fontSize: "0.58rem",
              letterSpacing: "2.5px",
              color: "rgba(197, 165, 114, 0.4)",
              marginTop: "1px",
            }}
          >
            Card
          </span>
        </div>
      </div>

      {/* Candidate name — Cormorant Garamond 3.2rem/500 */}
      <h1
        className="edc-candidate-name relative font-cormorant"
        style={{
          fontSize: "2.0rem",
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: "-0.5px",
          color: "#f5f0ea",
          marginBottom: "10px",
        }}
      >
        {candidate_name}
      </h1>

      {/* Flash line: company | title | location */}
      <p className="edc-flash-line relative" style={{ color: "rgba(255,255,255,0.55)" }}>
        <span
          style={{ fontSize: "0.88rem", fontWeight: 400, letterSpacing: "0.3px" }}
        >
          {current_company}
          <span style={{ color: "rgba(197, 165, 114, 0.5)", margin: "0 10px" }}>
            |
          </span>
          {current_title}
          <span style={{ color: "rgba(197, 165, 114, 0.5)", margin: "0 10px" }}>
            |
          </span>
          {location}
        </span>
      </p>

      {/* Meta row — standalone/print only */}
      {context !== 'deck' && (
        <div
          className="relative flex"
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            gap: "24px",
          }}
        >
          <MetaItem label="Role" value={role_title} />
          <MetaItem label="Generated" value={generated_date} />
        </div>
      )}

      {/* Bottom border — gold gradient */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(197, 165, 114, 0.35), transparent)",
        }}
      />
    </header>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: "3px" }}>
      <div
        className="uppercase font-semibold"
        style={{
          fontSize: "0.68rem",
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.92rem",
          color: "rgba(255,255,255,0.78)",
          fontWeight: 400,
        }}
      >
        {value}
      </div>
    </div>
  );
}
