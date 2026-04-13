/**
 * Lightweight content fingerprint for detecting stale localStorage edits.
 * Uses a sibling key pattern: for edit key "edc_edit_foo_scope", the hash
 * lives at "edc_edit_foo_scope__hash". This avoids changing the edit value
 * shape, so useAutoSave and lock handlers work unchanged.
 */

/** DJB2 hash of JSON-serialised data, returned as base-36 string. */
export function hashData(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

/**
 * Check if a localStorage edit is fresh relative to the current prop data.
 *
 * Returns `true` if edits exist AND are not stale (hash matches, or legacy
 * entry without a hash key — accepted on first deploy).
 * Returns `false` if no edits exist, or edits are stale (auto-clears them).
 */
export function isEditFresh(storageKey: string, currentPropData: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;

    const hashKey = `${storageKey}__hash`;
    const storedHash = localStorage.getItem(hashKey);

    if (!storedHash) {
      // Legacy entry without hash — accept it; next write will add hash.
      return true;
    }

    const currentHash = hashData(currentPropData);
    if (storedHash === currentHash) return true;

    // Stale — clear both keys
    localStorage.removeItem(storageKey);
    localStorage.removeItem(hashKey);
    return false;
  } catch {
    return false;
  }
}

/** Write the base-data hash alongside a localStorage edit. */
export function writeBaseHash(storageKey: string, propData: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${storageKey}__hash`, hashData(propData));
  } catch {
    /* quota exceeded — ignore */
  }
}

/** Remove both the edit key and its sibling hash key. */
export function clearEditWithHash(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}__hash`);
  } catch {
    /* ignore */
  }
}
