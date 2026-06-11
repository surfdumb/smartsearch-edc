import { NextRequest, NextResponse } from 'next/server';
import { jsonrepair } from 'jsonrepair';
import { getServiceClient } from '@/lib/supabase';
import { resolveSearchId } from '@/lib/supabase-data';
import { deterministicResolve } from '@/lib/pipeline-resolution';
import { normalizeEdcData } from '@/lib/normalize-edc';
import type { EDCData } from '@/lib/types';

function validatePipelineAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-pipeline-secret');
  return secret === process.env.PIPELINE_SECRET;
}

/**
 * Strip bytes that make otherwise-valid JSON unparseable: CR and the C0 control
 * characters, EXCEPT TAB (9) and LF (10) which are legal JSON whitespace. Done
 * by code point so we never embed raw control bytes in a regex literal.
 */
function stripJsonControlChars(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 9 || c === 10 || c >= 32) out += s[i];
  }
  return out;
}

/** Candidate name → URL slug (lowercase-hyphenated). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Top-level candidate columns derived from edc_data. When the consultant has
 * edited the corresponding edc_data field (tracked in manually_edited_fields),
 * the Engine must NOT overwrite the mirrored top-level column either.
 *
 * Maps: edc_data field name → top-level column name.
 */
const DERIVED_COLUMNS: Array<{ edcField: string; column: string }> = [
  { edcField: 'current_title', column: 'current_title' },
  { edcField: 'current_company', column: 'current_company' },
  { edcField: 'location', column: 'location' },
  { edcField: 'headline', column: 'headline' },
  { edcField: 'flash_summary', column: 'flash_summary' },
  { edcField: 'compensation_alignment', column: 'compensation_alignment' },
  { edcField: 'status', column: 'deck_status' },
  // our_take is special — handled below because shape varies (string vs {text}).
];

/**
 * Field-level merge: for every field in incoming edc_data, prefer the existing
 * value when that field name is in manually_edited_fields. Returns a new object.
 */
function mergeEdcData(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null,
  manuallyEdited: string[]
): Record<string, unknown> {
  if (!existing) return { ...incoming };
  const out: Record<string, unknown> = { ...incoming };
  for (const field of manuallyEdited) {
    if (field in existing) {
      out[field] = existing[field];
    }
  }
  return out;
}

/**
 * V2 IV envelope shape — produced by the unified `SS · EDC Engine V2 · IV
 * Webhook → Unified EDC` Make scenario. The Claude call emits a single JSON
 * object with three top-level keys (resolution, candidate, edc_data); the
 * scenario forwards it under `llm_output` alongside the raw Granola sources.
 *
 * V1 payload shape (flat: search_id, candidate_name, edc_data at the root)
 * remains supported untouched — used by V1 EDC Engine via Sheets→Supabase
 * promotion and by any direct callers.
 */
type V2Envelope = {
  resolution?: {
    search_id?: string | null;
    search_key?: string | null;
    resolution_confidence?: 'high' | 'ambiguous' | 'no_match' | null;
    resolution_note?: string | null;
    resolution_alternatives?: unknown[];
  };
  candidate?: {
    candidate_name?: string;
    candidate_slug?: string;
  };
  edc_data?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  if (!validatePipelineAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawPayload;
  try {
    rawPayload = await req.json();
  } catch (err) {
    console.error(`[pipeline/iv] request body parse failed: ${(err as Error).message}`);
    return NextResponse.json(
      {
        success: false,
        parse_error: true,
        error: `Request body is not valid JSON: ${(err as Error).message}`,
      },
      { status: 422 }
    );
  }

  // ─── llm_output STRING → OBJECT ─────────────────────────────────────────
  // The V2 IV Make scenario now escapes the Claude output and sends `llm_output`
  // as a JSON *string* so the request body stays valid JSON even when the model
  // output is malformed. Parse it back to an object here, defensively: strict
  // parse first, then a jsonrepair pass (trailing commas, smart quotes, truncated
  // braces), else return 422 (never 500) with the candidate name + an offset
  // snippet. The Make scenario's `stopOnHttpError: false` then lets the email
  // step send "needs attention" instead of the scenario dying. Skipped when
  // llm_output is absent (V1 callers) or already an object (legacy callers).
  if (rawPayload?.llm_output != null && typeof rawPayload.llm_output !== 'object') {
    const rawLlm =
      typeof rawPayload.llm_output === 'string'
        ? rawPayload.llm_output
        : JSON.stringify(rawPayload.llm_output);
    const cleaned = stripJsonControlChars(rawLlm);

    let parsedLlm: unknown = null;
    try {
      parsedLlm = JSON.parse(cleaned);
    } catch (e1) {
      try {
        parsedLlm = JSON.parse(jsonrepair(cleaned));
      } catch {
        /* fall through to 422 below */
      }
      if (!parsedLlm || typeof parsedLlm !== 'object') {
        const name =
          cleaned.match(/"candidate_name"\s*:\s*"([^"]{1,80})"/)?.[1] ??
          rawPayload.granola_title ??
          null;
        const pos = Number((e1 as Error).message.match(/position (\d+)/)?.[1] ?? -1);
        const snippet =
          pos >= 0
            ? cleaned.slice(Math.max(0, pos - 80), pos + 80)
            : cleaned.slice(0, 200);
        console.error(
          `[pipeline/iv] llm_output JSON parse failed: candidate=${name}, ${(e1 as Error).message}`
        );
        return NextResponse.json(
          {
            success: false,
            parse_error: true,
            disambiguation_needed: true, // make the Make email render the "needs attention" header
            candidate_name: name,
            search_name: null,
            error: `llm_output JSON parse failed: ${(e1 as Error).message}`,
            offset_snippet: snippet,
          },
          { status: 422 }
        );
      }
    }
    rawPayload.llm_output = parsedLlm; // hand off to the existing V2 flow unchanged
  }

  // ─── V2 ENVELOPE NORMALIZATION ──────────────────────────────────────────
  // If `llm_output` is present, this came from the V2 IV Engine. Unpack the
  // envelope to the flat shape the rest of this handler operates on, and
  // short-circuit on non-high confidence so the Make scenario can branch its
  // email step to "needs disambiguation" without polluting the candidate table.
  let payload = rawPayload;
  let v2ResolutionConfidence: string | null = null;
  let v2ResolutionNote: string | null = null;
  let v2SearchName: string | null = null;
  let v2DecidedBy: 'llm' | 'deterministic+llm' | null = null;
  let v2Resolution: Record<string, unknown> | null = null;
  const isV2 = rawPayload && typeof rawPayload.llm_output === 'object' && rawPayload.llm_output !== null;

  if (isV2) {
    const env = rawPayload.llm_output as V2Envelope;
    v2ResolutionConfidence = env.resolution?.resolution_confidence ?? null;
    v2ResolutionNote = env.resolution?.resolution_note ?? null;
    v2SearchName = (env.edc_data?.search_name as string | undefined) ?? null;

    // Deterministic pre-resolution: for known crowded namespaces (sibling
    // searches whose interview titles differ only by a qualifier), derive the
    // expected search_key straight from the Granola title. Used only to
    // confirm or block the LLM resolution — never to redirect it, because the
    // envelope's edc_data was generated against the LLM-chosen search's config.
    const detHit = deterministicResolve(rawPayload.granola_title);
    const llmAlternatives = env.resolution?.resolution_alternatives ?? [];

    // All no-write exits share this response so the Make m6 email contract
    // stays uniform: disambiguation_needed drives the subject/header; the
    // candidate/search fields drive the body links; alternatives + note let
    // the email name the candidate searches. Also drops a pipeline_log
    // 'disambiguation' row (best-effort) so refused envelopes are auditable.
    const refuseWrite = async (opts: {
      confidence: string | null;
      note: string | null;
      decidedBy: 'llm' | 'conflict';
      searchKey: string | null;
      alternatives?: unknown[];
    }) => {
      const candidateName = env.candidate?.candidate_name ?? null;
      const alternatives = [...(opts.alternatives ?? llmAlternatives)];
      let note = opts.note;
      // When the title map has an opinion the LLM couldn't confidently form,
      // surface it as a suggestion in the email (still no write).
      if (detHit && opts.decidedBy === 'llm') {
        const suggestion =
          `Deterministic title map suggests '${detHit.search_key}' ` +
          `(${detHit.client}: ${detHit.rule}).`;
        note = note ? `${note} ${suggestion}` : suggestion;
        if (!alternatives.includes(detHit.search_key)) {
          alternatives.push(detHit.search_key);
        }
      }
      try {
        const { error: auditErr } = await getServiceClient()
          .from('pipeline_log')
          .insert({
            note_type: 'iv',
            granola_title: rawPayload.granola_title ?? null,
            matched_search_key: opts.searchKey,
            candidate_name_extracted: candidateName,
            pipeline_status: 'disambiguation',
          });
        if (auditErr) {
          console.warn('[pipeline/iv] pipeline_log disambiguation warn:', auditErr.message);
        }
      } catch (e) {
        console.warn('[pipeline/iv] pipeline_log disambiguation warn:', (e as Error).message);
      }
      return NextResponse.json({
        success: false,
        disambiguation_needed: true,
        candidate_name: candidateName,
        candidate_slug: candidateName ? slugify(candidateName) : null,
        search_key: opts.searchKey,
        search_name: v2SearchName,
        resolution_confidence: opts.confidence,
        resolution_note: note,
        resolution_alternatives: alternatives,
        decided_by: opts.decidedBy,
      });
    };

    // Disambiguation gate — refuse the write if the Engine couldn't confidently
    // pick a search. Return a 200 with disambiguation_needed=true so Make can
    // branch the consultant email rather than treating this as a 4xx failure.
    if (v2ResolutionConfidence !== 'high') {
      console.warn(
        `[pipeline/iv] V2 disambiguation: confidence=${v2ResolutionConfidence}, ` +
          `candidate=${env.candidate?.candidate_name}, granola=${rawPayload.granola_title}`
      );
      return refuseWrite({
        confidence: v2ResolutionConfidence,
        note: v2ResolutionNote,
        decidedBy: 'llm',
        searchKey: env.resolution?.search_key ?? null,
      });
    }

    // High confidence — but the LLM's resolution still needs server-side
    // verification. The V2 Engine returns both search_id and search_key; we
    // trust only the latter because search_key is human-readable and far less
    // hallucinable than a UUID. Look the canonical search_id up from the
    // searches table by search_key and discard the LLM's UUID. (27 May bug:
    // Sarah Rusin's envelope had search_key='cgn-hr-bp-dir' but search_id
    // pointed at the demo-cfo row, so she landed in demo-cfo while Tara's
    // email rendered a link to cgn-hr-bp-dir.)
    const llmSearchId = env.resolution?.search_id ?? null;
    const llmSearchKey = env.resolution?.search_key ?? null;

    if (!llmSearchKey) {
      console.warn(
        `[pipeline/iv] V2 missing search_key: candidate=${env.candidate?.candidate_name}, ` +
          `granola=${rawPayload.granola_title}`
      );
      return refuseWrite({
        confidence: 'no_match',
        note: 'V2 envelope missing search_key — cannot resolve search server-side.',
        decidedBy: 'llm',
        searchKey: null,
      });
    }

    // Unknown search_key (including the LLM inventing one) → no write, 200
    // with disambiguation_needed so the m6 email flow is identical to every
    // other refusal case. Deliberately not a 4xx.
    const canonicalSearchId = await resolveSearchId(llmSearchKey);
    if (!canonicalSearchId) {
      console.warn(
        `[pipeline/iv] V2 search_key not found: search_key=${llmSearchKey}, ` +
          `candidate=${env.candidate?.candidate_name}, ` +
          `granola=${rawPayload.granola_title}`
      );
      return refuseWrite({
        confidence: 'no_match',
        note: `search_key '${llmSearchKey}' did not match any active search.`,
        decidedBy: 'llm',
        searchKey: llmSearchKey,
      });
    }

    if (llmSearchId && llmSearchId !== canonicalSearchId) {
      console.warn(
        `[pipeline/iv] V2 search_id hallucination: llm_search_id=${llmSearchId} ` +
          `disagrees with canonical=${canonicalSearchId} for search_key=${llmSearchKey}, ` +
          `candidate=${env.candidate?.candidate_name}, ` +
          `granola=${rawPayload.granola_title}. Using canonical.`
      );
    }

    // Deterministic cross-check — when the title map and the LLM resolution
    // disagree, neither can be trusted (9 Jun 2026: Managed Access interviews
    // resolved to cgn-bdd at high confidence while the card was built from
    // cgn-ma-bd's config). Treat as ambiguous: no client-visible write; the
    // disambiguation email names both candidate searches.
    if (detHit && detHit.search_key !== llmSearchKey) {
      console.warn(
        `[pipeline/iv] V2 deterministic conflict: title map says '${detHit.search_key}' ` +
          `(${detHit.client}: ${detHit.rule}) but LLM resolved '${llmSearchKey}' at high ` +
          `confidence. candidate=${env.candidate?.candidate_name}, ` +
          `granola=${rawPayload.granola_title}. Refusing write.`
      );
      return refuseWrite({
        confidence: 'ambiguous',
        note:
          `Deterministic title map ('${detHit.search_key}' — ${detHit.client}: ` +
          `${detHit.rule}) disagrees with the LLM resolution ('${llmSearchKey}'). ` +
          `Refusing the write; re-fire once the correct search is confirmed.`,
        decidedBy: 'conflict',
        searchKey: llmSearchKey,
        alternatives: [llmSearchKey, detHit.search_key],
      });
    }

    v2DecidedBy = detHit ? 'deterministic+llm' : 'llm';

    // Resolution audit object — persisted onto edc_data.resolution (create
    // AND merge paths) so misroutes can be diagnosed post-hoc. The LLM's
    // emitted UUID is kept here as evidence only; targeting uses canonical.
    v2Resolution = {
      search_key: llmSearchKey,
      search_id_as_emitted: llmSearchId,
      canonical_search_id: canonicalSearchId,
      resolution_confidence: v2ResolutionConfidence,
      resolution_note: v2ResolutionNote,
      resolution_alternatives: llmAlternatives,
      decided_by: v2DecidedBy,
    };

    // High confidence + verified — flatten the envelope onto the V1-shape
    // contract so the rest of the handler (merge logic, raw passthrough,
    // derived columns) runs unmodified. The LLM's search_id is discarded;
    // canonicalSearchId is the only id from here on.
    payload = {
      search_id: canonicalSearchId,
      search_key: llmSearchKey,
      candidate_name: env.candidate?.candidate_name,
      edc_data: env.edc_data,
      consultant: rawPayload.consultant,
      granola_title: rawPayload.granola_title,
      eds_date: rawPayload.eds_date,
      raw_transcript: rawPayload.raw_transcript,
      raw_enhanced_notes: rawPayload.raw_enhanced_notes,
      raw_manual_notes: rawPayload.raw_manual_notes,
      sharepoint_url: rawPayload.sharepoint_url,
      invenias_note_id: rawPayload.invenias_note_id,
      flash_summary:
        rawPayload.flash_summary ??
        (env.edc_data?.flash_summary as string | undefined) ??
        null,
    };
  }

  const {
    search_id,
    search_key,
    candidate_name,
    edc_data,
    consultant,
    granola_title,
    eds_date,
    raw_transcript,
    raw_enhanced_notes,
    raw_manual_notes,
    sharepoint_url,
    invenias_note_id,
    flash_summary,
  } = payload;

  if (!search_id || !candidate_name || !edc_data) {
    return NextResponse.json(
      { error: 'Missing required fields: search_id, candidate_name, edc_data' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Generate slug from candidate name
  const slug = slugify(candidate_name);

  // Generate initials
  const parts = candidate_name.split(' ');
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : candidate_name.slice(0, 2).toUpperCase();

  // ─── ENGINE-SAFE MERGE ──────────────────────────────────────────────────
  // Look up existing row first. If it exists, we must respect
  // manually_edited_fields and never reset generation_version.
  const { data: existingRaw, error: lookupError } = await supabase
    .from('candidates')
    .select(
      'id, candidate_name, candidate_slug, edc_data, manually_edited_fields, generation_version, ' +
        'headline, current_title, current_company, location, flash_summary, ' +
        'compensation_alignment, deck_status, our_take, our_take_source'
    )
    .eq('search_id', search_id)
    .eq('candidate_slug', slug)
    .maybeSingle();

  if (lookupError) {
    console.error('[pipeline/iv] lookup error:', lookupError);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  // Cast to a known shape — Supabase's generic inference returns a union
  // including GenericStringError until generated types are wired in.
  type ExistingCandidate = {
    id: string;
    candidate_name: string | null;
    candidate_slug: string;
    edc_data: Record<string, unknown> | null;
    manually_edited_fields: string[] | null;
    generation_version: number | null;
    headline: string | null;
    current_title: string | null;
    current_company: string | null;
    location: string | null;
    flash_summary: string | null;
    compensation_alignment: string | null;
    deck_status: string | null;
    our_take: unknown;
    our_take_source: string | null;
  };
  const existing = existingRaw as ExistingCandidate | null;

  const isNewCandidate = !existing;
  const manuallyEdited: string[] = existing?.manually_edited_fields ?? [];
  const editedSet = new Set(manuallyEdited);
  const existingEdc = (existing?.edc_data ?? null) as Record<string, unknown> | null;
  const nextVersion = (existing?.generation_version ?? 0) + 1;

  // Normalize the Engine output before it becomes the edc_data baseline:
  // the prompt forbids the "Motivation — " prefix and scope-label concat,
  // but prompt rules are probabilistic (observed leak: 1 in 6 post-patch
  // generations). ai_generated_edc below deliberately keeps the RAW Engine
  // output — it is the audit record of what the Engine actually emitted.
  const cleanedEngineEdc = normalizeEdcData(
    edc_data as unknown as EDCData
  ) as unknown as Record<string, unknown>;

  // Build the merged edc_data JSONB. Engine's incoming edc_data is the baseline;
  // any field the consultant has edited keeps its existing value.
  const mergedEdcData = mergeEdcData(
    cleanedEngineEdc,
    existingEdc,
    manuallyEdited
  );

  // Persist the resolution audit object (V2 only). Lives in edc_data, not
  // ai_generated_edc — the latter stays a pristine copy of Engine output.
  if (v2Resolution) {
    mergedEdcData.resolution = v2Resolution;
  }

  // Engine-derived headline fallback (only used when consultant hasn't edited
  // headline AND incoming doesn't supply one).
  const engineHeadline =
    (edc_data.headline as string | undefined) ||
    `${edc_data.current_title || ''} at ${edc_data.current_company || ''}`;

  // Build the row to write. Engine values go in first; mirrored top-level
  // columns flip to existing values for any field marked manually edited.
  const row: Record<string, unknown> = {
    search_id,
    candidate_name:
      editedSet.has('candidate_name') && existing
        ? ((existing.candidate_name as string | undefined) ?? candidate_name)
        : candidate_name,
    candidate_slug: slug,
    initials,
    current_title: edc_data.current_title || '',
    current_company: edc_data.current_company || '',
    location: edc_data.location || '',
    headline: engineHeadline,
    flash_summary:
      (edc_data.flash_summary as string | null | undefined) ??
      flash_summary ??
      null,
    compensation_alignment: edc_data.compensation_alignment || 'not_set',
    edc_data: mergedEdcData,
    ai_generated_edc: edc_data, // always overwrite — pristine Engine copy
    manually_edited_fields: manuallyEdited, // preserve, never reset
    generation_version: nextVersion, // monotonic increment
    // New candidates land hidden ('none') — a freshly-interviewed candidate
    // must not be client-visible before consultant review. Forward-only:
    // existing rows keep whatever status the consultant set.
    deck_status: isNewCandidate
      ? 'none'
      : ((existing?.deck_status as string | null) ?? 'none'),
    data_status: isNewCandidate ? 'draft' : undefined,
  };

  // Optional metadata fields. For new candidates, set with sensible defaults.
  // For existing candidates, only overwrite when the Engine actually sends a
  // value — never null out raw_transcript/manual_notes/sharepoint_url etc.
  // just because this particular Engine run didn't pass them through.
  if (isNewCandidate) {
    row.consultant = consultant || null;
    row.granola_title = granola_title || null;
    row.eds_date = eds_date || new Date().toISOString();
    row.raw_transcript = raw_transcript || null;
    row.raw_enhanced_notes = raw_enhanced_notes || null;
    row.raw_manual_notes = raw_manual_notes || null;
    row.sharepoint_url = sharepoint_url || null;
    row.invenias_note_id = invenias_note_id || null;
  } else {
    if (consultant) row.consultant = consultant;
    if (granola_title) row.granola_title = granola_title;
    if (eds_date) row.eds_date = eds_date;
    if (raw_transcript) row.raw_transcript = raw_transcript;
    if (raw_enhanced_notes) row.raw_enhanced_notes = raw_enhanced_notes;
    if (raw_manual_notes) row.raw_manual_notes = raw_manual_notes;
    if (sharepoint_url) row.sharepoint_url = sharepoint_url;
    if (invenias_note_id) row.invenias_note_id = invenias_note_id;
  }

  // For each derived top-level column, restore the existing value if the
  // corresponding edc_data field is in manually_edited_fields. This keeps
  // the mirror in sync with the consultant's intent.
  if (existing) {
    for (const { edcField, column } of DERIVED_COLUMNS) {
      if (editedSet.has(edcField)) {
        const preserved = (existing as Record<string, unknown>)[column];
        if (preserved !== undefined && preserved !== null) {
          row[column] = preserved;
        }
      }
    }

    // our_take — special-cased because shape varies. If consultant edited
    // our_take, keep both the existing top-level column AND the existing
    // edc_data.our_take (already preserved by mergeEdcData).
    if (editedSet.has('our_take')) {
      row.our_take = existing.our_take;
      row.our_take_source = existing.our_take_source;
    }
  }

  // Strip `undefined` values so upsert doesn't write nulls into a fresh row
  // (data_status was deliberately undefined for existing rows to preserve state).
  for (const k of Object.keys(row)) {
    if (row[k] === undefined) delete row[k];
  }

  const { data, error } = await supabase
    .from('candidates')
    .upsert(row, {
      onConflict: 'search_id,candidate_name',
      ignoreDuplicates: false,
    })
    .select('id, candidate_slug')
    .single();

  if (error) {
    console.error('[pipeline/iv] upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── NARRATIVE SPLIT (transitional dual-write) ─────────────────────────
  // V2 IV envelope carries edc_data.narrative — a structured long-form
  // assessment that lives in its own table (candidate_narratives) so
  // consultant edits can persist independently of card-side edits and the
  // narrative_generation_version stays separate from candidates.generation_version.
  //
  // DUAL-WRITE for safe transition: we DO NOT strip narrative from edc_data
  // until Phase 5 cleanup commit ships (a few days after this lands). That
  // way, the read fallback in NarrativeTab via edc_data.narrative continues
  // to work for any candidate whose write happens before NarrativeTab's
  // READ_FROM_NARRATIVE_TABLE flag flip propagates.
  const incomingNarrativeFull = (edc_data as { narrative?: Record<string, unknown> | null })
    .narrative ?? null;

  if (incomingNarrativeFull) {
    const { our_take_narrative, our_take_source, ...incomingNarrativeData } =
      incomingNarrativeFull as {
        our_take_narrative?: { text?: string } | null;
        our_take_source?: string | null;
        [k: string]: unknown;
      };

    const { data: existingNarrativeRaw } = await supabase
      .from('candidate_narratives')
      .select(
        'narrative_data, narrative_manually_edited_fields, narrative_generation_version, our_take_narrative'
      )
      .eq('candidate_id', data.id)
      .maybeSingle();
    const existingNarrative = existingNarrativeRaw as {
      narrative_data: Record<string, unknown> | null;
      narrative_manually_edited_fields: string[] | null;
      narrative_generation_version: number | null;
      our_take_narrative: { text?: string } | null;
    } | null;

    const narrativeEdits = existingNarrative?.narrative_manually_edited_fields ?? [];
    const narrativeEditsSet = new Set(narrativeEdits);

    // Merge-aware: edited fields preserved, others overwritten by engine.
    const existingNarrativeData = existingNarrative?.narrative_data ?? null;
    const mergedNarrativeData: Record<string, unknown> = { ...incomingNarrativeData };
    if (existingNarrativeData) {
      for (const field of narrativeEdits) {
        if (field in existingNarrativeData) {
          mergedNarrativeData[field] = (existingNarrativeData as Record<string, unknown>)[field];
        }
      }
    }

    // Our Take: if consultant edited it, preserve their version; otherwise
    // take the engine's. The pristine engine output is always written to
    // ai_generated_narrative so reset can revive it.
    const ourTakeEdited =
      narrativeEditsSet.has('our_take_narrative') ||
      narrativeEdits.some((f) => f.startsWith('our_take_narrative.'));
    const finalOurTake = ourTakeEdited
      ? existingNarrative?.our_take_narrative ?? null
      : our_take_narrative ?? null;

    const { error: narrativeErr } = await supabase
      .from('candidate_narratives')
      .upsert(
        {
          candidate_id: data.id,
          search_id,
          narrative_data: mergedNarrativeData,
          // ai_generated_narrative is the pristine engine copy (including
          // our_take_narrative). Reset on Our Take revives from here.
          ai_generated_narrative: incomingNarrativeFull,
          our_take_narrative: finalOurTake,
          our_take_source: our_take_source ?? null,
          narrative_generation_version:
            (existingNarrative?.narrative_generation_version ?? 0) + 1,
        },
        { onConflict: 'candidate_id' }
      );

    if (narrativeErr) {
      // Non-fatal — the candidate row is already written. Log and continue
      // so the IV pipeline doesn't fail the whole envelope on narrative
      // write trouble. The narrative read path still falls back through
      // edc_data.narrative (dual-write).
      console.warn('[pipeline/iv] candidate_narratives upsert warn:', narrativeErr.message);
    }
  }
  // ─── /NARRATIVE SPLIT ──────────────────────────────────────────────────

  console.log(
    `[pipeline/iv] ${isNewCandidate ? 'created' : 'merged'} ${slug}: ` +
      `version ${existing?.generation_version ?? 0}→${nextVersion}, ` +
      `preserved=[${manuallyEdited.join(',') || 'none'}], ` +
      `path=${isV2 ? `v2 decided_by=${v2DecidedBy}` : 'v1'}`
  );

  // Update pipeline_log. V1 path: a prior /api/pipeline/match call left a
  // 'matched' row, so flip it to 'complete'. V2 path: no match step ran, so
  // insert a fresh 'complete' row directly. Idempotent either way — if the
  // update affects zero rows, we insert.
  if (granola_title) {
    const { data: updated, error: logUpdateErr } = await supabase
      .from('pipeline_log')
      .update({ pipeline_status: 'complete' })
      .eq('granola_title', granola_title)
      .eq('pipeline_status', 'matched')
      .select('id');

    if (logUpdateErr) {
      console.warn('[pipeline/iv] pipeline_log update warn:', logUpdateErr.message);
    }

    if (!updated || updated.length === 0) {
      const { error: logInsertErr } = await supabase.from('pipeline_log').insert({
        note_type: 'iv',
        granola_title,
        matched_search_id: search_id,
        matched_search_key: search_key ?? null,
        candidate_name_extracted: candidate_name,
        pipeline_status: 'complete',
      });
      if (logInsertErr) {
        console.warn('[pipeline/iv] pipeline_log insert warn:', logInsertErr.message);
      }
    }
  }

  return NextResponse.json({
    success: true,
    candidate_id: data.id,
    candidate_slug: data.candidate_slug,
    candidate_name,
    search_key: search_key || null,
    search_name:
      v2SearchName ?? ((edc_data?.search_name as string | undefined) ?? null),
    disambiguation_needed: false,
    decided_by: v2DecidedBy,
    merged: !isNewCandidate,
    generation_version: nextVersion,
    preserved_fields: manuallyEdited,
  });
}

// PATCH — update an existing candidate with SharePoint URL / Invenias ID
export async function PATCH(req: NextRequest) {
  if (!validatePipelineAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { candidate_id, sharepoint_url, invenias_note_id } = await req.json();

  if (!candidate_id) {
    return NextResponse.json({ error: 'Missing candidate_id' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const updates: Record<string, string> = {};
  if (sharepoint_url) updates.sharepoint_url = sharepoint_url;
  if (invenias_note_id) updates.invenias_note_id = invenias_note_id;

  const { error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', candidate_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
