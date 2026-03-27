/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import type { EDCContext } from "@/lib/types";

interface EDCHeaderProps {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;
  initials?: string;
  context?: EDCContext;
}

export default function EDCHeader({
  candidate_name,
  current_title,
  current_company,
  location,
  photo_url,
  initials,
  context = 'standalone',
}: EDCHeaderProps) {
  const [photoErr, setPhotoErr] = useState(false);
  const effectivePhoto = photoErr ? undefined : photo_url;

  // Comparison context: compact — just name + title/company
  if (context === 'comparison') {
    return (
      <header
        className="relative overflow-hidden"
        style={{
          background: "var(--ss-header-bg)",
          borderRadius: "var(--edc-card-radius) var(--edc-card-radius) 0 0",
          padding: "24px 32px 20px",
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-60px", right: "-60px",
            width: "240px", height: "240px",
            background: "radial-gradient(circle, rgba(197, 165, 114, 0.06) 0%, transparent 65%)",
          }}
        />
        <h1
          className="relative font-cormorant"
          style={{
            fontSize: "2rem",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.3px",
            color: "#f5f0ea",
            marginBottom: "6px",
          }}
        >
          {candidate_name}
        </h1>
        <p className="relative" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
          {current_title}
          <span style={{ color: "rgba(197, 165, 114, 0.5)", margin: "0 8px" }}>·</span>
          {current_company}
        </p>
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(197, 165, 114, 0.35), transparent)",
          }}
        />
      </header>
    );
  }

  // Default: single-row header — logo enlarged, no "Executive Decision Card" text, no "Confidential"
  return (
    <header
      className="edc-header relative overflow-hidden"
      style={{
        background: "var(--ss-header-bg)",
        borderRadius: "var(--edc-card-radius) var(--edc-card-radius) 0 0",
        padding: "16px 32px 12px",
        flexShrink: 0,
      }}
    >
      {/* Radial gold glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-80px",
          right: "-80px",
          width: "340px",
          height: "340px",
          background: "radial-gradient(circle, rgba(197, 165, 114, 0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative flex items-center justify-between">
        {/* Left: Photo + Name + Bio */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          {/* Photo circle or initials */}
          <div
            style={{
              width: "66px",
              height: "66px",
              borderRadius: "14px",
              border: "2px solid rgba(197, 165, 114, 0.3)",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: effectivePhoto ? "transparent" : "rgba(197, 165, 114, 0.12)",
            }}
          >
            {effectivePhoto ? (
              <img
                src={effectivePhoto}
                alt={candidate_name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
                onError={() => setPhotoErr(true)}
              />
            ) : (
              <span
                className="font-outfit"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--ss-gold)",
                  letterSpacing: "0.5px",
                }}
              >
                {initials || candidate_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            )}
          </div>

          {/* Name + bio line */}
          <div style={{ minWidth: 0 }}>
            <h1
              className="font-cormorant"
              style={{
                fontSize: "1.6rem",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.3px",
                color: "#faf8f5",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {candidate_name}
            </h1>
            <p
              className="font-outfit"
              style={{
                fontSize: "0.84rem",
                fontWeight: 400,
                color: "rgba(255,255,255,0.65)",
                margin: "2px 0 0",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {current_company}
              <span style={{ color: "rgba(197, 165, 114, 0.4)", margin: "0 8px" }}>·</span>
              {current_title}
              <span style={{ color: "rgba(197, 165, 114, 0.4)", margin: "0 8px" }}>·</span>
              {location}
            </p>
          </div>
        </div>

        {/* Right: SmartSearch logo only */}
        <div style={{ flexShrink: 0, marginLeft: "16px" }}>
          <img
            src="/logos/Logos_SmartSearch_SecondarySymbol_Gold.png"
            alt="SmartSearch"
            style={{ height: "44px", opacity: 0.85 }}
          />
        </div>
      </div>

      {/* Bottom gold accent line */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "1px",
          background: "linear-gradient(90deg, var(--ss-gold) 0%, rgba(197,165,114,0.2) 100%)",
        }}
      />
    </header>
  );
}
