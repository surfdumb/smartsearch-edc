/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SearchContext } from "@/lib/types";
import { useDeckTheme } from "@/hooks/useDeckTheme";
import { generateAccessPassword } from "@/lib/passwordGen";

export interface AccessSettings {
  access_password: string | null;
  is_complete: boolean;
  completed_at: string | null;
}

interface DeckSettingsProps {
  data: SearchContext;
  searchId: string;
  initialAccess: AccessSettings;
}

export default function DeckSettings({ data, searchId, initialAccess }: DeckSettingsProps) {
  const router = useRouter();
  const { theme, setTheme } = useDeckTheme(searchId);
  const storageKey = `search_logo_${searchId}`;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const linkedInKey = `deck_show_linkedin_${searchId}`;
  const [showLinkedin, setShowLinkedin] = useState(true);

  // ─── Client Access state ───
  const [accessPassword, setAccessPassword] = useState<string>(initialAccess.access_password ?? "");
  const [accessEnabled, setAccessEnabled] = useState<boolean>(initialAccess.access_password !== null);
  const [accessSaved, setAccessSaved] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // ─── Search Status state ───
  const [isComplete, setIsComplete] = useState<boolean>(initialAccess.is_complete);
  const [completedAt, setCompletedAt] = useState<string | null>(initialAccess.completed_at);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // ─── Regenerate confirmation state ───
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const persistAccessPassword = useCallback(
    async (value: string | null) => {
      setAccessSaving(true);
      try {
        const res = await fetch(`/api/deck/${searchId}/access-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: value }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        setAccessSaved(true);
        setTimeout(() => setAccessSaved(false), 2000);
      } catch (err) {
        alert(`Could not save access settings: ${(err as Error).message}`);
      } finally {
        setAccessSaving(false);
      }
    },
    [searchId]
  );

  const handleToggleAccess = useCallback(async () => {
    if (accessEnabled) {
      setAccessEnabled(false);
      setAccessPassword("");
      await persistAccessPassword(null);
    } else {
      const generated = generateAccessPassword();
      setAccessEnabled(true);
      setAccessPassword(generated);
      await persistAccessPassword(generated);
    }
  }, [accessEnabled, persistAccessPassword]);

  const handleGenerate = useCallback(async () => {
    const generated = generateAccessPassword();
    setAccessPassword(generated);
    setShowRegenerateConfirm(false);
    await persistAccessPassword(generated);
  }, [persistAccessPassword]);

  const handlePasswordBlur = useCallback(async () => {
    if (!accessEnabled) return;
    if (accessPassword === (initialAccess.access_password ?? "")) return;
    if (accessPassword.length === 0) return;
    await persistAccessPassword(accessPassword);
  }, [accessEnabled, accessPassword, initialAccess.access_password, persistAccessPassword]);

  const copyToClipboard = useCallback(async (text: string, hint: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(hint);
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      alert("Could not copy — your browser may have blocked clipboard access.");
    }
  }, []);

  const handleCopyEmailTemplate = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deckUrl = `${origin}/deck/${searchId}`;
    const template = `Hi {{Client Name}},

Please find below the link to review candidates for ${data.search_name}:

${deckUrl}

Access code: ${accessPassword}

This link is confidential and limited to your hiring team. Let me know if you have any questions.

Best,
{{Your Name}}`;
    copyToClipboard(template, "Email template copied");
  }, [searchId, data.search_name, accessPassword, copyToClipboard]);

  const handleMarkComplete = useCallback(async () => {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/deck/${searchId}/mark-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const json = await res.json();
      setIsComplete(true);
      setCompletedAt(json.completed_at);
      setShowCompleteConfirm(false);
    } catch (err) {
      alert(`Could not mark complete: ${(err as Error).message}`);
    } finally {
      setStatusSaving(false);
    }
  }, [searchId]);

  const handleReopen = useCallback(async () => {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/deck/${searchId}/mark-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: false }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setIsComplete(false);
      setCompletedAt(null);
    } catch (err) {
      alert(`Could not reopen: ${(err as Error).message}`);
    } finally {
      setStatusSaving(false);
    }
  }, [searchId]);

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

          <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.65)", marginTop: "14px" }}>
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
            <p style={{ color: "rgba(var(--deck-bg-text-rgb),0.65)", fontSize: "0.75rem" }}>
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

          <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.65)", marginTop: "14px" }}>
            When enabled, a LinkedIn icon appears next to candidate names. URLs are set per-candidate in edit mode.
          </p>
        </section>

        {/* ── Client Access section ── */}
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
              Client Access
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(197,165,114,0.1)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: accessEnabled ? "16px" : "0" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(var(--deck-bg-text-rgb),0.5)" }}>
              Require password to view
            </span>
            <button
              onClick={handleToggleAccess}
              disabled={accessSaving}
              aria-label="Toggle client access password"
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                border: "none",
                background: accessEnabled ? "rgba(74,124,89,0.4)" : "rgba(var(--deck-bg-text-rgb),0.12)",
                cursor: accessSaving ? "wait" : "pointer",
                position: "relative",
                transition: "background 0.2s",
                opacity: accessSaving ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: accessEnabled ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: accessEnabled ? "var(--ss-green)" : "rgba(var(--deck-bg-text-rgb),0.3)",
                  transition: "all 0.2s",
                }}
              />
            </button>
          </div>

          {accessEnabled && (
            <>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="text"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  onBlur={handlePasswordBlur}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "rgba(var(--deck-bg-text-rgb),0.04)",
                    border: "1px solid rgba(197,165,114,0.2)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    color: "rgba(var(--deck-bg-text-rgb),0.85)",
                    outline: "none",
                    letterSpacing: "0.5px",
                  }}
                />
                <button
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={accessSaving}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(197,165,114,0.3)",
                    color: "var(--ss-gold)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "0 16px",
                    borderRadius: "8px",
                    cursor: accessSaving ? "wait" : "pointer",
                    letterSpacing: "0.5px",
                    opacity: accessSaving ? 0.6 : 1,
                  }}
                >
                  Regenerate
                </button>
                <button
                  onClick={() => copyToClipboard(accessPassword, "Password copied")}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(197,165,114,0.15)",
                    color: "rgba(var(--deck-bg-text-rgb),0.5)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "0 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Copy
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <button
                  onClick={handleCopyEmailTemplate}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(197,165,114,0.3)",
                    color: "var(--ss-gold)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Copy email template
                </button>
                {accessSaved && (
                  <span style={{ fontSize: "0.78rem", color: "var(--ss-green)", fontWeight: 500 }}>
                    ✓ Saved
                  </span>
                )}
                {copyHint && (
                  <span style={{ fontSize: "0.78rem", color: "var(--ss-green)", fontWeight: 500 }}>
                    ✓ {copyHint}
                  </span>
                )}
              </div>

              <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.55)", lineHeight: 1.6 }}>
                Changing the password requires you to re-share it with the client. Active client sessions stay valid for up to 48 hours.
              </p>
            </>
          )}

          {!accessEnabled && (
            <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.55)", marginTop: "14px", lineHeight: 1.6 }}>
              When enabled, clients must enter a password before viewing this deck. Use for confidential searches.
            </p>
          )}
        </section>

        {/* ── Search Status section ── */}
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
              Search Status
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(197,165,114,0.1)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.92rem", color: "rgba(var(--deck-bg-text-rgb),0.7)", marginBottom: "4px", fontWeight: 500 }}>
                {isComplete ? "Completed" : "Live"}
              </p>
              {isComplete && completedAt && (
                <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.4)" }}>
                  {new Date(completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
            {isComplete ? (
              <button
                onClick={handleReopen}
                disabled={statusSaving}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(197,165,114,0.3)",
                  color: "var(--ss-gold)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: statusSaving ? "wait" : "pointer",
                  letterSpacing: "0.5px",
                  opacity: statusSaving ? 0.6 : 1,
                }}
              >
                Reopen Search
              </button>
            ) : (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                disabled={statusSaving}
                style={{
                  background: "rgba(var(--deck-bg-text-rgb),0.04)",
                  border: "1px solid rgba(var(--deck-bg-text-rgb),0.15)",
                  color: "rgba(var(--deck-bg-text-rgb),0.7)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: statusSaving ? "wait" : "pointer",
                  letterSpacing: "0.5px",
                  opacity: statusSaving ? 0.6 : 1,
                }}
              >
                Mark Search Complete
              </button>
            )}
          </div>

          <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.55)", marginTop: "14px", lineHeight: 1.6 }}>
            {isComplete
              ? "Reopening restores client access — clients will need to re-enter the password."
              : "Marking complete revokes client access immediately. The row in Live Searches must be moved manually for now."}
          </p>
        </section>

        {showRegenerateConfirm && (
          <div
            onClick={() => setShowRegenerateConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--deck-bg)",
                border: "1px solid rgba(197,165,114,0.2)",
                borderRadius: "12px",
                padding: "28px",
                maxWidth: "420px",
                width: "100%",
              }}
            >
              <h3
                className="font-cormorant"
                style={{
                  fontSize: "1.2rem",
                  color: "rgba(var(--deck-bg-text-rgb),0.85)",
                  fontStyle: "italic",
                  marginBottom: "12px",
                }}
              >
                Replace the current password?
              </h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(var(--deck-bg-text-rgb),0.6)", lineHeight: 1.6, marginBottom: "24px" }}>
                This invalidates the previously-shared one. Clients currently viewing the deck stay in for up to 48 hours; new visitors will need the new password.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowRegenerateConfirm(false)}
                  disabled={accessSaving}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(var(--deck-bg-text-rgb),0.15)",
                    color: "rgba(var(--deck-bg-text-rgb),0.5)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={accessSaving}
                  style={{
                    background: "var(--ss-gold)",
                    border: "1px solid var(--ss-gold)",
                    color: "#1a1a1a",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "8px",
                    cursor: accessSaving ? "wait" : "pointer",
                    letterSpacing: "0.5px",
                    opacity: accessSaving ? 0.6 : 1,
                  }}
                >
                  {accessSaving ? "Saving..." : "Regenerate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCompleteConfirm && (
          <div
            onClick={() => setShowCompleteConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--deck-bg)",
                border: "1px solid rgba(197,165,114,0.2)",
                borderRadius: "12px",
                padding: "28px",
                maxWidth: "420px",
                width: "100%",
              }}
            >
              <h3
                className="font-cormorant"
                style={{
                  fontSize: "1.2rem",
                  color: "rgba(var(--deck-bg-text-rgb),0.85)",
                  fontStyle: "italic",
                  marginBottom: "12px",
                }}
              >
                Mark this search as complete?
              </h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(var(--deck-bg-text-rgb),0.6)", lineHeight: 1.6, marginBottom: "24px" }}>
                This will revoke client access to all candidates in this search. This can be undone by reopening the search.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  disabled={statusSaving}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(var(--deck-bg-text-rgb),0.15)",
                    color: "rgba(var(--deck-bg-text-rgb),0.5)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkComplete}
                  disabled={statusSaving}
                  style={{
                    background: "var(--ss-gold)",
                    border: "1px solid var(--ss-gold)",
                    color: "#1a1a1a",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "8px",
                    cursor: statusSaving ? "wait" : "pointer",
                    letterSpacing: "0.5px",
                    opacity: statusSaving ? 0.6 : 1,
                  }}
                >
                  {statusSaving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Storage note ── */}
        <p style={{ fontSize: "0.72rem", color: "rgba(var(--deck-bg-text-rgb),0.65)", lineHeight: 1.6 }}>
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
