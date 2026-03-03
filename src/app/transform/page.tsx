/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import EDSInput from "@/components/transform/EDSInput";
import TransformButton from "@/components/transform/TransformButton";
import EDCCard from "@/components/edc/EDCCard";
import { type EDCData } from "@/lib/types";

type TransformState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: EDCData }
  | { status: "error"; message: string };

export default function TransformPage() {
  const [rawText, setRawText] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [state, setState] = useState<TransformState>({ status: "idle" });

  const handleTransform = async () => {
    if (!rawText || rawText.length < 100) {
      setState({
        status: "error",
        message:
          "This doesn't look like a complete EDS. Please paste the full document content.",
      });
      return;
    }

    setState({ status: "loading" });

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, manualNotes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transformation failed");
      }

      const data: EDCData = await res.json();
      setState({ status: "success", data });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Transformation failed — please try again";
      setState({ status: "error", message });
    }
  };

  return (
    <main className="transform-page">
      {/* ===== Top bar ===== */}
      <header className="transform-topbar">
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          className="transform-logo"
        />
        <div className="transform-badge">
          <span className="font-sorts-mill">
            EDS <span style={{ opacity: 0.5, margin: "0 6px" }}>&rarr;</span>{" "}
            EDC
          </span>
        </div>
      </header>

      {/* ===== Input section ===== */}
      {state.status !== "success" && (
        <div className="transform-input-section">
          {/* Title area */}
          <div className="transform-title-area">
            <h1 className="font-cormorant transform-heading">
              Transform an EDS into an
              <br />
              <span className="transform-heading-accent">
                Executive Decision Card
              </span>
            </h1>
            <p className="transform-subtitle">
              Paste the raw EDS text or upload a .docx file below
            </p>
          </div>

          {/* Input card with border */}
          <div className="transform-input-card">
            <EDSInput
              onTextReady={setRawText}
              disabled={state.status === "loading"}
            />
          </div>

          {/* Manual Notes Section */}
          <div className="transform-notes-section">
            <div className="transform-notes-header">
              <span className="transform-notes-label">
                Consultant Manual Notes
              </span>
              <span className="transform-notes-hint">
                (optional &mdash; used to generate &ldquo;Our Take&rdquo;)
              </span>
            </div>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              disabled={state.status === "loading"}
              placeholder={`Write your raw, uninhibited notes here...

Examples:
• "He's a builder, not a polished corporate type — real operator energy"
• "Concerned about his English — B2 level might be a problem in board settings"
• "Surprisingly strong on data for someone from that background"
• "Worth advancing but client needs to decide on the board experience gap"

These notes are NEVER shown to clients. They're used to generate the professional "Our Take" section.`}
              className="transform-notes-textarea"
              style={{
                opacity: state.status === "loading" ? 0.5 : 1,
              }}
            />
          </div>

          <TransformButton
            onClick={handleTransform}
            loading={state.status === "loading"}
            disabled={!rawText || rawText.length < 100}
          />

          {/* Illustrative data disclaimer */}
          <p className="transform-disclaimer">
            *Illustrative data evaluation only, not indicative of EDC final
            outcomes.
          </p>

          {/* Loading state */}
          {state.status === "loading" && (
            <div className="transform-loading">
              <div className="transform-loading-icon">
                <img
                  src="/logos/smartsearch-white.png"
                  alt=""
                  style={{
                    height: "32px",
                    opacity: 0.6,
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
              </div>
              <p className="font-cormorant transform-loading-text">
                Building your Executive Decision Card...
              </p>
            </div>
          )}

          {/* Error state */}
          {state.status === "error" && (
            <div className="transform-error">{state.message}</div>
          )}
        </div>
      )}

      {/* ===== EDC Preview ===== */}
      {state.status === "success" && (
        <div className="transform-preview">
          {/* Back / New Transform button */}
          <div className="transform-preview-header">
            <button
              onClick={() => setState({ status: "idle" })}
              className="transform-back-button"
            >
              &larr; New Transform
            </button>
            <span className="transform-preview-badge">
              &#10022; Card Generated Successfully
            </span>
          </div>

          {/* The EDC Card — using reusable component */}
          <EDCCard data={state.data} />
        </div>
      )}

      <style jsx>{`
        .transform-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
        }

        /* ===== Top bar ===== */
        .transform-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 40px;
          border-bottom: 1px solid rgba(197, 165, 114, 0.12);
          background: linear-gradient(
            180deg,
            rgba(45, 40, 36, 0.4) 0%,
            transparent 100%
          );
        }

        .transform-logo {
          height: 24px;
          opacity: 0.55;
        }

        .transform-badge {
          font-size: 1.05rem;
          color: var(--ss-gold);
          letter-spacing: 1px;
        }

        /* ===== Input section ===== */
        .transform-input-section {
          padding: 48px 24px 60px;
          max-width: 860px;
          margin: 0 auto;
        }

        .transform-title-area {
          text-align: center;
          margin-bottom: 40px;
        }

        .transform-heading {
          font-size: 2.4rem;
          font-weight: 500;
          color: rgba(245, 240, 234, 0.85);
          line-height: 1.3;
          margin-bottom: 12px;
        }

        .transform-heading-accent {
          color: var(--ss-gold);
          font-style: italic;
        }

        .transform-subtitle {
          color: rgba(255, 255, 255, 0.35);
          font-size: 0.92rem;
          letter-spacing: 0.3px;
        }

        /* ===== Input card ===== */
        .transform-input-card {
          background: rgba(17, 17, 17, 0.6);
          border: 1px solid rgba(197, 165, 114, 0.12);
          border-radius: 16px;
          padding: 24px 24px 20px;
          backdrop-filter: blur(10px);
        }

        /* ===== Notes section ===== */
        .transform-notes-section {
          margin-top: 24px;
        }

        .transform-notes-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .transform-notes-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: var(--ss-gold);
        }

        .transform-notes-hint {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.28);
          font-style: italic;
        }

        .transform-notes-textarea {
          width: 100%;
          min-height: 180px;
          padding: 20px;
          font-family: "SF Mono", "Fira Code", monospace;
          font-size: 0.83rem;
          line-height: 1.6;
          color: rgba(240, 236, 228, 0.8);
          background: rgba(17, 17, 17, 0.6);
          border: 1px solid rgba(197, 165, 114, 0.12);
          border-radius: 12px;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
        }

        .transform-notes-textarea:focus {
          border-color: rgba(197, 165, 114, 0.35);
        }

        .transform-notes-textarea::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }

        /* ===== Disclaimer ===== */
        .transform-disclaimer {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.22);
          font-style: italic;
          margin-top: -8px;
          margin-bottom: 12px;
        }

        /* ===== Loading state ===== */
        .transform-loading {
          text-align: center;
          padding: 48px 0;
        }

        .transform-loading-icon {
          margin-bottom: 20px;
        }

        .transform-loading-text {
          font-size: 1.3rem;
          font-style: italic;
          color: var(--ss-gold);
          opacity: 0.8;
          animation: fadeIn 0.5s ease-in;
        }

        /* ===== Error state ===== */
        .transform-error {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px 24px;
          background: rgba(201, 149, 58, 0.08);
          border: 1px solid rgba(201, 149, 58, 0.25);
          border-radius: 12px;
          color: var(--ss-yellow);
          text-align: center;
          font-size: 0.9rem;
        }

        /* ===== Preview section ===== */
        .transform-preview {
          padding: 32px 24px 80px;
          animation: slideUp 0.6s ease-out;
        }

        .transform-preview-header {
          max-width: 820px;
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .transform-back-button {
          background: transparent;
          border: 1px solid rgba(197, 165, 114, 0.25);
          color: var(--ss-gold);
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .transform-back-button:hover {
          background: rgba(197, 165, 114, 0.08);
          border-color: rgba(197, 165, 114, 0.4);
        }

        .transform-preview-badge {
          font-size: 0.8rem;
          color: var(--ss-green-soft);
          letter-spacing: 0.5px;
        }

        /* ===== Animations ===== */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 0.8;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08);
          }
        }
      `}</style>
    </main>
  );
}
