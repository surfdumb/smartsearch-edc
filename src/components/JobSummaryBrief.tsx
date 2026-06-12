"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchContext } from "@/lib/types";
import { EditorContext } from "@/contexts/EditorContext";
import EditableField from "@/components/edc/EditableField";
import ReviewChangesModal, { type Conflict } from "@/components/edc/ReviewChangesModal";
import SparkleIcon from "@/components/ui/SparkleIcon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useEstimatedProgress } from "@/hooks/useEstimatedProgress";
import {
  readDraft,
  writeDraftField,
  removeDraftField,
  removeDraft,
  computeStaleness,
  isDraftStaleByAge,
  relativeTime,
  type Staleness,
} from "@/lib/brief-draft";
import { newDimensionId } from "@/lib/scope-dimension-id";
import "@/styles/job-summary-print.css";

interface BulkConflictEntry {
  candidateSlug: string;
  candidateName: string;
  conflicts: Conflict[];
}

interface JobSummaryBriefProps {
  data: SearchContext;
  isEditMode: boolean;
  searchId: string;
  isFullPage?: boolean;
}

type Criterion = { name: string; detail?: string; priority?: string };

type ScopeDim = { id?: string; name: string; role_requirement: string };

// Legacy decks (don-*) store dims under `scope` instead of `name`, and very old
// rows can be a plain string. Normalize on load; the first save repairs them to
// the `name` key ScopeMatch requires (it discards dims with no usable name).
// Carry the stable `id` through verbatim — losing it here would let a rename
// orphan candidate rows again (the whole point of the id).
function normalizeScopeDims(raw: unknown): ScopeDim[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((d) => ({
    ...(typeof d?.id === "string" && d.id ? { id: d.id } : {}),
    name: String(d?.name ?? d?.scope ?? ""),
    role_requirement: String(d?.role_requirement ?? ""),
  }));
}

// Normalised key matching ScopeMatch's canonKey — used only as a fallback when
// a dimension has no id yet (pre-backfill), to detect whether any candidate has
// content under it before a delete.
const dimCanonKey = (s: string) =>
  (s || "").split(/[—–:]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");

// Human-readable labels for the API field names that can appear in a draft.
// Keep aligned with ALLOWED_FIELDS in src/app/api/deck/[searchId]/brief/route.ts.
const BRIEF_FIELD_LABELS: Record<string, string> = {
  position: "Role title",
  location: "Location",
  client_display_name: "Client",
  remit: "Remit",
  core_mission: "Core mission",
  why_open: "Why open",
  key_responsibilities: "Key responsibilities",
  key_criteria: "Key criteria",
  budget_base: "Base budget",
  budget_bonus: "Bonus budget",
  budget_lti: "LTI budget",
  budget_di: "Direct incentive budget",
  red_flag_title: "Red flag — title",
  red_flag_detail: "Red flag — detail",
  predecessor_context: "Predecessor context",
  candidate_messaging: "Candidate messaging",
  additional_internal_notes: "Internal notes",
  confidentiality: "Confidentiality",
  revenue: "Revenue",
  team_size: "Team size",
  line_manager: "Line manager",
  kam: "Search lead",
  js_source_url: "JS source URL",
  scope_match_dimensions: "Scope dimensions",
};

function fieldLabel(field: string): string {
  return BRIEF_FIELD_LABELS[field] ?? field;
}

// Read the current server-side value for a brief field from the SearchContext
// payload. Used by the Compare panel in the recovery dialog so users can see
// "server says X, my draft says Y" before deciding.
function getServerValueForBriefField(
  data: SearchContext,
  field: string,
): unknown {
  const js = data.job_summary_data;
  switch (field) {
    case "location":
      return data.client_location;
    case "client_display_name":
      return data.client_display_name ?? data.client_company;
    case "kam":
      return data.search_lead;
    case "js_source_url":
      return data.js_source_url;
    case "scope_match_dimensions":
      return data.scope_match_dimensions;
    case "key_criteria":
      return js?.key_criteria_detailed;
    default:
      // Most allowed fields live on job_summary_data with the same key name.
      return js ? (js as unknown as Record<string, unknown>)[field] : undefined;
  }
}

function compactValuePreview(v: unknown, max = 80): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "object") return "(structured)";
  const s = String(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ─── Section divider ────────────────────────────────────────────────────────

function GoldRule() {
  return (
    <div
      className="js-brief-gold-rule"
      style={{
        height: "1px",
        background: "var(--ss-gold, #c5a572)",
        opacity: 0.35,
        margin: "22px 0",
      }}
    />
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="js-brief-section" style={{ marginBottom: "4px" }}>
      <h3
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          color: "var(--ss-gold, #c5a572)",
          marginBottom: "10px",
        }}
      >
        {label}
      </h3>
      {children}
    </div>
  );
}

// ─── Editable text field (inline, no label) ─────────────────────────────────

function BriefField({
  value,
  field,
  onSave,
  isEdit,
  style,
  className,
  as = "p",
}: {
  value: string;
  field: string;
  onSave: (field: string, value: string) => void;
  isEdit: boolean;
  style?: React.CSSProperties;
  className?: string;
  as?: "p" | "div" | "span" | "h1";
}) {
  if (!value && !isEdit) return null;
  if (isEdit) {
    return (
      <EditableField
        value={value || ""}
        as={as === "h1" ? "h1" : as}
        html={false}
        style={style}
        className={className}
        onUpdate={(v) => onSave(field, v)}
      />
    );
  }
  const Tag = as;
  return <Tag style={style} className={className}>{value}</Tag>;
}

// ─── Role Profile row (editable) ────────────────────────────────────────────

function ProfileRow({
  label,
  value,
  field,
  onSave,
  isEdit,
}: {
  label: string;
  value?: string;
  field?: string;
  onSave?: (field: string, value: string) => void;
  isEdit?: boolean;
}) {
  if (!value && !isEdit) return null;
  return (
    <div
      style={{
        display: "flex",
        padding: "8px 0",
        borderBottom: "1px solid rgba(197,165,114,0.08)",
      }}
    >
      <span
        style={{
          width: "140px",
          flexShrink: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#1a1a1a",
        }}
      >
        {label}
      </span>
      {isEdit && field && onSave ? (
        <EditableField
          value={value || ""}
          as="span"
          html={false}
          style={{ fontSize: "0.82rem", color: "#3a3a3a", lineHeight: 1.5, flex: 1 }}
          onUpdate={(v) => onSave(field, v)}
        />
      ) : (
        <span style={{ fontSize: "0.82rem", color: "#3a3a3a", lineHeight: 1.5 }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Compensation row (editable) ────────────────────────────────────────────

function CompRow({
  label,
  value,
  field,
  onSave,
  isEdit,
}: {
  label: string;
  value?: string;
  field?: string;
  onSave?: (field: string, value: string) => void;
  isEdit?: boolean;
}) {
  if (!value && !isEdit) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(197,165,114,0.08)",
      }}
    >
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a" }}>
        {label}
      </span>
      {isEdit && field && onSave ? (
        <EditableField
          value={value || ""}
          as="span"
          html={false}
          style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1a1a1a", textAlign: "right" as const }}
          onUpdate={(v) => onSave(field, v)}
          placeholder="Click to add"
        />
      ) : (
        <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1a1a1a", textAlign: "right" as const }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Internal panel field (editable, dark theme) ────────────────────────────

function IntelField({
  label,
  value,
  field,
  onSave,
}: {
  label: string;
  value?: string;
  field: string;
  onSave: (field: string, value: string) => void;
}) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "14px" }}>
      <p
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "rgba(201,149,58,0.8)",
          marginBottom: "4px",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
      <EditableField
        value={value}
        as="p"
        html={false}
        style={{
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap" as const,
        }}
        onUpdate={(v) => onSave(field, v)}
      />
    </div>
  );
}

// ─── Key Responsibilities bullet formatter ─────────────────────────────────

function splitResponsibilities(text: string): string[] {
  const raw = text.split(/\.\s+/);
  const result: string[] = [];
  let buffer = "";
  for (const segment of raw) {
    if (buffer) buffer += ". ";
    buffer += segment;
    if (buffer.length >= 20) {
      result.push(buffer.endsWith(".") ? buffer : buffer);
      buffer = "";
    }
  }
  if (buffer) {
    if (result.length > 0) {
      result[result.length - 1] += ". " + buffer;
    } else {
      result.push(buffer);
    }
  }
  return result;
}

function ResponsibilitiesList({ text }: { text: string }) {
  const sentences = splitResponsibilities(text);
  if (sentences.length <= 1) {
    return (
      <p style={{ fontSize: "0.85rem", color: "#3a3a3a", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {text}
      </p>
    );
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {sentences.map((s, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "5px",
            lineHeight: 1.5,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              color: "var(--ss-gold, #c5a572)",
              fontSize: "0.55rem",
              marginTop: "5px",
              flexShrink: 0,
            }}
          >
            ●
          </span>
          <span style={{ fontSize: "0.85rem", color: "#3a3a3a" }}>{s}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function JobSummaryBrief({
  data,
  isEditMode,
  searchId,
  isFullPage = false,
}: JobSummaryBriefProps) {
  const js = data.job_summary_data;
  const [showIntel, setShowIntel] = useState(false);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [intelSaving, setIntelSaving] = useState(false);
  const [intelSaved, setIntelSaved] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  useEffect(() => { setPdfReady(true); }, []);

  // ── Bulk regenerate state ────────────────────────────────────────────────
  // Drives the "Regenerate all" button: idle → running → reveal conflicts
  // sequentially via the ReviewChangesModal queue.
  const [bulkRegenRunning, setBulkRegenRunning] = useState(false);
  const [bulkConflictQueue, setBulkConflictQueue] = useState<BulkConflictEntry[]>([]);
  const [bulkSummary, setBulkSummary] = useState<{ processed: number; conflicts: number; failed: number } | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  // regenerate-all runs candidates sequentially server-side (~10s each), so the
  // estimated progress bar is sized to the candidate count.
  const bulkCandidateCount = data.candidates?.length ?? 0;
  const bulkPct = useEstimatedProgress(bulkRegenRunning, Math.max(12000, bulkCandidateCount * 10000));

  const handleRegenerateAll = useCallback(async () => {
    const candidateCount = data.candidates?.length ?? 0;
    if (candidateCount === 0) return;
    if (bulkRegenRunning) return;

    setBulkRegenRunning(true);
    setBulkSummary(null);

    try {
      const res = await fetch(`/api/deck/${searchId}/regenerate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error || `HTTP ${res.status}`;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('regenerate-toast', {
            detail: { kind: 'error', message: `Bulk regenerate failed: ${msg}` },
          }));
        }
        return;
      }

      const body = await res.json() as {
        candidates_processed: number;
        candidates_with_conflicts: number;
        results: {
          candidate_slug: string;
          candidate_name?: string;
          conflicts?: { field: string; field_label: string; consultant_value: unknown; ai_value: unknown }[];
        }[];
        failed: { candidate_slug: string; error: string }[];
      };

      const queue: BulkConflictEntry[] = [];
      for (const r of body.results) {
        if (r.conflicts && r.conflicts.length > 0) {
          queue.push({
            candidateSlug: r.candidate_slug,
            candidateName: r.candidate_name || r.candidate_slug,
            conflicts: r.conflicts as Conflict[],
          });
        }
      }

      setBulkConflictQueue(queue);
      setBulkSummary({
        processed: body.candidates_processed,
        conflicts: body.candidates_with_conflicts,
        failed: body.failed?.length ?? 0,
      });

      if (typeof window !== 'undefined') {
        const failedCount = body.failed?.length ?? 0;
        const msg = failedCount > 0
          ? `Regenerated ${body.candidates_processed} · ${failedCount} failed · ${body.candidates_with_conflicts} with conflicts`
          : `Regenerated ${body.candidates_processed} candidate${body.candidates_processed === 1 ? '' : 's'}${body.candidates_with_conflicts > 0 ? ` · ${body.candidates_with_conflicts} with conflicts` : ''}`;
        window.dispatchEvent(new CustomEvent('regenerate-toast', {
          detail: { kind: failedCount > 0 ? 'warning' : 'success', message: msg },
        }));
        window.dispatchEvent(new CustomEvent('deck-regenerate-complete', {
          detail: { results: body.results, failed: body.failed },
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[regenerate-all] failed:', msg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('regenerate-toast', {
          detail: { kind: 'error', message: `Bulk regenerate failed: ${msg}` },
        }));
      }
    } finally {
      setBulkRegenRunning(false);
    }
  }, [bulkRegenRunning, data.candidates, searchId]);

  const dismissCurrentConflict = useCallback(() => {
    setBulkConflictQueue((prev) => prev.slice(1));
  }, []);

  // ── localStorage edit persistence ────────────────────────────────────────
  // Draft model lives in src/lib/brief-draft.ts (v2 envelope with created_at
  // timestamp for stale-write detection). Reads here normalise legacy v1 drafts.
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [showStaleDiscardModal, setShowStaleDiscardModal] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, unknown>>({});
  const [staleness, setStaleness] = useState<Staleness>("no_draft");
  const [draftCreatedAt, setDraftCreatedAt] = useState<string | null>(null);
  const [serverUpdatedAtAtMount, setServerUpdatedAtAtMount] = useState<string | null>(null);
  const [recoverPanelMode, setRecoverPanelMode] = useState<"none" | "compare" | "fields">("none");

  // Check for existing edits on mount (edit mode only)
  useEffect(() => {
    if (!isEditMode) return;
    const draft = readDraft(searchId);
    if (!draft || Object.keys(draft.edits).length === 0) return;

    setLocalOverrides(draft.edits);
    setDraftCreatedAt(draft.created_at);
    setServerUpdatedAtAtMount(data.updated_at ?? null);
    setStaleness(computeStaleness(draft, data.updated_at));

    // Drafts older than 24h get a separate discard prompt instead of the
    // standard recovery dialog (defaults to discard, prevents abandoned tabs
    // from silently expanding the clobber surface).
    if (isDraftStaleByAge(draft)) {
      setShowStaleDiscardModal(true);
    } else {
      setShowRecoverModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecoverKeep = () => {
    // localOverrides already set — they'll be used by getField()
    setShowRecoverModal(false);
    setRecoverPanelMode("none");
  };

  const handleRecoverReset = () => {
    setLocalOverrides({});
    removeDraft(searchId);
    setShowRecoverModal(false);
    setShowStaleDiscardModal(false);
    setRecoverPanelMode("none");
  };

  const handleStaleKeepAnyway = () => {
    // User opted to keep a >24h draft despite the warning. Promote into
    // the normal recovery dialog so they can still Compare / inspect / restore.
    setShowStaleDiscardModal(false);
    setShowRecoverModal(true);
  };

  // Helper to get field value with localStorage overrides
  const getField = useCallback(
    (serverValue: string | undefined, field: string) =>
      localOverrides[field] !== undefined ? String(localOverrides[field]) : (serverValue || ""),
    [localOverrides]
  );

  // Local state for key criteria (supports add/remove)
  const [criteria, setCriteria] = useState<Criterion[]>(
    () => js?.key_criteria_detailed || []
  );

  // Apply recovered criteria overrides
  useEffect(() => {
    if (localOverrides.key_criteria && Array.isArray(localOverrides.key_criteria)) {
      setCriteria(localOverrides.key_criteria as Criterion[]);
    }
  }, [localOverrides]);

  // Local state for scope dimensions (supports add/remove/reorder)
  const [scopeDims, setScopeDims] = useState<ScopeDim[]>(
    () => normalizeScopeDims(data.scope_match_dimensions)
  );

  // Apply recovered scope-dimension overrides
  useEffect(() => {
    if (localOverrides.scope_match_dimensions && Array.isArray(localOverrides.scope_match_dimensions)) {
      setScopeDims(normalizeScopeDims(localOverrides.scope_match_dimensions));
    }
  }, [localOverrides]);

  // ── Debounced save (all hooks must be before early return) ────────────────

  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const intelEditsRef = useRef<Record<string, string>>({});

  const handleFieldSave = useCallback((field: string, value: string | unknown) => {
    // Write to localStorage immediately (v2 envelope with created_at)
    writeDraftField(searchId, field, value);

    // Track intel field edits in ref for Save Intelligence
    const INTEL_FIELDS = ["red_flag_title", "red_flag_detail", "predecessor_context", "candidate_messaging", "additional_internal_notes"];
    if (INTEL_FIELDS.includes(field)) {
      intelEditsRef.current[field] = typeof value === "string" ? value : JSON.stringify(value);
    }

    // Update local overrides for live display
    setLocalOverrides((prev) => ({ ...prev, [field]: value }));

    // Debounced Supabase save
    const saveTimers = saveTimersRef.current;
    const existing = saveTimers.get(field);
    if (existing) clearTimeout(existing);

    setSavingFields((prev) => new Set(prev).add(field));

    const timer = setTimeout(async () => {
      let saveOk = false;
      try {
        const res = await fetch(`/api/deck/${searchId}/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        saveOk = res.ok;
      } catch (err) {
        console.error("[brief-save] Failed:", err);
      } finally {
        if (saveOk) {
          // Persisted — drop this field from the local draft so the
          // recovery dialog won't fire for it on next load.
          removeDraftField(searchId, field);
        }
        setSavingFields((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }
      saveTimers.delete(field);
    }, 2000);

    saveTimers.set(field, timer);
  }, [searchId]);

  const saveCriteria = useCallback((updated: Criterion[]) => {
    setCriteria(updated);
    handleFieldSave("key_criteria", updated);
  }, [handleFieldSave]);

  const saveScopeDims = useCallback((updated: ScopeDim[]) => {
    setScopeDims(updated);
    handleFieldSave("scope_match_dimensions", updated);
  }, [handleFieldSave]);

  const handleSaveIntelligence = useCallback(async () => {
    setIntelSaving(true);
    try {
      const payload = { ...intelEditsRef.current };
      if (Object.keys(payload).length > 0) {
        await fetch(`/api/deck/${searchId}/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIntelSaved(true);
      setTimeout(() => setIntelSaved(false), 2000);
    } catch (err) {
      console.error("[intel-save] Failed:", err);
    } finally {
      setIntelSaving(false);
    }
  }, [searchId]);

  // ── Drag-to-reorder criteria (edit mode only) ────────────────────────────
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Drag-to-reorder scope dimensions (edit mode only, own state) ─────────
  const [dimDragIdx, setDimDragIdx] = useState<number | null>(null);
  const [dimDragOverIdx, setDimDragOverIdx] = useState<number | null>(null);

  // Index of a dimension pending a delete confirmation (set when the dimension
  // has candidate content; null when no confirm is open).
  const [dimPendingDelete, setDimPendingDelete] = useState<number | null>(null);

  // ── Early return after all hooks ──────────────────────────────────────────

  if (!js) return null;

  const hasCompData =
    js.budget_base || js.budget_bonus || js.budget_lti || js.budget_di || isEditMode;
  const hasProfileData =
    data.client_location ||
    js.line_manager ||
    js.team_size ||
    js.remit ||
    js.confidentiality ||
    isEditMode;
  const hasInternalData =
    js.red_flag_title ||
    js.red_flag_detail ||
    js.predecessor_context ||
    js.candidate_messaging ||
    js.additional_internal_notes;

  const updateCriterionName = (index: number, name: string) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, name } : c
    );
    saveCriteria(updated);
  };

  const updateCriterionDetail = (index: number, detail: string) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, detail } : c
    );
    saveCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    const updated = criteria.filter((_, i) => i !== index);
    saveCriteria(updated);
  };

  const addCriterion = () => {
    const updated = [...criteria, { name: "New Criterion", detail: "", priority: "preferred" }];
    saveCriteria(updated);
  };

  const handleCriteriaDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleCriteriaDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx !== null && idx !== dragIdx) {
      setDragOverIdx(idx);
    }
  };

  const handleCriteriaDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...criteria];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    saveCriteria(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleCriteriaDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // ── Scope dimension handlers (mirror the criteria editor) ─────────────────

  const updateDimName = (index: number, name: string) => {
    saveScopeDims(scopeDims.map((d, i) => (i === index ? { ...d, name } : d)));
  };

  const updateDimRequirement = (index: number, role_requirement: string) => {
    saveScopeDims(scopeDims.map((d, i) => (i === index ? { ...d, role_requirement } : d)));
  };

  // Does any candidate have real scope content (non-empty actual, or an
  // assessed alignment) under this dimension? Joins by stable id first, falling
  // back to a normalised-name match for pre-backfill rows. Drives the
  // delete-confirm so a consultant can't silently drop generated evidence.
  const dimensionHasContent = (dim: ScopeDim): boolean => {
    const key = dimCanonKey(dim.name);
    for (const cand of data.candidates ?? []) {
      const rows = cand.edc_data?.scope_match;
      if (!Array.isArray(rows)) continue;
      for (const r of rows) {
        const matches = (dim.id && r?.dimension_id === dim.id) || dimCanonKey(r?.scope) === key;
        if (!matches) continue;
        const hasActual = typeof r?.candidate_actual === "string" && r.candidate_actual.trim().length > 0;
        const assessed = r?.alignment && r.alignment !== "not_assessed";
        if (hasActual || assessed) return true;
      }
    }
    return false;
  };

  const deleteDimAt = (index: number) => {
    saveScopeDims(scopeDims.filter((_, i) => i !== index));
  };

  const removeDim = (index: number) => {
    const dim = scopeDims[index];
    // Confirm only when candidate evidence exists under this dimension —
    // deleting an empty dimension is a zero-cost reversible edit.
    if (dim && dimensionHasContent(dim)) {
      setDimPendingDelete(index);
      return;
    }
    deleteDimAt(index);
  };

  const addDim = () => {
    // Mint the stable id at creation so it survives the session's debounced
    // saves (and every later rename). The server preserves it; it never changes.
    saveScopeDims([...scopeDims, { id: newDimensionId(), name: "New dimension", role_requirement: "" }]);
  };

  const handleDimDragStart = (idx: number) => (e: React.DragEvent) => {
    setDimDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleDimDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dimDragIdx !== null && idx !== dimDragIdx) {
      setDimDragOverIdx(idx);
    }
  };

  const handleDimDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dimDragIdx === null || dimDragIdx === idx) { setDimDragIdx(null); setDimDragOverIdx(null); return; }
    const reordered = [...scopeDims];
    const [moved] = reordered.splice(dimDragIdx, 1);
    reordered.splice(idx, 0, moved);
    saveScopeDims(reordered);
    setDimDragIdx(null);
    setDimDragOverIdx(null);
  };

  const handleDimDragEnd = () => {
    setDimDragIdx(null);
    setDimDragOverIdx(null);
  };

  // Derive display values (with localStorage overrides)
  const roleTitle =
    getField(js.position || data.role_title || data.search_name, "position") || "Role Brief";
  const companyName =
    getField(data.client_display_name || data.client_company, "client_display_name") || "";
  const flashParts = [companyName, getField(js.revenue, "revenue"), getField(data.client_location, "location")].filter(
    Boolean
  );

  return (
    <EditorContext.Provider value={{ isEditable: isEditMode }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          background: "#1a1816",
        }}
      >
        {/* ── Main Brief document ──────────────────────────────────── */}
        <div
          className="js-brief-container"
          data-pdf-ready={pdfReady ? "true" : undefined}
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            justifyContent: "center",
            padding: isFullPage ? "40px 24px 60px" : "32px 24px 48px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              width: "100%",
              background: "#faf8f5",
              borderRadius: "12px",
              padding: "36px 56px",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.15), inset 0 0 80px rgba(197,165,114,0.03)",
              position: "relative",
            }}
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div
              className="js-brief-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
                gap: "24px",
              }}
            >
              <span
                style={{
                  fontFamily:
                    "var(--font-libre-franklin), 'Libre Franklin', sans-serif",
                  fontSize: "2.4rem",
                  fontWeight: 600,
                  color: "var(--ss-gold, #c5a572)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1,
                }}
              >
                Job Summary
              </span>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/Logos_SmartSearch_Primary_FullColour.png"
                alt="SmartSearch"
                style={{
                  height: "48px",
                  width: "auto",
                  opacity: 0.95,
                }}
              />
            </div>

            {/* Regenerate-all action — its own subtle, left-aligned utility row
                beneath the title so it doesn't crowd the logo. Fires the bulk
                regenerate flow against every candidate with raw_manual_notes.
                Matches the per-card / Our Take treatment: sparkle glyph, in-pill
                estimated progress + %, and a confirm gate. */}
            {isEditMode && bulkCandidateCount > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "2px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => { if (!bulkRegenRunning) setBulkConfirmOpen(true); }}
                  disabled={bulkRegenRunning}
                  title="Regenerate AI content for all candidates"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: bulkRegenRunning ? "var(--ss-gold-deep)" : "#b08f5a",
                    background: "rgba(250,248,245,0.6)",
                    border: "1.5px solid rgba(197,165,114,0.45)",
                    borderRadius: "18px",
                    padding: "5px 12px",
                    cursor: bulkRegenRunning ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                    letterSpacing: "0.2px",
                    fontFamily: "var(--font-outfit), Inter, sans-serif",
                  }}
                  onMouseOver={(e) => {
                    if (bulkRegenRunning) return;
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = "rgba(197,165,114,0.12)";
                    btn.style.borderColor = "rgba(197,165,114,0.7)";
                    btn.style.color = "var(--ss-gold-deep)";
                  }}
                  onMouseOut={(e) => {
                    if (bulkRegenRunning) return;
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = "rgba(250,248,245,0.6)";
                    btn.style.borderColor = "rgba(197,165,114,0.45)";
                    btn.style.color = "#b08f5a";
                  }}
                >
                  {bulkRegenRunning && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${bulkPct}%`,
                        background: "rgba(197,165,114,0.2)",
                        transition: "width 0.1s linear",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}>
                    <SparkleIcon size={12} pulse={bulkRegenRunning} />
                    {bulkRegenRunning ? `Regenerating ${bulkPct}%` : "Regenerate EDCs"}
                  </span>
                </button>
              </div>
            )}

            <ConfirmDialog
              open={bulkConfirmOpen}
              title="Regenerate all cards?"
              body={`This re-runs the AI for all ${bulkCandidateCount} candidate${bulkCandidateCount === 1 ? "" : "s"} from their raw notes. Manual edits are preserved — any differences are surfaced for you to review.`}
              confirmLabel="Regenerate all"
              tone="gold"
              onConfirm={() => { setBulkConfirmOpen(false); handleRegenerateAll(); }}
              onCancel={() => setBulkConfirmOpen(false)}
            />

            <ConfirmDialog
              open={dimPendingDelete !== null}
              title="Delete this scope dimension?"
              body={
                dimPendingDelete !== null && scopeDims[dimPendingDelete]
                  ? `"${scopeDims[dimPendingDelete].name}" has candidate evidence on one or more cards. Deleting it removes the dimension from every candidate's Scope Match. This can't be undone from here.`
                  : "Deleting this dimension removes it from every candidate's Scope Match."
              }
              confirmLabel="Delete dimension"
              tone="danger"
              onConfirm={() => {
                if (dimPendingDelete !== null) deleteDimAt(dimPendingDelete);
                setDimPendingDelete(null);
              }}
              onCancel={() => setDimPendingDelete(null)}
            />

            {/* Bulk conflict modal queue — opens for each candidate with
                conflicts in sequence. Closes when the queue empties. */}
            {bulkConflictQueue.length > 0 && (
              <ReviewChangesModal
                key={bulkConflictQueue[0].candidateSlug}
                searchId={searchId}
                candidateSlug={bulkConflictQueue[0].candidateSlug}
                candidateName={bulkConflictQueue[0].candidateName}
                conflicts={bulkConflictQueue[0].conflicts}
                onApplied={dismissCurrentConflict}
                onClose={dismissCurrentConflict}
              />
            )}

            {/* Bulk summary banner — visible briefly after a bulk run completes */}
            {bulkSummary && !bulkRegenRunning && bulkConflictQueue.length === 0 && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'rgba(45,40,36,0.65)',
                  margin: '4px 0 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span>
                  Regenerated {bulkSummary.processed} candidate{bulkSummary.processed === 1 ? '' : 's'}
                  {bulkSummary.conflicts > 0 ? ` · ${bulkSummary.conflicts} reviewed` : ''}
                  {bulkSummary.failed > 0 ? ` · ${bulkSummary.failed} failed` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setBulkSummary(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(45,40,36,0.45)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 4px',
                  }}
                  aria-label="Dismiss summary"
                >
                  ×
                </button>
              </div>
            )}

            <GoldRule />

            {/* ── Role Title (editable) ──────────────────────────── */}
            <BriefField
              value={roleTitle}
              field="position"
              onSave={handleFieldSave}
              isEdit={isEditMode}
              as="h1"
              className="font-cormorant"
              style={{
                fontSize: "2.1rem",
                fontWeight: 600,
                color: "#1a1a1a",
                lineHeight: 1.15,
                marginBottom: "8px",
                letterSpacing: "-0.3px",
              }}
            />

            {/* Flash bio bar (editable segments in edit mode) */}
            {isEditMode ? (
              <div
                style={{
                  fontSize: "0.88rem",
                  color: "#6b6b6b",
                  marginBottom: "0",
                  display: "flex",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "0",
                }}
              >
                <EditableField
                  value={companyName}
                  as="span"
                  html={false}
                  style={{ fontSize: "0.88rem", color: "#6b6b6b" }}
                  onUpdate={(v) => handleFieldSave("client_display_name", v)}
                />
                <span style={{ margin: "0 8px", color: "#c0c0c0" }}>|</span>
                <EditableField
                  value={getField(js.revenue, "revenue")}
                  as="span"
                  html={false}
                  style={{ fontSize: "0.88rem", color: "#6b6b6b" }}
                  onUpdate={(v) => handleFieldSave("revenue", v)}
                />
                <span style={{ margin: "0 8px", color: "#c0c0c0" }}>|</span>
                <EditableField
                  value={getField(data.client_location, "location")}
                  as="span"
                  html={false}
                  style={{ fontSize: "0.88rem", color: "#6b6b6b" }}
                  onUpdate={(v) => handleFieldSave("location", v)}
                />
              </div>
            ) : (
              flashParts.length > 0 && (
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#6b6b6b",
                    marginBottom: "0",
                  }}
                >
                  {flashParts.join("  |  ")}
                </p>
              )
            )}

            {/* Search Lead row — editable in edit mode, writes to searches.kam */}
            {(isEditMode || data.search_lead) && (
              <div
                className="js-brief-search-lead-row"
                style={{ marginTop: "8px", display: "flex", alignItems: "baseline", gap: "6px" }}
              >
                <span style={{ fontSize: "0.72rem", color: "#8a8a8a", fontWeight: 600, letterSpacing: "0.3px" }}>
                  Search Lead:
                </span>
                {isEditMode ? (
                  <EditableField
                    value={getField(data.search_lead, "kam")}
                    as="span"
                    html={false}
                    style={{ fontSize: "0.82rem", color: "#6b6b6b" }}
                    onUpdate={(v) => handleFieldSave("kam", v)}
                  />
                ) : (
                  <span style={{ fontSize: "0.82rem", color: "#6b6b6b" }}>{data.search_lead}</span>
                )}
              </div>
            )}

            <GoldRule />

            {/* ── Role Profile table ─────────────────────────────── */}
            {hasProfileData && (
              <>
                <Section label="Role Profile">
                  <div>
                    <ProfileRow label="Location" value={getField(data.client_location, "location")} field="location" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Line Manager" value={getField(js.line_manager, "line_manager")} field="line_manager" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Team Size" value={getField(js.team_size, "team_size")} field="team_size" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Remit" value={getField(js.remit, "remit")} field="remit" onSave={handleFieldSave} isEdit={isEditMode} />
                    <ProfileRow label="Confidentiality" value={getField(js.confidentiality, "confidentiality")} field="confidentiality" onSave={handleFieldSave} isEdit={isEditMode} />
                  </div>
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Core Mission ────────────────────────────────────── */}
            {(js.core_mission || isEditMode) && (
              <>
                <Section label="Core Mission">
                  <BriefField
                    value={getField(js.core_mission, "core_mission")}
                    field="core_mission"
                    onSave={handleFieldSave}
                    isEdit={isEditMode}
                    style={{
                      fontSize: "0.88rem",
                      color: "#3a3a3a",
                      lineHeight: 1.65,
                      fontStyle: "italic",
                    }}
                  />
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Why Is This Role Open? ──────────────────────────── */}
            {(js.why_open || isEditMode) && (
              <>
                <Section label="Why Is This Role Open?">
                  <BriefField
                    value={getField(js.why_open, "why_open")}
                    field="why_open"
                    onSave={handleFieldSave}
                    isEdit={isEditMode}
                    style={{
                      fontSize: "0.85rem",
                      color: "#3a3a3a",
                      lineHeight: 1.6,
                    }}
                  />
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Key Criteria ────────────────────────────────────── */}
            {(criteria.length > 0 || isEditMode) && (
              <>
                <Section label="Key Criteria">
                  <ol
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {criteria.map((kc, i) => (
                      <li
                        key={i}
                        draggable={isEditMode}
                        onDragStart={isEditMode ? handleCriteriaDragStart(i) : undefined}
                        onDragOver={isEditMode ? handleCriteriaDragOver(i) : undefined}
                        onDrop={isEditMode ? handleCriteriaDrop(i) : undefined}
                        onDragEnd={isEditMode ? handleCriteriaDragEnd : undefined}
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "9px",
                          lineHeight: 1.55,
                          alignItems: "flex-start",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          borderLeft: "2px solid transparent",
                          transition: "all 0.15s",
                          marginLeft: "-10px",
                          opacity: dragIdx === i ? 0.3 : 1,
                          cursor: isEditMode ? (dragIdx === i ? "grabbing" : "grab") : undefined,
                          borderTop: isEditMode && dragOverIdx === i && dragIdx !== null && dragIdx > i
                            ? "2px solid var(--ss-gold, #c5a572)"
                            : undefined,
                          borderBottom: isEditMode && dragOverIdx === i && dragIdx !== null && dragIdx < i
                            ? "2px solid var(--ss-gold, #c5a572)"
                            : undefined,
                        }}
                        onMouseOver={(e) => {
                          if (!isEditMode) {
                            e.currentTarget.style.borderLeftColor = "var(--ss-gold, #c5a572)";
                            e.currentTarget.style.background = "rgba(197,165,114,0.03)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isEditMode) {
                            e.currentTarget.style.borderLeftColor = "transparent";
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        {/* Drag handle (edit mode) */}
                        {isEditMode && (
                          <span
                            style={{
                              color: "rgba(197,165,114,0.35)",
                              fontSize: "0.75rem",
                              flexShrink: 0,
                              paddingTop: "2px",
                              cursor: "grab",
                              userSelect: "none",
                            }}
                            title="Drag to reorder"
                          >
                            ⠿
                          </span>
                        )}
                        <span
                          style={{
                            color: "var(--ss-gold, #c5a572)",
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            minWidth: "18px",
                            flexShrink: 0,
                            paddingTop: "1px",
                          }}
                        >
                          {i + 1}.
                        </span>
                        <div style={{ flex: 1 }}>
                          {isEditMode ? (
                            <>
                              <EditableField
                                value={kc.name}
                                as="div"
                                html={false}
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.88rem",
                                  color: "#1a1a1a",
                                  display: "block",
                                }}
                                onUpdate={(v) => updateCriterionName(i, v)}
                              />
                              <EditableField
                                value={kc.detail || ""}
                                as="div"
                                html={false}
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#4a4a4a",
                                  display: "block",
                                  marginTop: "4px",
                                }}
                                onUpdate={(v) => updateCriterionDetail(i, v)}
                              />
                            </>
                          ) : (
                            <>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.88rem",
                                  color: "#1a1a1a",
                                  display: "block",
                                }}
                              >
                                {kc.name}
                              </span>
                              {kc.detail && (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#4a4a4a",
                                    display: "block",
                                    marginTop: "4px",
                                  }}
                                >
                                  {kc.detail}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {/* Remove button (edit mode only) */}
                        {isEditMode && (
                          <button
                            onClick={() => removeCriterion(i)}
                            title="Remove criterion"
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "1px solid rgba(197,165,114,0.2)",
                              background: "transparent",
                              color: "rgba(197,165,114,0.4)",
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: "2px",
                              transition: "all 0.15s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,84,80,0.4)";
                              (e.currentTarget as HTMLButtonElement).style.color = "rgba(184,84,80,0.7)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
                              (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)";
                            }}
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                  {/* Add criterion button (edit mode only) */}
                  {isEditMode && (
                    <button
                      onClick={addCriterion}
                      style={{
                        background: "transparent",
                        border: "1px dashed rgba(197,165,114,0.25)",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        color: "rgba(197,165,114,0.5)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        width: "100%",
                        textAlign: "left",
                        marginTop: "4px",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.5)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold, #c5a572)";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.25)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)";
                      }}
                    >
                      + Add criterion
                    </button>
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Scope Dimensions (edit mode only — internal tooling) ── */}
            {isEditMode && (
              <div className="js-brief-scope-dims">
                <Section label="Scope Dimensions">
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#8a8a8a",
                      fontStyle: "italic",
                      marginBottom: "10px",
                    }}
                  >
                    Canonical Role Requirement column on every candidate&apos;s Scope
                    Match. Internal only — not shown to clients or in the PDF.
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {scopeDims.map((dim, i) => (
                      <li
                        key={i}
                        draggable
                        onDragStart={handleDimDragStart(i)}
                        onDragOver={handleDimDragOver(i)}
                        onDrop={handleDimDrop(i)}
                        onDragEnd={handleDimDragEnd}
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "9px",
                          lineHeight: 1.55,
                          alignItems: "flex-start",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          borderLeft: "2px solid transparent",
                          transition: "all 0.15s",
                          marginLeft: "-10px",
                          opacity: dimDragIdx === i ? 0.3 : 1,
                          cursor: dimDragIdx === i ? "grabbing" : "grab",
                          borderTop: dimDragOverIdx === i && dimDragIdx !== null && dimDragIdx > i
                            ? "2px solid var(--ss-gold, #c5a572)"
                            : undefined,
                          borderBottom: dimDragOverIdx === i && dimDragIdx !== null && dimDragIdx < i
                            ? "2px solid var(--ss-gold, #c5a572)"
                            : undefined,
                        }}
                      >
                        {/* Drag handle */}
                        <span
                          style={{
                            color: "rgba(197,165,114,0.35)",
                            fontSize: "0.75rem",
                            flexShrink: 0,
                            paddingTop: "2px",
                            cursor: "grab",
                            userSelect: "none",
                          }}
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>
                        <div style={{ flex: 1 }}>
                          <EditableField
                            value={dim.name}
                            as="div"
                            html={false}
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: "#1a1a1a",
                              display: "block",
                            }}
                            onUpdate={(v) => updateDimName(i, v)}
                          />
                          <EditableField
                            value={dim.role_requirement}
                            as="div"
                            html={false}
                            style={{
                              fontSize: "0.85rem",
                              color: "#4a4a4a",
                              display: "block",
                              marginTop: "4px",
                            }}
                            onUpdate={(v) => updateDimRequirement(i, v)}
                          />
                        </div>
                        {/* Remove button */}
                        <button
                          onClick={() => removeDim(i)}
                          title="Remove dimension"
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: "1px solid rgba(197,165,114,0.2)",
                            background: "transparent",
                            color: "rgba(197,165,114,0.4)",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184,84,80,0.4)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(184,84,80,0.7)";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.2)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.4)";
                          }}
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={addDim}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(197,165,114,0.25)",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: "rgba(197,165,114,0.5)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      width: "100%",
                      textAlign: "left",
                      marginTop: "4px",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.5)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--ss-gold, #c5a572)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(197,165,114,0.25)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(197,165,114,0.5)";
                    }}
                  >
                    + Add dimension
                  </button>
                </Section>
                <GoldRule />
              </div>
            )}

            {/* ── Key Responsibilities ────────────────────────────── */}
            {(js.key_responsibilities || isEditMode) && (
              <>
                <Section label="Key Responsibilities">
                  {isEditMode ? (
                    <BriefField
                      value={getField(js.key_responsibilities, "key_responsibilities")}
                      field="key_responsibilities"
                      onSave={handleFieldSave}
                      isEdit={true}
                      as="div"
                      style={{
                        fontSize: "0.85rem",
                        color: "#3a3a3a",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    />
                  ) : (
                    <ResponsibilitiesList text={getField(js.key_responsibilities, "key_responsibilities")} />
                  )}
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Compensation Framework ──────────────────────────── */}
            {(hasCompData || isEditMode) && (
              <>
                <Section label="Compensation">
                  <div>
                    <CompRow label="Base Salary" value={getField(js.budget_base, "budget_base")} field="budget_base" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="Target Bonus" value={getField(js.budget_bonus, "budget_bonus")} field="budget_bonus" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="LTIP / MIP" value={getField(js.budget_lti, "budget_lti")} field="budget_lti" onSave={handleFieldSave} isEdit={isEditMode} />
                    <CompRow label="Direct Investment" value={getField(js.budget_di, "budget_di")} field="budget_di" onSave={handleFieldSave} isEdit={isEditMode} />
                  </div>
                </Section>
                <GoldRule />
              </>
            )}

            {/* ── Closing message (State 1 only) ─────────────────── */}
            {isFullPage && (
              <div
                className="js-brief-closing-banner"
                style={{
                  textAlign: "center",
                  padding: "28px 24px",
                  margin: "12px 0 0",
                  borderTop: "1px solid rgba(197,165,114,0.15)",
                  borderBottom: "1px solid rgba(197,165,114,0.15)",
                  background: "rgba(197,165,114,0.03)",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b6b6b",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Candidates evaluated against these criteria will arrive as
                  they are finalised by the search team.
                </p>
              </div>
            )}

            {/* ── Footer ─────────────────────────────────────────── */}
            <div
              style={{
                marginTop: "22px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(197,165,114,0.2)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#a0a0a0",
                  marginBottom: "6px",
                }}
              >
                Confidential
              </p>
              {js.js_last_synced_at && (
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "#b0b0b0",
                    marginBottom: "6px",
                  }}
                >
                  Last updated:{" "}
                  {new Date(js.js_last_synced_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <p
                className="js-brief-footer-collab"
                style={{
                  fontSize: "0.62rem",
                  color: "#b0b0b0",
                  margin: 0,
                }}
              >
                SmartSearch Executive Search
              </p>
            </div>

            {/* ── Save indicator ──────────────────────────────────── */}
            {savingFields.size > 0 && (
              <div
                className="js-brief-edit-controls"
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "56px",
                  fontSize: "0.65rem",
                  color: "var(--ss-gold, #c5a572)",
                  opacity: 0.7,
                }}
              >
                Saving...
              </div>
            )}
          </div>
        </div>

        {/* ── Internal Intelligence panel (edit mode only) ──────── */}
        {isEditMode && (hasInternalData || isEditMode) && (
          <>
            {/* Toggle button */}
            <button
              className="js-brief-edit-controls"
              onClick={() => setShowIntel(!showIntel)}
              style={{
                position: "fixed",
                top: "60px",
                right: showIntel ? "332px" : "12px",
                zIndex: 50,
                background: "rgba(201,149,58,0.12)",
                border: "1px solid rgba(201,149,58,0.3)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--ss-yellow, #c9953a)",
                cursor: "pointer",
                transition: "right 0.25s ease",
                whiteSpace: "nowrap",
              }}
            >
              {showIntel ? "Hide" : "Internal"} Intelligence
            </button>

            {/* Panel */}
            {showIntel && (
              <div
                className="js-brief-internal-panel"
                style={{
                  width: "320px",
                  minWidth: "320px",
                  minHeight: 0,
                  background: "rgba(45,40,36,0.95)",
                  borderLeft: "1px solid rgba(201,149,58,0.15)",
                  padding: "24px 20px",
                  overflowY: "auto",
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "rgba(201,149,58,0.6)",
                    marginBottom: "4px",
                  }}
                >
                  Internal Intelligence
                </p>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "20px",
                    fontStyle: "italic",
                  }}
                >
                  Not visible to clients
                </p>

                {/* Red Flags — title */}
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "rgba(201,149,58,0.8)",
                      marginBottom: "6px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Hard Requirements &amp; Red Flags
                  </p>
                  <EditableField
                    value={getField(js.red_flag_title, "red_flag_title")}
                    as="p"
                    html={false}
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.8)",
                      marginBottom: "4px",
                    }}
                    onUpdate={(v) => handleFieldSave("red_flag_title", v)}
                  />
                  <EditableField
                    value={getField(js.red_flag_detail, "red_flag_detail")}
                    as="p"
                    html={false}
                    style={{
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap" as const,
                    }}
                    onUpdate={(v) => handleFieldSave("red_flag_detail", v)}
                  />
                </div>

                <IntelField label="Predecessor Context" value={getField(js.predecessor_context, "predecessor_context")} field="predecessor_context" onSave={handleFieldSave} />
                <IntelField label="Candidate Messaging" value={getField(js.candidate_messaging, "candidate_messaging")} field="candidate_messaging" onSave={handleFieldSave} />
                <IntelField label="Additional Intelligence" value={getField(js.additional_internal_notes, "additional_internal_notes")} field="additional_internal_notes" onSave={handleFieldSave} />

                {/* Save Intelligence button */}
                <button
                  onClick={handleSaveIntelligence}
                  disabled={intelSaving}
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    padding: "10px 16px",
                    background: intelSaved ? "rgba(74,124,89,0.12)" : "transparent",
                    border: intelSaved ? "1px solid rgba(74,124,89,0.35)" : "1px solid rgba(201,149,58,0.35)",
                    borderRadius: "8px",
                    color: intelSaved ? "#4a7c59" : "var(--ss-yellow, #c9953a)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: intelSaving ? "wait" : "pointer",
                    letterSpacing: "0.3px",
                    transition: "all 0.2s",
                    opacity: intelSaving ? 0.6 : 1,
                  }}
                >
                  {intelSaved ? "✓ Saved" : intelSaving ? "Saving..." : "Save Intelligence"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── >24h discard prompt (separate from main recovery dialog) ─── */}
      {showStaleDiscardModal && (
        <div
          className="js-brief-stale-discard-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#faf8f5",
              borderRadius: "12px",
              padding: "28px 32px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <h3
              className="font-cormorant"
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1a1a1a",
                marginBottom: "10px",
              }}
            >
              Your draft is more than a day old
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b6b6b",
                lineHeight: 1.6,
                marginBottom: "22px",
              }}
            >
              You have unsaved edits from {relativeTime(draftCreatedAt)}. Drafts that old usually predate other consultants&rsquo; changes — discard is the safer choice.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={handleStaleKeepAnyway}
                style={{
                  padding: "10px 20px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "1px solid #d4d2ce",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "#6b6b6b",
                  cursor: "pointer",
                }}
              >
                Keep anyway
              </button>
              <button
                onClick={handleRecoverReset}
                style={{
                  padding: "10px 20px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "1px solid var(--ss-gold, #c5a572)",
                  borderRadius: "8px",
                  background: "var(--ss-gold, #c5a572)",
                  color: "#faf8f5",
                  cursor: "pointer",
                }}
              >
                Discard draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recovery modal (staleness-aware) ──────────────────────────── */}
      {showRecoverModal && (() => {
        const draftFields = Object.keys(localOverrides);
        const restoreIsPrimary = staleness === "draft_ahead_or_equal";
        const showAmberBand = staleness === "server_ahead";

        const bodyCopy =
          staleness === "server_ahead"
            ? `Your browser has unsaved changes from ${relativeTime(draftCreatedAt)}.`
            : staleness === "legacy_unknown"
            ? "Your browser has unsaved changes from a previous session. We can\u2019t tell how old they are, so we recommend loading the latest saved version unless you know what\u2019s in your draft."
            : `Your browser has unsaved changes from ${relativeTime(draftCreatedAt)}. The saved version on the server has not been updated since.`;

        const primaryStyle: React.CSSProperties = {
          padding: "10px 22px",
          fontSize: "0.82rem",
          fontWeight: 600,
          border: "1px solid var(--ss-gold, #c5a572)",
          borderRadius: "8px",
          background: "var(--ss-gold, #c5a572)",
          color: "#faf8f5",
          cursor: "pointer",
        };
        const secondaryStyle: React.CSSProperties = {
          padding: "10px 18px",
          fontSize: "0.82rem",
          fontWeight: 600,
          border: "1px solid #d4d2ce",
          borderRadius: "8px",
          background: "transparent",
          color: "#3a3a3a",
          cursor: "pointer",
        };
        const linkStyle: React.CSSProperties = {
          padding: "10px 8px",
          fontSize: "0.78rem",
          fontWeight: 500,
          border: "none",
          background: "transparent",
          color: "#6b6b6b",
          cursor: "pointer",
          textDecoration: "underline",
        };

        return (
          <div
            className="js-brief-recover-modal"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                background: "#faf8f5",
                borderRadius: "12px",
                padding: "28px 32px",
                maxWidth: recoverPanelMode === "compare" ? "720px" : "520px",
                width: "92%",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              <h3
                className="font-cormorant"
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "10px",
                }}
              >
                You have a local draft of this brief
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#3a3a3a",
                  lineHeight: 1.6,
                  marginBottom: showAmberBand ? "12px" : "20px",
                }}
              >
                {bodyCopy}
              </p>

              {showAmberBand && (
                <div
                  style={{
                    background: "#FAEEDA",
                    borderLeft: "3px solid #BA7517",
                    padding: "10px 14px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    color: "#3a3a3a",
                    lineHeight: 1.5,
                    marginBottom: "20px",
                  }}
                >
                  <strong>The saved version was updated {relativeTime(serverUpdatedAtAtMount)}.</strong>{" "}
                  Restoring your draft is risky in three places — if you re-edit any field that&rsquo;s also in your draft, if you touch the criteria list (even just to reorder), and at Lock &amp; Share.
                </div>
              )}

              {recoverPanelMode === "fields" && (
                <div
                  style={{
                    background: "#fdfbf7",
                    border: "1px solid #f0ede8",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "#6b6b6b",
                      marginBottom: "8px",
                    }}
                  >
                    Fields in your draft ({draftFields.length})
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {draftFields.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: "0.82rem",
                          color: "#3a3a3a",
                          padding: "4px 0",
                          borderBottom: "1px solid #f0ede8",
                        }}
                      >
                        {fieldLabel(f)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recoverPanelMode === "compare" && (
                <div
                  style={{
                    background: "#fdfbf7",
                    border: "1px solid #f0ede8",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "#6b6b6b",
                      paddingBottom: "8px",
                      borderBottom: "1px solid #e5e1d9",
                    }}
                  >
                    <div>Field</div>
                    <div>Server</div>
                    <div>Your draft</div>
                  </div>
                  {draftFields.map((f) => {
                    const serverVal = getServerValueForBriefField(data, f);
                    const draftVal = localOverrides[f];
                    return (
                      <div
                        key={f}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "10px",
                          fontSize: "0.8rem",
                          color: "#3a3a3a",
                          padding: "8px 0",
                          borderBottom: "1px solid #f0ede8",
                          alignItems: "start",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{fieldLabel(f)}</div>
                        <div title={typeof serverVal === "string" ? serverVal : undefined} style={{ wordBreak: "break-word" }}>
                          {compactValuePreview(serverVal)}
                        </div>
                        <div title={typeof draftVal === "string" ? draftVal : undefined} style={{ wordBreak: "break-word" }}>
                          {compactValuePreview(draftVal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() =>
                    setRecoverPanelMode((m) => (m === "compare" ? "none" : "compare"))
                  }
                  style={secondaryStyle}
                >
                  {recoverPanelMode === "compare" ? "Hide compare" : "Compare"}
                </button>
                <button
                  onClick={() =>
                    setRecoverPanelMode((m) => (m === "fields" ? "none" : "fields"))
                  }
                  style={linkStyle}
                >
                  {recoverPanelMode === "fields" ? "Hide list" : "Show me what\u2019s in my draft"}
                </button>
                <button
                  onClick={handleRecoverKeep}
                  style={restoreIsPrimary ? primaryStyle : secondaryStyle}
                >
                  Restore my draft
                </button>
                <button
                  onClick={handleRecoverReset}
                  style={restoreIsPrimary ? secondaryStyle : primaryStyle}
                >
                  Load latest saved version
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </EditorContext.Provider>
  );
}
