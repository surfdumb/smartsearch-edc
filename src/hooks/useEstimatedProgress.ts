"use client";

import { useEffect, useState } from "react";

/**
 * Time-based progress estimate for operations that emit no real progress signal
 * (e.g. a single synchronous AI request). While `running`, the returned value
 * eases toward ~90% over `estimatedMs` and never reaches 100 on its own. When
 * `running` flips false after having run, it snaps to 100, then resets to 0.
 *
 * The number is an honest *estimate*, not backend progress — surface it as such.
 * Returns an integer 0–100.
 */
export function useEstimatedProgress(running: boolean, estimatedMs = 12000): number {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!running) {
      // Flash 100% only if we were mid-run; otherwise stay put.
      setPct((prev) => (prev > 0 && prev < 100 ? 100 : prev));
      const reset = setTimeout(() => setPct(0), 400);
      return () => clearTimeout(reset);
    }

    setPct(1);
    const start = Date.now();
    const tau = Math.max(1, estimatedMs) * 0.5; // ~63% by estimatedMs/2, asymptote 90%
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const target = 90 * (1 - Math.exp(-elapsed / tau));
      setPct(Math.min(90, Math.max(1, Math.round(target))));
    }, 80);
    return () => clearInterval(id);
  }, [running, estimatedMs]);

  return pct;
}

export default useEstimatedProgress;
