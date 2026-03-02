/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

// v1.0 soft-gate — keeps clients from stumbling across deck URLs.
// v1.1 will replace this with magic-link tokens (see CLAUDE.md auth section).
const CORRECT_PASSWORD = "ExecFlow2026!";
const STORAGE_KEY = "deck_authenticated";

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    try {
      setAuthenticated(sessionStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setAuthenticated(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      try { sessionStorage.setItem(STORAGE_KEY, "true"); } catch { /* ignore */ }
      setAuthenticated(true);
    } else {
      setError(true);
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 3000);
      inputRef.current?.focus();
    }
  };

  // Null while sessionStorage is being read (avoids flash)
  if (authenticated === null) {
    return <div style={{ minHeight: "100vh", background: "#0a0a0a" }} />;
  }

  if (authenticated) return <>{children}</>;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse, rgba(197,165,114,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Logo */}
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          style={{ height: "26px", opacity: 0.45, marginBottom: "36px" }}
        />

        {/* Title */}
        <h1
          className="font-cormorant"
          style={{
            fontSize: "1.7rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            marginBottom: "6px",
            fontStyle: "italic",
            lineHeight: 1.2,
          }}
        >
          Executive <span style={{ color: "var(--ss-gold)" }}>Decision</span> Deck
        </h1>
        <p
          style={{
            fontSize: "0.72rem",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "48px",
            fontWeight: 600,
          }}
        >
          Confidential · Authorised access only
        </p>

        {/* Password form */}
        <form onSubmit={handleSubmit}>
          <div
            className={shake ? "pw-shake" : ""}
            style={{ marginBottom: "12px" }}
          >
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access code"
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${error ? "rgba(184,84,80,0.5)" : "rgba(197,165,114,0.2)"}`,
                borderRadius: "10px",
                padding: "14px 18px",
                fontSize: "0.95rem",
                color: "rgba(255,255,255,0.85)",
                outline: "none",
                letterSpacing: "1px",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
                textAlign: "center",
              }}
              onFocus={(e) => {
                if (!error) (e.target as HTMLInputElement).style.borderColor = "rgba(197,165,114,0.5)";
              }}
              onBlur={(e) => {
                if (!error) (e.target as HTMLInputElement).style.borderColor = "rgba(197,165,114,0.2)";
              }}
            />
          </div>

          {/* Error message */}
          <p
            style={{
              fontSize: "0.72rem",
              color: error ? "rgba(201,149,58,0.85)" : "transparent",
              letterSpacing: "0.5px",
              marginBottom: "16px",
              transition: "color 0.2s",
              minHeight: "18px",
            }}
          >
            Incorrect access code — please try again
          </p>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(197,165,114,0.3)",
              borderRadius: "10px",
              padding: "13px 24px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--ss-gold)",
              letterSpacing: "1px",
              cursor: "pointer",
              transition: "all 0.2s",
              textTransform: "uppercase",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(197,165,114,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.5)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.3)";
            }}
          >
            Access Deck
          </button>
        </form>
      </div>

      <style>{`
        @keyframes pwShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .pw-shake {
          animation: pwShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
      `}</style>
    </main>
  );
}
