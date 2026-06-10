/**
 * Shared candidate-regenerate logic (v1.3 MVP).
 *
 * Used by both the per-candidate route and the bulk regenerate-all route. Reads the
 * search Brief + candidate row, calls Anthropic with the EDC prompt, validates the
 * JSON response, and writes it back to Supabase respecting `manually_edited_fields`
 * (top-level only, matching pipeline/iv merge semantics).
 *
 * Conflicts: fields the consultant has edited where the new AI output differs.
 * The consultant's value stays in `edc_data`; the fresh AI value lands in
 * `ai_generated_edc` so the Review Changes modal can render both sides.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceClient } from '@/lib/supabase';
import {
  REGENERATE_EDC_PROMPT,
  buildRegenerationUserMessage,
  type RegenerationSearchRow,
  type RegenerationCandidateRow,
} from '@/lib/regenerate-edc-prompt';

const REGENERATE_MODEL = 'claude-sonnet-4-6';
const REGENERATE_MAX_TOKENS = 8192;

// Mirror of DERIVED_COLUMNS in src/app/api/pipeline/iv/route.ts. Top-level
// candidate columns derived from edc_data — when the field is in
// manually_edited_fields, restore the existing top-level value instead of
// taking the AI's.
const DERIVED_COLUMNS: Array<{ edcField: string; column: string }> = [
  { edcField: 'current_title', column: 'current_title' },
  { edcField: 'current_company', column: 'current_company' },
  { edcField: 'location', column: 'location' },
  { edcField: 'headline', column: 'headline' },
  { edcField: 'flash_summary', column: 'flash_summary' },
  { edcField: 'compensation_alignment', column: 'compensation_alignment' },
  { edcField: 'status', column: 'deck_status' },
];

export interface RegenerateOptions {
  /** If false, keep the existing edc_data.our_take untouched even if no manual edit flag.
   *  Default: true (regenerate Our Take alongside the rest). */
  include_our_take?: boolean;
  /** If true, AI output overwrites manually-edited fields without conflict flagging.
   *  Default: false. */
  override_manual_edits?: boolean;
}

export interface RegenerateConflict {
  field: string;
  field_label: string;
  consultant_value: unknown;
  ai_value: unknown;
}

export type RegenerateResult =
  | {
      ok: true;
      status: 200;
      candidate_id: string;
      candidate_slug: string;
      candidate_name: string;
      generation_version: number;
      ai_generated_edc: Record<string, unknown>;
      merged_edc_data: Record<string, unknown>;
      conflicts: RegenerateConflict[];
    }
  | {
      ok: false;
      status: 404 | 422 | 500;
      error: string;
      candidate_slug?: string;
    };

// Map field names to human-readable labels for the Review Changes modal.
const FIELD_LABELS: Record<string, string> = {
  key_criteria: 'Key Criteria',
  scope_match: 'Scope Match',
  scope_seasoning: 'Scope Narrative',
  compensation: 'Compensation',
  why_interested: 'Why Interested',
  our_take: 'Our Take',
  motivation_hook: 'Motivation Hook',
  headline: 'Headline',
  flash_summary: 'Flash Summary',
  current_title: 'Current Title',
  current_company: 'Current Company',
  location: 'Location',
  notice_period: 'Notice Period',
  earliest_start_date: 'Earliest Start Date',
  potential_concerns: 'Potential Concerns',
  miscellaneous: 'Miscellaneous',
  candidate_name: 'Candidate Name',
};

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function getApiKey(): string {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey;

  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ANTHROPIC_API_KEY=')) {
        const val = trimmed.slice('ANTHROPIC_API_KEY='.length).trim();
        if (val.length > 0) return val;
      }
    }
  } catch {
    /* .env.local missing */
  }

  throw new Error('ANTHROPIC_API_KEY is not configured');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateAiOutput(parsed: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; reason: string } {
  if (!isPlainObject(parsed)) return { ok: false, reason: 'response is not an object' };
  const kc = parsed.key_criteria;
  if (!Array.isArray(kc) || kc.length === 0) return { ok: false, reason: 'key_criteria missing or empty' };
  for (const c of kc) {
    if (!isPlainObject(c) || typeof c.name !== 'string' || typeof c.evidence !== 'string') {
      return { ok: false, reason: 'key_criteria items must have name+evidence strings' };
    }
  }
  if (!Array.isArray(parsed.scope_match)) return { ok: false, reason: 'scope_match must be an array' };
  if (!isPlainObject(parsed.compensation)) return { ok: false, reason: 'compensation must be an object' };
  if (!Array.isArray(parsed.why_interested)) return { ok: false, reason: 'why_interested must be an array' };
  return { ok: true, data: parsed };
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response');
  return JSON.parse(match[0]);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface ExistingCandidate {
  id: string;
  candidate_name: string;
  candidate_slug: string;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  edc_data: Record<string, unknown> | null;
  ai_generated_edc: Record<string, unknown> | null;
  manually_edited_fields: string[] | null;
  generation_version: number | null;
  headline: string | null;
  flash_summary: string | null;
  compensation_alignment: string | null;
  deck_status: string | null;
  our_take: unknown;
  our_take_source: string | null;
  raw_manual_notes: string | null;
  raw_transcript: string | null;
  raw_enhanced_notes: string | null;
  primary_industry: string | null;
  years_in_current_role: string | number | null;
  years_at_current_company: string | number | null;
  total_team_size: string | number | null;
  compensation_current_total: string | null;
  compensation_expected_total: string | null;
  compensation_flexibility: string | null;
  notice_period: string | null;
  earliest_start_date: string | null;
}

export async function regenerateCandidate(
  searchKey: string,
  candidateSlug: string,
  options: RegenerateOptions = {},
): Promise<RegenerateResult> {
  const includeOurTake = options.include_our_take !== false;
  const overrideManualEdits = options.override_manual_edits === true;

  const supabase = getServiceClient();

  // 1. Resolve search by key. Use select('*') to avoid PostgREST column-name
  // validation against a possibly-stale schema cache (matches supabase-data.ts).
  const { data: search, error: searchErr } = await supabase
    .from('searches')
    .select('*')
    .eq('search_key', searchKey)
    .maybeSingle();

  if (searchErr || !search) {
    console.error('[regenerate] search lookup failed for', searchKey, '— err:', searchErr, 'data:', search);
    return { ok: false, status: 404, error: `Search "${searchKey}" not found`, candidate_slug: candidateSlug };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchRow = search as any;

  // 2. Load candidate (select * for the same reason)
  const { data: candidateRaw, error: candErr } = await supabase
    .from('candidates')
    .select('*')
    .eq('search_id', searchRow.id)
    .eq('candidate_slug', candidateSlug)
    .maybeSingle();

  if (candErr || !candidateRaw) {
    return { ok: false, status: 404, error: `Candidate "${candidateSlug}" not found in search "${searchKey}"`, candidate_slug: candidateSlug };
  }
  const candidate = candidateRaw as unknown as ExistingCandidate;

  // 3. Guard — must have raw_manual_notes to regenerate against
  if (!candidate.raw_manual_notes || candidate.raw_manual_notes.trim().length === 0) {
    return { ok: false, status: 422, error: 'Candidate has no raw notes to regenerate from.', candidate_slug: candidateSlug };
  }

  // 4. Build prompt + call Anthropic
  const searchPromptRow: RegenerationSearchRow = {
    position: searchRow.position,
    client_display_name: searchRow.client_display_name,
    client: searchRow.client,
    location: searchRow.location,
    industry: searchRow.industry,
    role_title: searchRow.role_title,
    line_manager: searchRow.line_manager,
    core_mission: searchRow.core_mission,
    remit: searchRow.remit,
    why_open: searchRow.why_open,
    key_responsibilities: searchRow.key_responsibilities,
    budget_base: searchRow.budget_base,
    budget_bonus: searchRow.budget_bonus,
    budget_lti: searchRow.budget_lti,
    budget_di: searchRow.budget_di,
    budget_benefits: searchRow.budget_benefits,
    budget_total: searchRow.budget_total,
    key_criteria: searchRow.key_criteria,
    scope_match_dimensions: searchRow.scope_match_dimensions,
    red_flag_title: searchRow.red_flag_title,
    red_flag_detail: searchRow.red_flag_detail,
    candidate_messaging: searchRow.candidate_messaging,
    confidentiality: searchRow.confidentiality,
    notes: searchRow.notes,
  };

  const candidatePromptRow: RegenerationCandidateRow = {
    candidate_name: candidate.candidate_name,
    current_title: candidate.current_title,
    current_company: candidate.current_company,
    location: candidate.location,
    primary_industry: candidate.primary_industry,
    years_in_current_role: candidate.years_in_current_role,
    years_at_current_company: candidate.years_at_current_company,
    total_team_size: candidate.total_team_size,
    compensation_current_total: candidate.compensation_current_total,
    compensation_expected_total: candidate.compensation_expected_total,
    compensation_flexibility: candidate.compensation_flexibility,
    notice_period: candidate.notice_period,
    earliest_start_date: candidate.earliest_start_date,
    raw_manual_notes: candidate.raw_manual_notes,
    raw_transcript: candidate.raw_transcript,
    raw_enhanced_notes: candidate.raw_enhanced_notes,
  };

  const userMessage = buildRegenerationUserMessage(searchPromptRow, candidatePromptRow);
  const composed = `${REGENERATE_EDC_PROMPT}\n\n---\n\n${userMessage}`;

  let aiText: string;
  try {
    const client = new Anthropic({ apiKey: getApiKey() });
    const response = await client.messages.create({
      model: REGENERATE_MODEL,
      max_tokens: REGENERATE_MAX_TOKENS,
      messages: [{ role: 'user', content: composed }],
    });
    aiText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!aiText) {
      return { ok: false, status: 500, error: 'Anthropic returned empty text', candidate_slug: candidateSlug };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[regenerate] Anthropic call failed:', msg);
    return { ok: false, status: 500, error: `Anthropic call failed: ${msg}`, candidate_slug: candidateSlug };
  }

  // 5. Parse + validate
  let parsed: unknown;
  try {
    parsed = extractJson(aiText);
  } catch (err) {
    console.error('[regenerate] JSON parse failed for', candidateSlug, '— raw text:', aiText.slice(0, 500));
    return { ok: false, status: 500, error: `Failed to parse model JSON: ${(err as Error).message}`, candidate_slug: candidateSlug };
  }

  const validation = validateAiOutput(parsed);
  if (!validation.ok) {
    console.error('[regenerate] Validation failed for', candidateSlug, '— reason:', validation.reason);
    return { ok: false, status: 500, error: `AI output failed validation: ${validation.reason}`, candidate_slug: candidateSlug };
  }
  const aiOutput = validation.data;

  // Belt-and-suspenders: overwrite generated_date with server timestamp.
  aiOutput.generated_date = new Date().toISOString().slice(0, 10);
  // Always carry forward the search/role metadata from the Brief so we don't
  // depend on the model reproducing them correctly.
  aiOutput.search_name = searchRow.client_display_name || searchRow.client || aiOutput.search_name || '';
  aiOutput.role_title = searchRow.role_title || searchRow.position || aiOutput.role_title || '';

  // 6. Compute conflicts + merged edc_data
  const existingEdc: Record<string, unknown> = candidate.edc_data ?? {};
  const manuallyEdited: string[] = candidate.manually_edited_fields ?? [];
  const editedSet = new Set(manuallyEdited);

  const conflicts: RegenerateConflict[] = [];
  const mergedEdc: Record<string, unknown> = { ...aiOutput };

  for (const field of Object.keys(aiOutput)) {
    if (!includeOurTake && field === 'our_take') {
      // Keep existing our_take in edc_data even though aiOutput has a new one.
      // The new value still lands in ai_generated_edc for audit.
      if ('our_take' in existingEdc) {
        mergedEdc.our_take = existingEdc.our_take;
      }
      continue;
    }

    if (!overrideManualEdits && editedSet.has(field)) {
      const before = existingEdc[field];
      const after = aiOutput[field];
      if (!deepEqual(before, after)) {
        conflicts.push({
          field,
          field_label: labelFor(field),
          consultant_value: before,
          ai_value: after,
        });
        // Keep the consultant's value in edc_data.
        mergedEdc[field] = before;
      }
    }
  }

  // Any field present in existing edc_data but not produced by the model should
  // be preserved (don't drop consultant-only fields like miscellaneous, status,
  // photo_url, linkedin_url that the AI prompt doesn't generate).
  for (const field of Object.keys(existingEdc)) {
    if (!(field in mergedEdc)) {
      mergedEdc[field] = existingEdc[field];
    }
  }

  // 7. Build top-level UPDATE payload, mirroring derived columns the same way
  // pipeline/iv does — if the field was manually edited, keep the existing column.
  const nextVersion = (candidate.generation_version ?? 0) + 1;

  const update: Record<string, unknown> = {
    edc_data: mergedEdc,
    ai_generated_edc: aiOutput,
    manually_edited_fields: manuallyEdited,
    generation_version: nextVersion,
    updated_at: new Date().toISOString(),
    current_title: (aiOutput.current_title as string) || candidate.current_title || '',
    current_company: (aiOutput.current_company as string) || candidate.current_company || '',
    location: (aiOutput.location as string) || candidate.location || '',
    headline: (aiOutput.headline as string) || candidate.headline || '',
    flash_summary: (aiOutput.flash_summary as string | null | undefined) ?? candidate.flash_summary ?? null,
    compensation_alignment: (aiOutput.compensation_alignment as string) || candidate.compensation_alignment || 'not_set',
  };

  for (const { edcField, column } of DERIVED_COLUMNS) {
    if (editedSet.has(edcField)) {
      const preserved = (candidate as unknown as Record<string, unknown>)[column];
      if (preserved !== undefined && preserved !== null) {
        update[column] = preserved;
      }
    }
  }

  // our_take mirror — only update top-level our_take column when the consultant
  // hasn't edited it (matches edits/save's mirroring logic).
  if (!editedSet.has('our_take') && includeOurTake) {
    const ot = (aiOutput.our_take as unknown);
    const otText = typeof ot === 'string' ? ot : isPlainObject(ot) && typeof ot.text === 'string' ? ot.text : null;
    if (otText !== null) {
      update.our_take = otText;
    }
  } else if (editedSet.has('our_take')) {
    update.our_take = candidate.our_take;
    update.our_take_source = candidate.our_take_source;
  }

  // 8. UPDATE
  const { error: updateErr } = await supabase
    .from('candidates')
    .update(update)
    .eq('id', candidate.id);

  if (updateErr) {
    console.error('[regenerate] update failed for', candidateSlug, updateErr);
    return { ok: false, status: 500, error: `DB update failed: ${updateErr.message}`, candidate_slug: candidateSlug };
  }

  // 9. Audit row — fire-and-forget; audit failure does NOT roll back the regenerate.
  try {
    await supabase.from('regeneration_jobs').insert({
      search_id: searchRow.id,
      candidate_id: candidate.id,
      job_type: 'candidate_regenerate',
      status: 'completed',
      requested_by: 'portal',
      requested_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      options: { include_our_take: includeOurTake, override_manual_edits: overrideManualEdits },
      result: {
        conflicts: conflicts.map((c) => c.field),
        new_generation_version: nextVersion,
        model: REGENERATE_MODEL,
      },
    });
  } catch (err) {
    // Audit table may not be migrated on every environment. Log + continue.
    console.warn('[regenerate] audit insert failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  console.log(
    `[regenerate] ${candidateSlug}: version ${candidate.generation_version ?? 0}→${nextVersion}, ` +
      `conflicts=[${conflicts.map((c) => c.field).join(',') || 'none'}], preserved=[${manuallyEdited.join(',') || 'none'}]`,
  );

  return {
    ok: true,
    status: 200,
    candidate_id: candidate.id,
    candidate_slug: candidate.candidate_slug,
    candidate_name: candidate.candidate_name,
    generation_version: nextVersion,
    ai_generated_edc: aiOutput,
    merged_edc_data: mergedEdc,
    conflicts,
  };
}
