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
      {/* Left: search info */}
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 400,
          color: "var(--ss-gray)",
          letterSpacing: "0.3px",
        }}
      >
        {search_name}
        {roleTitle && (
          <>
            <span style={{ color: "var(--ss-gold)", margin: "0 6px", opacity: 0.4 }}>·</span>
            {roleTitle}
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
