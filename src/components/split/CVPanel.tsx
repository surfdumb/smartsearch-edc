"use client";

import { useState, useCallback, useEffect } from "react";

interface CVPanelProps {
  cvUrl?: string;
  candidateId?: string;
}

const storageKey = (id: string) => `cv_data_${id}`;

export default function CVPanel({ cvUrl, candidateId }: CVPanelProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // On mount (or when candidateId changes): load persisted CV from localStorage
  useEffect(() => {
    if (!candidateId) return;
    setUploadedUrl(null); // reset before loading new candidate's CV
    try {
      const stored = localStorage.getItem(storageKey(candidateId));
      if (stored) setUploadedUrl(stored);
    } catch {
      // localStorage unavailable
    }
  }, [candidateId]);

  const displayUrl = uploadedUrl || cvUrl || null;

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.type.includes("pdf")) {
        alert("Please upload a PDF file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedUrl(dataUrl);
        if (candidateId) {
          try {
            localStorage.setItem(storageKey(candidateId), dataUrl);
          } catch {
            // Storage quota exceeded — still works in-session
          }
        }
      };
      reader.readAsDataURL(file);
    },
    [candidateId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleReplace = useCallback(() => {
    setUploadedUrl(null);
    if (candidateId) {
      try {
        localStorage.removeItem(storageKey(candidateId));
      } catch {
        // ignore
      }
    }
  }, [candidateId]);

  if (displayUrl) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <iframe
          src={displayUrl}
          style={{ width: "100%", flex: 1, border: "none" }}
          title="Candidate CV"
        />
        <div style={{ padding: "8px 16px", textAlign: "center" }}>
          <button
            onClick={handleReplace}
            style={{
              background: "transparent",
              border: "1px solid rgba(197,165,114,0.2)",
              color: "var(--ss-gold)",
              fontSize: "0.75rem",
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Replace CV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFileUpload(file);
        };
        input.click();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        border: "2px dashed rgba(197, 165, 114, 0.2)",
        borderRadius: "16px",
        margin: "24px",
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197, 165, 114, 0.5)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(197, 165, 114, 0.03)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197, 165, 114, 0.2)";
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <span style={{ fontSize: "3rem", opacity: 0.4, marginBottom: "16px" }}>📄</span>
      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", fontWeight: 500 }}>
        Upload CV
      </span>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", marginTop: "8px" }}>
        Click or drag & drop (.pdf only)
      </span>
    </div>
  );
}
