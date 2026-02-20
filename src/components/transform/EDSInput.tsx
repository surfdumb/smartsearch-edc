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
      } catch {
        alert("Unable to read this file. Please paste the text directly instead.");
      }
    },
    [onTextReady]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Tab selector */}
      <div className="flex gap-0 mb-4">
        {(["paste", "upload"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            disabled={disabled}
            style={{
              padding: "10px 28px",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: activeTab === tab ? "var(--ss-gold)" : "rgba(255,255,255,0.4)",
              borderBottom: activeTab === tab ? "2px solid var(--ss-gold)" : "2px solid transparent",
              background: "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab}
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
          placeholder={`Paste your EDS content here...\n\nThe system will extract:\n• Candidate name, title, company, location\n• Key criteria assessments\n• Compensation details\n• Motivation factors\n• Potential concerns\n• Our Take / consultant notes`}
          style={{
            width: "100%",
            minHeight: "400px",
            padding: "24px",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            color: "rgba(240, 236, 228, 0.8)",
            background: "var(--ss-obsidian-card)",
            border: "1px solid rgba(197, 165, 114, 0.1)",
            borderRadius: "12px",
            resize: "none",
            outline: "none",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
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
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            border: "2px dashed rgba(197, 165, 114, 0.2)",
            borderRadius: "16px",
            background: "var(--ss-obsidian-card)",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "border-color 0.2s, background 0.2s",
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseOver={(e) => {
            if (!disabled) {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197, 165, 114, 0.5)";
              (e.currentTarget as HTMLDivElement).style.background = "rgba(197, 165, 114, 0.03)";
            }
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(197, 165, 114, 0.2)";
            (e.currentTarget as HTMLDivElement).style.background = "var(--ss-obsidian-card)";
          }}
        >
          <span style={{ fontSize: "3rem", opacity: 0.4 }}>📄</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", fontWeight: 500 }}>
            {fileName || "Upload CV"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
            Click or drag & drop (.docx only)
          </span>
        </div>
      )}
    </div>
  );
}
