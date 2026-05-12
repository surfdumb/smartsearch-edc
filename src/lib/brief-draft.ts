// Shared helpers for the role-brief localStorage draft model.
//
// Used by JobSummaryBrief (per-field auto-save + recovery dialog) and
// DeckClient (Lock & Share bulk flush). The shape lives here so the two
// callers can't drift.

export type BriefDraftV2 = {
  version: 2;
  created_at: string; // ISO; anchors the start of divergence from server
  edits: Record<string, unknown>;
};

export type BriefDraftV1 = {
  // Legacy shape: localStorage held a flat `{ [field]: value }` object with
  // no envelope. We can't recover the timestamp, so created_at is null and
  // staleness is flagged as "legacy_unknown".
  version: 1;
  created_at: null;
  edits: Record<string, unknown>;
};

export type BriefDraft = BriefDraftV1 | BriefDraftV2;

export type Staleness =
  | "no_draft"
  | "legacy_unknown"
  | "server_ahead"
  | "draft_ahead_or_equal";

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getDraftKey(searchId: string): string {
  return `brief_edit_${searchId}`;
}

export function readDraft(searchId: string): BriefDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftKey(searchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // v2 envelope
    if (
      (parsed as { version?: unknown }).version === 2 &&
      typeof (parsed as { created_at?: unknown }).created_at === "string" &&
      (parsed as { edits?: unknown }).edits &&
      typeof (parsed as { edits?: unknown }).edits === "object"
    ) {
      const edits = (parsed as BriefDraftV2).edits;
      if (Object.keys(edits).length === 0) return null;
      return {
        version: 2,
        created_at: (parsed as BriefDraftV2).created_at,
        edits,
      };
    }

    // v1 legacy: flat edits object, no envelope
    const flat = parsed as Record<string, unknown>;
    if (Object.keys(flat).length === 0) return null;
    return { version: 1, created_at: null, edits: flat };
  } catch {
    return null;
  }
}

export function writeDraftField(
  searchId: string,
  field: string,
  value: unknown,
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readDraft(searchId);
    const created_at =
      existing?.version === 2 ? existing.created_at : new Date().toISOString();
    const draft: BriefDraftV2 = {
      version: 2,
      created_at,
      edits: { ...(existing?.edits ?? {}), [field]: value },
    };
    window.localStorage.setItem(getDraftKey(searchId), JSON.stringify(draft));
  } catch {
    // quota exceeded or storage unavailable
  }
}

export function removeDraftField(searchId: string, field: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readDraft(searchId);
    if (!existing) return;
    const newEdits = { ...existing.edits };
    delete newEdits[field];
    const key = getDraftKey(searchId);
    if (Object.keys(newEdits).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const draft: BriefDraftV2 = {
      version: 2,
      created_at:
        existing.version === 2 ? existing.created_at : new Date().toISOString(),
      edits: newEdits,
    };
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function removeDraft(searchId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getDraftKey(searchId));
  } catch {
    // ignore
  }
}

export function isDraftStaleByAge(
  draft: BriefDraft | null,
  now: number = Date.now(),
): boolean {
  if (!draft || !draft.created_at) return false;
  const created = new Date(draft.created_at).getTime();
  return Number.isFinite(created) && now - created > TWENTY_FOUR_HOURS_MS;
}

export function computeStaleness(
  draft: BriefDraft | null,
  serverUpdatedAt: string | null | undefined,
): Staleness {
  if (!draft) return "no_draft";
  if (draft.version === 1 || !draft.created_at) return "legacy_unknown";
  if (!serverUpdatedAt) return "draft_ahead_or_equal";
  const draftCreated = new Date(draft.created_at).getTime();
  const serverUpdated = new Date(serverUpdatedAt).getTime();
  if (!Number.isFinite(draftCreated) || !Number.isFinite(serverUpdated)) {
    return "draft_ahead_or_equal";
  }
  return serverUpdated > draftCreated ? "server_ahead" : "draft_ahead_or_equal";
}

export function relativeTime(
  when: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!when) return "";
  const ts = new Date(when).getTime();
  if (!Number.isFinite(ts)) return "";
  const delta = now - ts;
  if (delta < 0) return "just now";
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const date = new Date(ts);
  return `on ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}
