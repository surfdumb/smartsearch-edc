/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";

interface SearchContextHeaderProps {
  search_name: string;
  client_company: string;
  client_location: string;
  key_criteria_names: string[];
  search_lead: string;
  client_logo_url?: string;
  searchId: string;
}

export default function SearchContextHeader({
  search_name,
  client_company,
  client_location,
  key_criteria_names,
  search_lead,
  client_logo_url,
  searchId,
}: SearchContextHeaderProps) {
  const storageKey = `search_logo_${searchId}`;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Load persisted logo on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setLogoUrl(stored ?? client_logo_url ?? null);
    } catch {
      setLogoUrl(client_logo_url ?? null);
    }
  }, [storageKey, client_logo_url]);

  return (
    <div
      className="search-context-header"
      style={{
        background: "var(--deck-surface)",
        backdropFilter: "blur(20px)",
        border: `1px solid rgba(197,165,114,var(--deck-gold-border-alpha))`,
        borderRadius: "16px",
        padding: "32px 40px",
        maxWidth: "800px",
        margin: "0 auto 40px",
        display: "flex",
        alignItems: "flex-start",
        gap: "32px",
      }}
    >
      {/* Left — text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "28px" }}>
          {/* Role info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="font-cormorant"
              style={{
                fontSize: "1.8rem",
                fontWeight: 600,
                color: "rgba(var(--deck-text-rgb),0.9)",
                marginBottom: "4px",
              }}
            >
              {search_name}
            </h1>

            <p style={{ fontSize: "0.95rem", color: "var(--ss-gold)", margin: "0 0 0" }}>
              {client_company}
              {client_location && (
                <>
                  <span style={{ color: "rgba(197,165,114,0.3)", margin: "0 8px" }}>·</span>
                  {client_location}
                </>
              )}
            </p>
          </div>

          {/* Client logo — aligned with role/company info */}
          {logoUrl && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoUrl}
                alt={client_company}
                style={{
                  maxHeight: "56px",
                  maxWidth: "140px",
                  objectFit: "contain",
                  opacity: 0.85,
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px", marginBottom: "16px" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "rgba(var(--deck-text-rgb),0.4)",
              marginBottom: "10px",
            }}
          >
            Key Criteria
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {key_criteria_names.map((name, i) => (
              <li
                key={i}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "rgba(var(--deck-text-rgb),0.7)",
                  padding: "3px 0",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    color: "var(--ss-gold)",
                    opacity: 0.6,
                    fontWeight: 600,
                    minWidth: "16px",
                  }}
                >
                  {i + 1}.
                </span>
                {name}
              </li>
            ))}
          </ol>
        </div>

        <p style={{ fontSize: "0.8rem", color: "rgba(var(--deck-text-rgb),0.4)" }}>
          Search Lead: {search_lead}
        </p>
      </div>
    </div>
  );
}
