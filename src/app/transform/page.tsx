/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import EDSInput from "@/components/transform/EDSInput";
import TransformButton from "@/components/transform/TransformButton";
import EDCHeader from "@/components/edc/EDCHeader";
import ScopeMatch from "@/components/edc/ScopeMatch";
import KeyCriteria from "@/components/edc/KeyCriteria";
import Compensation from "@/components/edc/Compensation";
import Motivation from "@/components/edc/Motivation";
import Concerns from "@/components/edc/Concerns";
import OurTake from "@/components/edc/OurTake";
import EDCFooter from "@/components/edc/EDCFooter";
import { type EDCData, buildCandidateContext } from "@/lib/types";

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
        message: "This doesn't look like a complete EDS. Please paste the full document content.",
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
      const message = error instanceof Error ? error.message : "Transformation failed — please try again";
      setState({ status: "error", message });
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--ss-obsidian)",
        color: "white",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(197, 165, 114, 0.1)",
        }}
      >
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          style={{ height: "24px", opacity: 0.6 }}
        />
        <span
          className="font-sorts-mill"
          style={{
            fontSize: "1.1rem",
            fontWeight: 400,
            color: "var(--ss-gold)",
          }}
        >
          EDS &rarr; EDC
        </span>
      </div>

      {/* Input section */}
      {state.status !== "success" && (
        <div style={{ padding: "40px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              className="font-cormorant"
              style={{
                fontSize: "2.2rem",
                fontWeight: 500,
                color: "rgba(245, 240, 234, 0.9)",
                marginBottom: "8px",
              }}
            >
              Transform an EDS into an Executive Decision Card
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
              Paste the raw EDS text or upload a .docx file
            </p>
          </div>

          <EDSInput
            onTextReady={setRawText}
            disabled={state.status === "loading"}
          />

          {/* Manual Notes Section */}
          <div style={{ maxWidth: "800px", margin: "24px auto 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "var(--ss-gold)",
                }}
              >
                Consultant Manual Notes
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.3)",
                  fontStyle: "italic",
                }}
              >
                (optional &mdash; used to generate &ldquo;Our Take&rdquo;)
              </span>
            </div>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              disabled={state.status === "loading"}
              placeholder={`Write your raw, uninhibited notes here...\n\nExamples:\n\u2022 "He's a builder, not a polished corporate type \u2014 real operator energy"\n\u2022 "Concerned about his English \u2014 B2 level might be a problem in board settings"\n\u2022 "Surprisingly strong on data for someone from that background"\n\u2022 "Worth advancing but client needs to decide on the board experience gap"\n\nThese notes are NEVER shown to clients. They're used to generate the professional "Our Take" section.`}
              style={{
                width: "100%",
                minHeight: "180px",
                padding: "20px",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: "0.83rem",
                lineHeight: 1.6,
                color: "rgba(240, 236, 228, 0.8)",
                background: "var(--ss-obsidian-card)",
                border: "1px solid rgba(197, 165, 114, 0.15)",
                borderRadius: "12px",
                resize: "vertical",
                outline: "none",
                opacity: state.status === "loading" ? 0.5 : 1,
              }}
            />
          </div>

          <TransformButton
            onClick={handleTransform}
            loading={state.status === "loading"}
            disabled={!rawText || rawText.length < 100}
          />

          {/* Loading state */}
          {state.status === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p
                className="font-cormorant"
                style={{
                  fontSize: "1.3rem",
                  fontStyle: "italic",
                  color: "var(--ss-gold)",
                  opacity: 0.8,
                  animation: "fadeIn 0.5s ease-in",
                }}
              >
                Building your Executive Decision Card...
              </p>
              <style jsx>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 0.8; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}

          {/* Error state */}
          {state.status === "error" && (
            <div
              style={{
                maxWidth: "600px",
                margin: "0 auto",
                padding: "16px 24px",
                background: "rgba(201, 149, 58, 0.1)",
                border: "1px solid rgba(201, 149, 58, 0.3)",
                borderRadius: "12px",
                color: "var(--ss-yellow)",
                textAlign: "center",
                fontSize: "0.9rem",
              }}
            >
              {state.message}
            </div>
          )}
        </div>
      )}

      {/* EDC Preview */}
      {state.status === "success" && (
        <div
          style={{
            padding: "40px 24px 80px",
            animation: "slideUp 0.6s ease-out",
          }}
        >
          {/* Back / New Transform button */}
          <div style={{ maxWidth: "820px", margin: "0 auto 24px", textAlign: "left" }}>
            <button
              onClick={() => setState({ status: "idle" })}
              style={{
                background: "transparent",
                border: "1px solid rgba(197, 165, 114, 0.3)",
                color: "var(--ss-gold)",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              &larr; New Transform
            </button>
          </div>

          {/* The EDC Card */}
          <div
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow:
                "0 0 0 1px rgba(197,165,114,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 30px 100px rgba(0,0,0,0.4), 0 0 120px rgba(197,165,114,0.04)",
            }}
          >
            <EDCHeader
              candidate_name={state.data.candidate_name}
              current_title={state.data.current_title}
              current_company={state.data.current_company}
              location={state.data.location}
              role_title={state.data.role_title}
              consultant_name={state.data.consultant_name}
              generated_date={state.data.generated_date}
            />
            <div className="bg-white">
              <ScopeMatch
                scope_match={state.data.scope_match}
                scope_seasoning={state.data.scope_seasoning}
              />
              <KeyCriteria key_criteria={state.data.key_criteria} />
              <Compensation
                compensation={state.data.compensation}
                notice_period={state.data.notice_period}
                earliest_start_date={state.data.earliest_start_date}
              />
              <Motivation why_interested={state.data.why_interested} />
              <Concerns potential_concerns={state.data.potential_concerns} />
              <div
                style={{
                  height: "4px",
                  background:
                    "linear-gradient(90deg, transparent 0%, var(--ss-gold-pale) 15%, var(--ss-gold) 50%, var(--ss-gold-pale) 85%, transparent 100%)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "white",
                    color: "var(--ss-gold)",
                    fontSize: "1rem",
                    padding: "0 16px",
                    zIndex: 1,
                  }}
                >
                  &#10022;
                </span>
              </div>
              <OurTake
                text={state.data.our_take.text}
                consultant_name={state.data.consultant_name}
                recommendation={state.data.our_take.recommendation}
                discussion_points={state.data.our_take.discussion_points}
                original_note={state.data.our_take.original_note}
                ai_rationale={state.data.our_take.ai_rationale}
                isConsultantView={true}
                candidateContext={buildCandidateContext(state.data)}
                onOurTakeGenerated={(result) => {
                  setState({
                    status: "success",
                    data: {
                      ...state.data,
                      our_take: {
                        text: result.text,
                        recommendation: result.recommendation,
                        discussion_points: result.discussion_points,
                        original_note: result.original_note,
                        ai_rationale: result.ai_rationale,
                      },
                    },
                  });
                }}
              />
            </div>
            <EDCFooter
              search_name={state.data.search_name}
              generated_date={state.data.generated_date}
            />
          </div>

          <style jsx>{`
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
          `}</style>
        </div>
      )}
    </main>
  );
}
