/**
 * Phantom-candidate guard for the IV ingest pipeline.
 *
 * A re-sent job-spec (Granola "JS" note) that mis-fires through the IV engine
 * arrives shaped like a candidate but isn't one — name "JS" (or empty), title
 * and company both "Not mentioned". Writing it creates a phantom card that is
 * only invisible because of the deck_status='none' default.
 *
 * detectJobSpecIngest() is the pure predicate: the route skips the candidate
 * write (and logs to pipeline_log) when it returns skip=true. It is
 * deliberately conservative — a borderline real candidate must pass through.
 * All I/O (logging, DB) stays in the route.
 */

/** Stable, greppable reasons — surfaced in the API response and pipeline_log.error_message. */
export type PhantomSkipReason =
  | 'empty_candidate_name'
  | 'candidate_name_is_js'
  | 'granola_title_js_prefix'
  | 'no_title_no_company';

export type PhantomGuardResult =
  | { skip: false; reason: null }
  | { skip: true; reason: PhantomSkipReason };

/** Whole name is "JS" (any case, surrounding whitespace allowed). */
const JS_NAME_RE = /^\s*js\s*$/i;

/** Title starts "JS" followed by a hyphen, en dash, or em dash — the Granola job-spec note convention. */
const JS_TITLE_PREFIX_RE = /^\s*js\s*[-–—]/i;

/** Only the Engine's exact missing-field sentinel — NOT "Not available"/"N/A" (conservative). */
const NOT_MENTIONED_RE = /^not mentioned$/i;

function isEmptyish(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== 'string') return false; // non-string values count as present
  const trimmed = v.trim();
  return trimmed === '' || NOT_MENTIONED_RE.test(trimmed);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function detectJobSpecIngest(input: {
  candidate_name?: unknown;
  granola_title?: unknown;
  edc_data?: unknown;
}): PhantomGuardResult {
  const { candidate_name, granola_title, edc_data } = input;

  // Absent/malformed edc_data is a malformed payload, not a job-spec — let the
  // route's existing required-fields 400 own it so breakage stays loud.
  if (!isPlainObject(edc_data)) {
    return { skip: false, reason: null };
  }

  if (typeof candidate_name !== 'string' || candidate_name.trim() === '') {
    return { skip: true, reason: 'empty_candidate_name' };
  }
  if (JS_NAME_RE.test(candidate_name)) {
    return { skip: true, reason: 'candidate_name_is_js' };
  }
  if (typeof granola_title === 'string' && JS_TITLE_PREFIX_RE.test(granola_title)) {
    return { skip: true, reason: 'granola_title_js_prefix' };
  }

  if (isEmptyish(edc_data.current_title) && isEmptyish(edc_data.current_company)) {
    return { skip: true, reason: 'no_title_no_company' };
  }

  return { skip: false, reason: null };
}
