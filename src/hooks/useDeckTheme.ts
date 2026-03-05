import { useState, useEffect, useCallback } from "react";

type DeckTheme = "dark" | "light";

function storageKey(searchId: string) {
  return `deck_theme_${searchId}`;
}

export function useDeckTheme(searchId: string) {
  const [theme, setThemeState] = useState<DeckTheme>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(searchId));
      if (stored === "light") setThemeState("light");
    } catch { /* ignore */ }
  }, [searchId]);

  const setTheme = useCallback(
    (next: DeckTheme) => {
      setThemeState(next);
      try {
        if (next === "dark") localStorage.removeItem(storageKey(searchId));
        else localStorage.setItem(storageKey(searchId), next);
      } catch { /* ignore */ }
    },
    [searchId]
  );

  return { theme, setTheme };
}
