/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SearchContext } from "@/lib/types";
import { useDeckTheme } from "@/hooks/useDeckTheme";

interface DeckSettingsProps {
  data: SearchContext;
  searchId: string;
}

export default function DeckSettings({ data, searchId }: DeckSettingsProps) {
  const router = useRouter();
  const { theme, setTheme } = useDeckTheme(searchId);
  const storageKey = `search_logo_${searchId}`;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const linkedInKey = `deck_show_linkedin_${searchId}`;
  const [showLinkedin, setShowLinkedin] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setLogoUrl(stored);
    } catch {
      // localStorage unavailable
    }
    try {
      const li = localStorage.getItem(linkedInKey);
      if (li === "false") setShowLinkedin(false);
    } catch { /* ignore */ }
  }, [storageKey, linkedInKey]);

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
    <main data-deck-theme={theme} style={{ minHeight: "100vh", background: "var(--deck-bg)", paddingBottom: "80px" }}>

      {/* Nav */}
      <div
        className="deck-settings-nav"
        style={{
          padding: "14px 32px",
          borderBottom: `1px solid rgba(197,165,114,var(--deck-gold-border-alpha))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--deck-bg)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => router.push(`/deck/${searchId}`)}
          style={{
            fontSize: "0.78rem",
            color: "var(--ss-gold)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          ← Back to Deck
        </button>
        <span
          className="font-cormorant"
          style={{ fontSize: "1rem", color: "rgba(var(--deck-bg-text-rgb),0.35)", fontStyle: "italic" }}
        >
          Deck Settings
        </span>
        <span style={{ width: "100px" }} />
      </div>

      <div className="deck-settings-content" style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Search context line */}
        <p style={{ fontSize: "0.75rem", color: "rgba(var(--deck-bg-text-rgb),0.2)", marginBottom: "40px" }}>
          <span style={{ color: "var(--ss-gold)", fontWeight: 600 }}>{data.search_name}</span>
          <span style={{ margin: "0 8px", color: "rgba(197,165,114,0.2)" }}>·</span>
          {data.client_company}
        </p>

        {/* ── Theme section ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(var(--deck-bg-text-rgb),0.3)",
              }}
            >
              Display Theme
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(197,165,114,0.1)" }} />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {(["dark", "hybrid", "light"] as const).map((opt) => {
              const active = theme === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setTheme(opt)}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    textTransform: "capitalize",
                    padding: "8px 22px",
                    borderRadius: "8px",
                    border: active
                      ? "1px solid rgba(197,165,114,0.5)"
                      : "1px solid rgba(var(--deck-bg-text-rgb),0.1)",
                    background: active ? "rgba(197,165,114,0.08)" : "transparent",
                    color: active ? "var(--ss-gold)" : "rgba(var(--deck-bg-text-rgb),0.3)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.15)", marginTop: "14px" }}>
            Applies to this deck in this browser.
          </p>
        </section>

        {/* ── Logo section ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(var(--deck-bg-text-rgb),0.3)",
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
            <p style={{ color: "rgba(var(--deck-bg-text-rgb),0.5)", fontSize: "0.9rem", marginBottom: "6px" }}>
              {logoUrl ? "Click or drag to replace logo" : "Click or drag to upload client logo"}
            </p>
            <p style={{ color: "rgba(var(--deck-bg-text-rgb),0.25)", fontSize: "0.75rem" }}>
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
                  color: "rgba(var(--deck-bg-text-rgb),0.25)",
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
                  color: "rgba(var(--deck-bg-text-rgb),0.3)",
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
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(var(--deck-bg-text-rgb),0.3)";
                }}
              >
                Remove logo
              </button>
            )}
          </div>
        </section>

        {/* ── LinkedIn toggle section ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(var(--deck-bg-text-rgb),0.3)",
              }}
            >
              LinkedIn Links
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(197,165,114,0.1)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(var(--deck-bg-text-rgb),0.5)" }}>
              Show LinkedIn links on candidate cards
            </span>
            <button
              onClick={() => {
                const next = !showLinkedin;
                setShowLinkedin(next);
                try { localStorage.setItem(linkedInKey, String(next)); } catch { /* ignore */ }
              }}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                border: "none",
                background: showLinkedin ? "rgba(74,124,89,0.4)" : "rgba(var(--deck-bg-text-rgb),0.12)",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showLinkedin ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: showLinkedin ? "var(--ss-green)" : "rgba(var(--deck-bg-text-rgb),0.3)",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>

          <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.15)", marginTop: "14px" }}>
            When enabled, a LinkedIn icon appears next to candidate names. URLs are set per-candidate in edit mode.
          </p>
        </section>

        {/* ── Storage note ── */}
        <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.15)", lineHeight: 1.6 }}>
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
