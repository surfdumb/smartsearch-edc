interface EDCHeaderProps {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  role_title: string;
  consultant_name: string;
  generated_date: string;
}

export default function EDCHeader({
  candidate_name,
  current_title,
  current_company,
  location,
  role_title,
  consultant_name,
  generated_date,
}: EDCHeaderProps) {
  return (
    <header
      className="relative overflow-hidden rounded-t-card"
      style={{
        background: "#2d2824",
        padding: "36px 48px 32px",
      }}
    >
      {/* Subtle radial gold glow — top-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 85% 20%, rgba(197, 165, 114, 0.08) 0%, transparent 65%)",
        }}
      />

      {/* Top row: brand + badge */}
      <div className="relative flex items-center justify-between mb-6">
        <span
          className="uppercase tracking-[2px] text-[0.65rem] font-semibold"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          SmartSearch
        </span>
        <span
          className="uppercase tracking-[1.5px] text-[0.6rem] font-medium px-3 py-1 rounded-full"
          style={{
            color: "rgba(197, 165, 114, 0.7)",
            border: "1px solid rgba(197, 165, 114, 0.2)",
          }}
        >
          Executive Decision&trade; Card
        </span>
      </div>

      {/* Candidate name */}
      <h1
        className="relative font-bold"
        style={{
          fontSize: "2.5rem",
          lineHeight: 1.2,
          letterSpacing: "-0.5px",
          color: "#f5f0ea",
        }}
      >
        {candidate_name}
      </h1>

      {/* Flash line: title · company · location */}
      <p className="relative mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
        <span style={{ fontSize: "0.95rem" }}>
          {current_title}
          <span className="mx-2" style={{ color: "#c5a572", opacity: 0.5 }}>
            &middot;
          </span>
          {current_company}
          <span className="mx-2" style={{ color: "#c5a572", opacity: 0.5 }}>
            &middot;
          </span>
          {location}
        </span>
      </p>

      {/* Meta row separator */}
      <div
        className="relative mt-5"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "20px",
        }}
      >
        <div className="flex gap-10">
          <MetaItem label="Role" value={role_title} />
          <MetaItem label="Search Lead" value={consultant_name} />
          <MetaItem label="Generated" value={generated_date} />
        </div>
      </div>

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
    <div>
      <div
        className="uppercase font-semibold"
        style={{
          fontSize: "0.68rem",
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.35)",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.92rem",
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
