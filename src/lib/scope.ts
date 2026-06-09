/**
 * Scope Match helpers shared by the renderer (ScopeMatch.tsx) and the candidate
 * regen server logic (regenerate-candidate.ts).
 */

/**
 * Normalised key for matching a candidate's snapshot scope dimension to a
 * canonical search dimension name. Strips everything from the first em/en-dash
 * or colon — this absorbs the "Related Experience — Demonstrated ability…"
 * pollution where the role requirement was glued onto the name — then lowercases
 * and drops non-alphanumerics so spacing/punctuation differences don't matter.
 */
export const canonScopeKey = (s: string): string =>
  (s || "").split(/[—–:]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
