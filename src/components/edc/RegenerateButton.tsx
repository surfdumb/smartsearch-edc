"use client";

import { useState, useCallback } from "react";

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
      <style>{`@keyframes regenerateSpin { to { transform: rotate(360deg); } }`}</style>
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      title={isRunning ? 'Regenerating…' : 'Regenerate this candidate'}
      aria-label="Regenerate this candidate"
      style={{
        fontSize: fluid ? '1rem' : '1.1rem',
        color: isRunning ? 'var(--ss-gray-light)' : '#b0a080',
        background: 'rgba(250,248,245,0.97)',
        border: '1.5px solid rgba(197,165,114,0.4)',
        borderRadius: '22px',
        padding: fluid ? '6px 10px' : '8px 12px',
        height: fluid ? '32px' : '38px',
        cursor: isRunning ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
        lineHeight: 1,
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
      <span
        style={isRunning ? { animation: 'regenerateSpin 1s linear infinite', display: 'inline-block' } : { display: 'inline-block' }}
      >
        ↻
      </span>
    </button>
    </>
  );
}
