import { useState, useEffect, useCallback } from "react";

type DeckTheme = "dark" | "hybrid" | "light";

function storageKey(searchId: string) {
  return `deck_theme_${searchId}`;
}

function readStoredTheme(searchId: string): DeckTheme {
  if (typeof window === "undefined") return "hybrid";
  try {
    const stored = localStorage.getItem(storageKey(searchId));
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* ignore */ }
  return "hybrid";
}

export function useDeckTheme(searchId: string) {
  const [theme, setThemeState] = useState<DeckTheme>(() => readStoredTheme(searchId));

  // Re-sync from localStorage when the page becomes visible again
  // (handles bfcache restoration + Next.js router cache scenarios)
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible") {
        setThemeState(readStoredTheme(searchId));
      }
    };
    document.addEventListener("visibilitychange", sync);
    // Also re-read on pageshow (bfcache)
    window.addEventListener("pageshow", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [searchId]);

  const setTheme = useCallback(
    (next: DeckTheme) => {
      setThemeState(next);
      try {
        if (next === "hybrid") localStorage.removeItem(storageKey(searchId));
        else localStorage.setItem(storageKey(searchId), next);
      } catch { /* ignore */ }
    },
    [searchId]
  );

  return { theme, setTheme };
}
