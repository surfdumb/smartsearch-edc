"use client";

import { useState, useCallback, useEffect } from "react";
import { uploadFile, listBlobs, deleteBlob } from "@/lib/blob";
import { fileStoreGet, fileStoreRemove } from "@/lib/fileStore";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

interface CVPanelProps {
  cvUrl?: string;
  candidateId?: string;
  searchId?: string;
}

export default function CVPanel({ cvUrl, candidateId, searchId }: CVPanelProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // On mount: load CV from Vercel Blob, with IndexedDB migration fallback
  useEffect(() => {
    if (!candidateId) return;
    setBlobUrl(null);

    (async () => {
      try {
        // Check Vercel Blob first
        if (searchId) {
          const blobs = await listBlobs(`cv/${searchId}/${candidateId}/`);
          if (blobs.length > 0) {
            setBlobUrl(blobs[blobs.length - 1].url);
            return;
          }
        }

        // Migration: check IndexedDB for old data and upload to Vercel Blob
        const idbKey = `cv_data_${candidateId}`;
        const idbStored = await fileStoreGet<string>(idbKey);
        if (idbStored && searchId) {
          const response = await fetch(idbStored);
          const blob = await response.blob();
          const file = new File([blob], `${candidateId}_cv.pdf`, { type: blob.type || "application/pdf" });
          const result = await uploadFile(`cv/${searchId}/${candidateId}/${candidateId}_cv.pdf`, file);
          setBlobUrl(result.url);
          await fileStoreRemove(idbKey);
          return;
        }
        // If IndexedDB had data but no searchId, use it directly as fallback
        if (idbStored) {
          setBlobUrl(idbStored);
        }
      } catch {
        // storage/blob unavailable
      }
    })();
  }, [candidateId, searchId]);

  const displayUrl = blobUrl || cvUrl || null;

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.some((t) => file.type === t) && !file.name.match(/\.(pdf|docx?)$/i)) {
        alert("Please upload a PDF or Word document (.pdf, .docx)");
        return;
      }
      if (!candidateId || !searchId) return;

      setUploading(true);
      try {
        const result = await uploadFile(`cv/${searchId}/${candidateId}/${file.name}`, file);
        setBlobUrl(result.url);
      } catch (err) {
        console.error("CV upload failed:", err);
        alert("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [candidateId, searchId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleReplace = useCallback(async () => {
    if (blobUrl && blobUrl.includes(".blob.vercel-storage.com/")) {
      try {
        await deleteBlob(blobUrl);
      } catch { /* ignore deletion errors */ }
    }
    setBlobUrl(null);
  }, [blobUrl]);

  // Check if the file is a Word doc
  const isWordDoc = displayUrl
    ? displayUrl.match(/\.docx?(\?|$)/i) !== null ||
      displayUrl.startsWith("data:application/vnd.openxmlformats") ||
      displayUrl.startsWith("data:application/msword")
    : false;

  if (displayUrl) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.5)",
              zIndex: 10,
            }}
          >
            <div style={{ color: "var(--ss-gold)", fontSize: "0.85rem", fontWeight: 600 }}>
              Uploading CV...
            </div>
          </div>
        )}
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
        position: "relative",
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
      {uploading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
            zIndex: 10,
            borderRadius: "16px",
          }}
        >
          <div style={{ color: "var(--ss-gold)", fontSize: "0.85rem", fontWeight: 600 }}>
            Uploading...
          </div>
        </div>
      )}
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
