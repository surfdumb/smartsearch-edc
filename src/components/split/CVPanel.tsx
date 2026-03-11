"use client";

import { useState, useCallback, useEffect } from "react";
import { fileStoreGet, fileStoreSet, fileStoreRemove } from "@/lib/fileStore";

interface CVPanelProps {
  cvUrl?: string;
  candidateId?: string;
}

const storageKey = (id: string) => `cv_data_${id}`;

export default function CVPanel({ cvUrl, candidateId }: CVPanelProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // On mount (or when candidateId changes): load persisted CV from IndexedDB
  // Also migrate any old localStorage data to IndexedDB
  useEffect(() => {
    if (!candidateId) return;
    setUploadedUrl(null);

    const key = storageKey(candidateId);

    (async () => {
      try {
        // Check IndexedDB first
        const idbStored = await fileStoreGet<string>(key);
        if (idbStored) {
          setUploadedUrl(idbStored);
          return;
        }
        // Migrate from localStorage if present
        const lsStored = localStorage.getItem(key);
        if (lsStored) {
          setUploadedUrl(lsStored);
          // Migrate to IndexedDB and remove from localStorage
          await fileStoreSet(key, lsStored);
          localStorage.removeItem(key);
        }
      } catch {
        // storage unavailable
      }
    })();
  }, [candidateId]);

  const displayUrl = uploadedUrl || cvUrl || null;

  const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
  ];

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.some((t) => file.type === t) && !file.name.match(/\.(pdf|docx?)$/i)) {
        alert("Please upload a PDF or Word document (.pdf, .docx)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedUrl(dataUrl);
        if (candidateId) {
          fileStoreSet(storageKey(candidateId), dataUrl).catch(() => {
            // Storage failed — still works in-session
          });
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
      fileStoreRemove(storageKey(candidateId)).catch(() => {});
    }
  }, [candidateId]);

  // Check if the file is a Word doc (data URL will contain the MIME type)
  const isWordDoc = displayUrl
    ? displayUrl.startsWith("data:application/vnd.openxmlformats") ||
      displayUrl.startsWith("data:application/msword")
    : false;

  if (displayUrl) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {isWordDoc ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              padding: "32px",
            }}
          >
            <span style={{ fontSize: "3rem", opacity: 0.5 }}>📄</span>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", textAlign: "center" }}>
              Word document uploaded
            </p>
            <a
              href={displayUrl}
              download="cv.docx"
              style={{
                background: "linear-gradient(135deg, var(--ss-gold) 0%, var(--ss-gold-deep) 100%)",
                color: "#1a1a1a",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Download to View
            </a>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", fontStyle: "italic" }}>
              Word files cannot be previewed inline — download to open in Word/Pages
            </p>
          </div>
        ) : (
          <iframe
            src={displayUrl}
            style={{ width: "100%", flex: 1, border: "none" }}
            title="Candidate CV"
          />
        )}
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
        input.accept = ".pdf,.doc,.docx";
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
        Click or drag & drop (.pdf, .docx)
      </span>
    </div>
  );
}
