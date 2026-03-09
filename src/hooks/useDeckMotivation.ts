import { useState, useEffect, useCallback } from "react";

function storageKey(searchId: string) {
  return `deck_motivation_${searchId}`;
}

export function useDeckMotivation(searchId: string) {
  // Default OFF per Change 8 spec
  const [show, setShowState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(searchId));
      if (stored === "true") setShowState(true);
    } catch { /* ignore */ }
  }, [searchId]);

  const setShow = useCallback(
    (next: boolean) => {
      setShowState(next);
      try {
        if (!next) localStorage.removeItem(storageKey(searchId));
        else localStorage.setItem(storageKey(searchId), "true");
      } catch { /* ignore */ }
    },
    [searchId]
  );

  return { showMotivation: show, setShowMotivation: setShow };
}
