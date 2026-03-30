/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useRef, useCallback } from "react";
import { useEditorContext } from "@/contexts/EditorContext";
import type { EDCContext } from "@/lib/types";

interface EDCHeaderProps {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;
  initials?: string;
  context?: EDCContext;
  /** Candidate ID — used for blob upload path */
  candidateId?: string;
  /** Search ID — used for blob upload path */
  searchId?: string;
  /** Called with the persisted blob URL after upload completes */
  onPhotoUpload?: (blobUrl: string) => void;
  /** Called when a header text field is edited */
  onFieldUpdate?: (field: 'candidate_name' | 'current_title' | 'current_company' | 'location', value: string) => void;
}

export default function EDCHeader({
  candidate_name,
  current_title,
  current_company,
  location,
  photo_url,
  initials,
  context = 'standalone',
  candidateId,
  searchId,
  onPhotoUpload,
  onFieldUpdate,
}: EDCHeaderProps) {
  const { isEditable } = useEditorContext();
  const [photoErr, setPhotoErr] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectivePhoto = uploadedPhoto || (photoErr ? undefined : photo_url);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    // Show data URL immediately for instant feedback
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhoto(reader.result as string);
      setPhotoErr(false);
    };
    reader.readAsDataURL(file);

    // Upload to Vercel Blob for server-side persistence
    if (candidateId) {
      try {
        const { uploadFile } = await import("@/lib/blob");
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const pathname = `photos/${searchId || "unknown"}/${candidateId}.${ext}`;
        const blob = await uploadFile(pathname, file);
        // Replace data URL with blob URL
        setUploadedPhoto(blob.url);
        // Persist blob URL in localStorage so other views (intro cards) can find it
        localStorage.setItem(`edc_photo_${candidateId}`, blob.url);
        onPhotoUpload?.(blob.url);
      } catch (err) {
        console.warn("[photo] Blob upload failed, keeping local data URL:", err);
        // Still usable via data URL for this session
      }
    }
  }, [candidateId, searchId, onPhotoUpload]);

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
          {/* Photo circle or initials — clickable in edit mode for upload */}
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
              position: "relative",
              cursor: isEditable ? "pointer" : "default",
            }}
            onClick={isEditable ? () => fileInputRef.current?.click() : undefined}
            onMouseEnter={() => isEditable && setAvatarHover(true)}
            onMouseLeave={() => isEditable && setAvatarHover(false)}
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
            {/* Camera overlay in edit mode */}
            {isEditable && avatarHover && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            )}
          </div>
          {/* Hidden file input for photo upload */}
          {isEditable && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          )}

          {/* Name + bio line */}
          <div style={{ minWidth: 0, flex: 1 }}>
            {isEditable ? (
              <h1
                contentEditable
                suppressContentEditableWarning
                className="font-cormorant editable-cell"
                onBlur={(e) => onFieldUpdate?.('candidate_name', e.currentTarget.textContent || '')}
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: "-0.3px",
                  color: "#faf8f5",
                  margin: 0,
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {candidate_name}
              </h1>
            ) : (
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
            )}
            {isEditable ? (
              <div
                className="font-outfit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0",
                  margin: "2px 0 0",
                  fontSize: "0.84rem",
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.3,
                }}
              >
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="editable-cell"
                  onBlur={(e) => onFieldUpdate?.('current_company', e.currentTarget.textContent || '')}
                  style={{ padding: "1px 4px", borderRadius: "3px" }}
                >
                  {current_company}
                </span>
                <span style={{ color: "rgba(197, 165, 114, 0.4)", margin: "0 4px" }}>·</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="editable-cell"
                  onBlur={(e) => onFieldUpdate?.('current_title', e.currentTarget.textContent || '')}
                  style={{ padding: "1px 4px", borderRadius: "3px" }}
                >
                  {current_title}
                </span>
                <span style={{ color: "rgba(197, 165, 114, 0.4)", margin: "0 4px" }}>·</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="editable-cell"
                  onBlur={(e) => onFieldUpdate?.('location', e.currentTarget.textContent || '')}
                  style={{ padding: "1px 4px", borderRadius: "3px" }}
                >
                  {location}
                </span>
              </div>
            ) : (
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
            )}
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
