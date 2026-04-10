"use client";

import { useState, useEffect } from "react";

export type EDCState = "draft" | "locked";

function stateKey(candidateId: string) {
  return `edc_state_${candidateId}`;
}

export function useEDCState(candidateId: string) {
  const [state, setState] = useState<EDCState>("draft");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(stateKey(candidateId));
      if (stored === "locked" || stored === "draft") {
        setState(stored as EDCState);
      } else {
        setState("draft");
      }
    } catch { /* ignore */ }
  }, [candidateId]);

  const lock = () => {
    setState("locked");
    try { localStorage.setItem(stateKey(candidateId), "locked"); } catch { /* ignore */ }
  };

  const unlock = () => {
    setState("draft");
    try { localStorage.setItem(stateKey(candidateId), "draft"); } catch { /* ignore */ }
  };

  return { state, lock, unlock };
}
