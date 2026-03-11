"use client";

interface EDCFooterProps {
  search_name: string;
  roleTitle?: string;
}

export default function EDCFooter({
  search_name,
  roleTitle,
}: EDCFooterProps) {
  return (
    <footer
      className="font-outfit"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 32px",
        background: "var(--ss-cream)",
        borderTop: "1px solid var(--ss-border)",
        borderRadius: "0 0 var(--edc-card-radius) var(--edc-card-radius)",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Left: search info — company distinct from role */}
      <span
        style={{
          fontSize: "0.78rem",
          letterSpacing: "0.3px",
          display: "flex",
          alignItems: "center",
          gap: "0",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--ss-gray)" }}>{search_name}</span>
        {roleTitle && (
          <>
            <span style={{ color: "var(--ss-gold)", margin: "0 10px", opacity: 0.3, fontSize: "0.65rem" }}>|</span>
            <span style={{ fontWeight: 400, color: "var(--ss-gray-light)" }}>{roleTitle}</span>
          </>
        )}
      </span>

      {/* Right: confidential disclaimer */}
      <span
        style={{
          fontSize: "0.62rem",
          fontWeight: 400,
          color: "var(--ss-gray-light)",
          letterSpacing: "0.3px",
          opacity: 0.6,
        }}
      >
        Confidential
      </span>
    </footer>
  );
}
