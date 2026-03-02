/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useEffect } from "react";
import type { SearchContext } from "@/lib/types";

interface DeckSettingsProps {
  data: SearchContext;
  searchId: string;
}

export default function DeckSettings({ data, searchId }: DeckSettingsProps) {
  const storageKey = `search_logo_${searchId}`;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setLogoUrl(stored);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file (PNG, JPG, SVG, WebP)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLogoUrl(dataUrl);
        setSaved(false);
        try {
          localStorage.setItem(storageKey, dataUrl);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch {
          // quota exceeded
        }
      };
      reader.readAsDataURL(file);
    },
    [storageKey]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    setSaved(false);
    try {
      localStorage.removeItem(storageKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: "80px" }}>

      {/* Nav */}
      <div
        style={{
          padding: "14px 32px",
          borderBottom: "1px solid rgba(197,165,114,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,10,10,0.96)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <a
          href={`/deck/${searchId}`}
          style={{
            fontSize: "0.78rem",
            color: "var(--ss-gold)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to Deck
        </a>
        <span
          className="font-cormorant"
          style={{ fontSize: "1rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}
        >
          Deck Settings
        </span>
        <span style={{ width: "100px" }} />
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Search context line */}
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)", marginBottom: "40px" }}>
          <span style={{ color: "var(--ss-gold)", fontWeight: 600 }}>{data.search_name}</span>
          <span style={{ margin: "0 8px", color: "rgba(197,165,114,0.2)" }}>·</span>
          {data.client_company}
        </p>

        {/* ── Logo section ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Client Logo
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(197,165,114,0.1)" }} />
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
            style={{
              border: `2px dashed ${isDragging ? "rgba(197,165,114,0.6)" : "rgba(197,165,114,0.2)"}`,
              borderRadius: "12px",
              padding: "36px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "rgba(197,165,114,0.04)" : "transparent",
              transition: "all 0.2s",
              marginBottom: "20px",
            }}
            onMouseOver={(e) => {
              if (!isDragging) {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197,165,114,0.4)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(197,165,114,0.02)";
              }
            }}
            onMouseOut={(e) => {
              if (!isDragging) {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197,165,114,0.2)";
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginBottom: "6px" }}>
              {logoUrl ? "Click or drag to replace logo" : "Click or drag to upload client logo"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>
              PNG, JPG, SVG, WebP — displayed at 22px height in deck header
            </p>
          </div>

          {/* Preview */}
          {logoUrl && (
            <div
              style={{
                background: "var(--ss-header-bg)",
                borderRadius: "12px",
                padding: "20px 28px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.25)",
                  marginBottom: "14px",
                }}
              >
                Preview
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <img
                  src={logoUrl}
                  alt="Client logo"
                  style={{ height: "22px", opacity: 0.85 }}
                />
                <span style={{ fontSize: "0.95rem", color: "var(--ss-gold)" }}>
                  {data.client_company}
                  <span style={{ color: "rgba(197,165,114,0.3)", margin: "0 8px" }}>·</span>
                  {data.client_location}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {saved && (
              <span style={{ fontSize: "0.78rem", color: "var(--ss-green)", fontWeight: 500 }}>
                ✓ Saved
              </span>
            )}
            {logoUrl && (
              <button
                onClick={handleRemoveLogo}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(197,165,114,0.15)",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "0.75rem",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,84,80,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(184,84,80,0.8)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.15)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
                }}
              >
                Remove logo
              </button>
            )}
          </div>
        </section>

        {/* ── Storage note ── */}
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.15)", lineHeight: 1.6 }}>
          Logo is stored locally in this browser. To make it visible to all users, add the file to{" "}
          <code style={{ color: "rgba(197,165,114,0.3)", fontSize: "0.7rem" }}>
            /public/logos/clients/{searchId}.png
          </code>{" "}
          and set{" "}
          <code style={{ color: "rgba(197,165,114,0.3)", fontSize: "0.7rem" }}>client_logo_url</code>{" "}
          in the deck fixture.
        </p>
      </div>
    </main>
  );
}
