"use client";

import { useState, useCallback } from "react";
import SparkleIcon from "@/components/ui/SparkleIcon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useEstimatedProgress } from "@/hooks/useEstimatedProgress";

interface RegenerateButtonProps {
  searchId: string;
  candidateSlug: string;
  candidateName: string;
  fluid?: boolean;
  /** Called when regenerate succeeds with no conflicts. */
  onSuccess?: (result: RegenerateApiSuccess) => void;
  /** Called when regenerate succeeds but there are conflicting consultant edits.
   *  Parent should open the Review Changes modal. */
  onConflict?: (result: RegenerateApiSuccess) => void;
  /** Called on failure (422 = no notes, 500 = server/AI error). */
  onError?: (status: number, message: string) => void;
}

export interface RegenerateApiSuccess {
  success: true;
  candidate_id: string;
  candidate_slug: string;
  candidate_name: string;
  generation_version: number;
  ai_generated_edc: Record<string, unknown>;
  merged_edc_data: Record<string, unknown>;
  conflicts: {
    field: string;
    field_label: string;
    consultant_value: unknown;
    ai_value: unknown;
  }[];
}

export default function RegenerateButton({
  searchId,
  candidateSlug,
  candidateName,
  fluid = false,
  onSuccess,
  onConflict,
  onError,
}: RegenerateButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pct = useEstimatedProgress(isRunning, 12000);

  const handleClick = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      const res = await fetch(`/api/deck/${searchId}/candidates/${candidateSlug}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errorMsg = errBody.error;
        } catch {
          /* response wasn't JSON */
        }
        onError?.(res.status, errorMsg);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('regenerate-toast', {
              detail: { kind: 'error', candidateName, message: errorMsg },
            }),
          );
        }
        return;
      }

      const result = (await res.json()) as RegenerateApiSuccess;

      if (result.conflicts && result.conflicts.length > 0) {
        onConflict?.(result);
      } else {
        onSuccess?.(result);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('regenerate-toast', {
              detail: { kind: 'success', candidateName, message: 'Regenerated' },
            }),
          );
          window.dispatchEvent(
            new CustomEvent('candidate-regenerate-complete', {
              detail: { candidateSlug, generationVersion: result.generation_version },
            }),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(0, msg);
      console.error('[RegenerateButton] fetch failed:', msg);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, searchId, candidateSlug, candidateName, onSuccess, onConflict, onError]);

  return (
    <>
    <button
      type="button"
      onClick={() => { if (!isRunning) setConfirmOpen(true); }}
      disabled={isRunning}
      title={isRunning ? 'Regenerating…' : 'Regenerate this candidate'}
      aria-label="Regenerate this candidate"
      style={{
        position: 'relative',
        overflow: 'hidden',
        fontSize: fluid ? '0.78rem' : '0.86rem',
        fontWeight: 500,
        color: isRunning ? 'var(--ss-gold)' : '#b0a080',
        background: 'rgba(250,248,245,0.97)',
        border: '1.5px solid rgba(197,165,114,0.4)',
        borderRadius: '22px',
        padding: fluid ? '6px 12px' : '8px 16px',
        height: fluid ? '32px' : '38px',
        cursor: isRunning ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        lineHeight: 1,
        fontFamily: 'var(--font-outfit), Inter, sans-serif',
      }}
      onMouseOver={(e) => {
        if (isRunning) return;
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = 'rgba(197,165,114,0.14)';
        btn.style.borderColor = 'rgba(197,165,114,0.6)';
        btn.style.color = 'var(--ss-gold)';
      }}
      onMouseOut={(e) => {
        if (isRunning) return;
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = 'rgba(250,248,245,0.97)';
        btn.style.borderColor = 'rgba(197,165,114,0.4)';
        btn.style.color = '#b0a080';
      }}
    >
      {isRunning && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: 'rgba(197,165,114,0.18)',
            transition: 'width 0.1s linear',
            pointerEvents: 'none',
          }}
        />
      )}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <SparkleIcon size={fluid ? 13 : 14} pulse={isRunning} />
        {isRunning ? `Regenerating ${pct}%` : 'Regenerate'}
      </span>
    </button>
    <ConfirmDialog
      open={confirmOpen}
      title="Regenerate this candidate?"
      body="Re-runs the AI from the raw notes. Your manual edits are preserved — any differences are surfaced for you to review."
      confirmLabel="Regenerate"
      tone="gold"
      onConfirm={() => { setConfirmOpen(false); handleClick(); }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
