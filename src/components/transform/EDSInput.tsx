"use client";

import { useState, useCallback } from "react";

interface EDSInputProps {
  onTextReady: (text: string) => void;
  disabled?: boolean;
}

export default function EDSInput({ onTextReady, disabled }: EDSInputProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".docx")) {
        alert("Please upload a .docx file");
        return;
      }
      setFileName(file.name);
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setPasteText(result.value);
        onTextReady(result.value);
        setActiveTab("paste"); // Switch to paste tab to show the extracted text
      } catch {
        alert(
          "Unable to read this file. Please paste the text directly instead."
        );
      }
    },
    [onTextReady]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  return (
    <div>
      {/* Tab selector — premium dark styling */}
      <div className="eds-tabs">
        {(["paste", "upload"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={disabled}
            className={`eds-tab ${activeTab === tab ? "eds-tab-active" : ""}`}
          >
            <span className="eds-tab-icon">
              {tab === "paste" ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </span>
            {tab === "paste" ? "Paste Text" : "Upload .docx"}
          </button>
        ))}
      </div>

      {/* Input area */}
      {activeTab === "paste" ? (
        <textarea
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            onTextReady(e.target.value);
          }}
          disabled={disabled}
          placeholder={`Paste your EDS content here...

The system will extract:
  \u2022 Candidate name, title, company, location
  \u2022 Key criteria assessments
  \u2022 Compensation details
  \u2022 Motivation factors
  \u2022 Potential concerns
  \u2022 Our Take / consultant notes`}
          className="eds-textarea"
          style={{ opacity: disabled ? 0.5 : 1 }}
        />
      ) : (
        <div
          className={`eds-upload-zone ${dragOver ? "eds-upload-zone-active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (disabled) return;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".docx";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload(file);
            };
            input.click();
          }}
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <div className="eds-upload-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--ss-gold)", opacity: 0.5 }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <span className="eds-upload-title">
            {fileName || "Upload EDS Document"}
          </span>
          <span className="eds-upload-hint">
            Click or drag & drop (.docx only)
          </span>
          {fileName && (
            <span className="eds-upload-filename">{fileName}</span>
          )}
        </div>
      )}

      <style jsx>{`
        /* ===== Tabs ===== */
        .eds-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 0;
          border-bottom: 1px solid rgba(197, 165, 114, 0.12);
        }

        .eds-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: -1px;
        }

        .eds-tab:hover:not(:disabled) {
          color: rgba(255, 255, 255, 0.55);
        }

        .eds-tab-active {
          color: var(--ss-gold) !important;
          border-bottom-color: var(--ss-gold) !important;
        }

        .eds-tab:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .eds-tab-icon {
          display: flex;
          align-items: center;
          opacity: 0.7;
        }

        /* ===== Textarea ===== */
        .eds-textarea {
          width: 100%;
          min-height: 360px;
          padding: 24px;
          font-family: "SF Mono", "Fira Code", "Consolas", monospace;
          font-size: 0.84rem;
          line-height: 1.65;
          color: rgba(240, 236, 228, 0.8);
          background: transparent;
          border: none;
          border-radius: 0 0 12px 12px;
          resize: none;
          outline: none;
        }

        .eds-textarea::placeholder {
          color: rgba(255, 255, 255, 0.18);
        }

        /* ===== Upload zone ===== */
        .eds-upload-zone {
          min-height: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 2px dashed rgba(197, 165, 114, 0.15);
          border-radius: 0 0 12px 12px;
          margin: 16px;
          transition: all 0.25s ease;
        }

        .eds-upload-zone:hover {
          border-color: rgba(197, 165, 114, 0.35);
          background: rgba(197, 165, 114, 0.02);
        }

        .eds-upload-zone-active {
          border-color: rgba(197, 165, 114, 0.5) !important;
          background: rgba(197, 165, 114, 0.04) !important;
        }

        .eds-upload-icon {
          margin-bottom: 4px;
        }

        .eds-upload-title {
          color: rgba(255, 255, 255, 0.55);
          font-size: 1rem;
          font-weight: 500;
        }

        .eds-upload-hint {
          color: rgba(255, 255, 255, 0.25);
          font-size: 0.83rem;
        }

        .eds-upload-filename {
          margin-top: 8px;
          color: var(--ss-gold);
          font-size: 0.8rem;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 6px;
          background: rgba(197, 165, 114, 0.08);
        }
      `}</style>
    </div>
  );
}
