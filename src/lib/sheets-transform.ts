/* eslint-disable @typescript-eslint/no-unused-vars */
import type { EDCData, SearchContext, IntroCardData } from './types';
import type { SheetRow } from './sheets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get a value by column header name, with fallback. */
function getVal(row: SheetRow, key: string, fallback = 'Not mentioned'): string {
  return row[key]?.trim() || fallback;
}

/** Get a value by column index position (0-based). */
function getByIndex(row: SheetRow, index: number, fallback = ''): string {
  const values = Object.values(row);
  return values[index]?.trim() || fallback;
}

/** Generate a URL-safe candidate slug from a full name. e.g. "Christopher Snider" → "c-snider" */
export function nameToCandidateId(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const first = parts[0][0].toLowerCase();
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${first}-${last}`;
}

/** Check if a candidate slug matches a name. */
export function candidateIdMatchesName(candidateId: string, candidateName: string): boolean {
  return nameToCandidateId(candidateName) === candidateId.toLowerCase().trim();
}

/** Derive initials from a full name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── EDS Column Index Map ─────────────────────────────────────────────────────
// Based on Make Engine blueprint ({{5.`N`}} references):
// 0: search_key        1: candidate_name      2: current_title
// 3: current_company   4: location            5: years_in_current_role
// 6: years_at_company  7: total_team_size      8: criteria_source
// 9: primary_industry  10: compensation_current_total
// 11: compensation_expected_total              12: compensation_flexibility
// 13: notice_period    14: earliest_start_date 15: timeline_constraints
// 16: key_concern      17: key_strength        18: our_take
// 19: our_take_source  20: execflow_ai_assessment
// 21: eds_scope_match_dimensions               22: job_summary_used
// 23: candidate_overview                       24: key_criteria_assessment
// 25: consultant_name  26: granola_title        27: eds_date

// ─── JS Column Index Map ──────────────────────────────────────────────────────
// 0: search_name       1: search_key          2: search_lead
// 3: client_name       4: client_location
// Criteria groups at 9, 12, 15, 18, 21 (name / detail / weight per group)
// Budget at 34-37: base, bonus, mip_lti, di
// 43: scope_match_dimensions

// ─── Key Criteria Parsing ────────────────────────────────────────────────────

function parseKeyCriteria(
  criteriaText: string,
  jsCriteriaNames: string[]
): EDCData['key_criteria'] {
  // If no criteria names from JS, parse text for numbered items
  const names = jsCriteriaNames.length > 0
    ? jsCriteriaNames
    : extractNamesFromText(criteriaText);

  if (!criteriaText || criteriaText === 'Not mentioned') {
    return names.map((name) => ({ name, evidence: 'Not mentioned' }));
  }

  // Split by numbered blocks: "1.", "2.", etc.
  const blocks = criteriaText.split(/(?=\d+\.\s)/).filter((b) => b.trim());

  return names.map((name, i) => {
    const block = blocks[i] || '';
    // Strip leading "N. Criterion Name: " or "N. " prefix
    const evidence = block
      .replace(/^\d+\.\s*[^:\n]+:\s*/, '')  // "1. Name: ..."
      .replace(/^\d+\.\s*/, '')              // "1. ..."
      .trim() || 'Not mentioned';

    // Extract context anchor — look for "at CompanyName" pattern
    const atMatch = evidence.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40?})(?=\s+in|\s+for|\s+from|\s+during|[.,]|\s+he|\s+she|\s+they|\s+and)/);
    const contextAnchor = atMatch ? `at ${atMatch[1].trim()}` : undefined;

    return { name, evidence, context_anchor: contextAnchor };
  });
}

function extractNamesFromText(text: string): string[] {
  const matches = text.match(/^\d+\.\s*([^:\n]+)/gm) || [];
  return matches.map((m) => m.replace(/^\d+\.\s*/, '').split(':')[0].trim()).filter(Boolean);
}

// ─── Scope Match Parsing ─────────────────────────────────────────────────────

function parseScopeMatch(edsScopeText: string): EDCData['scope_match'] {
  if (!edsScopeText || edsScopeText === 'Not mentioned') return [];
  return edsScopeText
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((dim) => {
      const parts = dim.split(':').map((p) => p.trim());
      return {
        scope: parts[0] || dim,
        candidate_actual: parts[1] || 'Not assessed',
        role_requirement: parts[2] || 'Not specified',
        alignment: 'not_assessed' as const,
      };
    });
}

// ─── Concerns Parsing ────────────────────────────────────────────────────────

function parseConcerns(concernText: string): EDCData['potential_concerns'] {
  if (!concernText || concernText === 'Not mentioned') return [];
  return concernText
    .split(/[;\n]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((concern) => ({ concern, severity: 'development' as const }));
}

// ─── Motivation Parsing ──────────────────────────────────────────────────────

function parseMotivation(overviewText: string): EDCData['why_interested'] {
  if (!overviewText || overviewText === 'Not mentioned') return [];
  // Return as a single pull item — the full overview is too rich to auto-parse
  // This is a bridge until pre-transformed EDC data is available
  return [{ type: 'pull' as const, headline: 'See candidate overview', detail: overviewText.slice(0, 200) }];
}

// ─── Today's Date ────────────────────────────────────────────────────────────

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Main Transform ──────────────────────────────────────────────────────────

/**
 * Transform EDS + JS sheet rows into a full EDCData object.
 * Column access is position-based (index) for resilience against header name variation.
 * After the first test run, verify console logs of raw headers and adjust indices as needed.
 */
export function transformToEDCData(
  edsRow: SheetRow,
  jsRow: SheetRow | null,
  searchId: string
): EDCData {
  const eds = Object.values(edsRow);
  const js = jsRow ? Object.values(jsRow) : [];

  // JS criteria names: groups at indices 9, 12, 15, 18, 21 (name is first in each group)
  const jsCriteriaNames: string[] = [];
  for (let i = 9; i <= 21; i += 3) {
    const name = js[i]?.trim();
    if (name) jsCriteriaNames.push(name);
  }

  // Budget from JS indices 34–37
  const budgetParts = [
    js[34] ? `Base: ${js[34]}` : null,
    js[35] ? `Bonus: ${js[35]}` : null,
    js[36] ? `MIP/LTI: ${js[36]}` : null,
    js[37] ? `DI: ${js[37]}` : null,
  ].filter(Boolean) as string[];

  return {
    // Header
    candidate_name: eds[1] || 'Unknown',
    current_title: eds[26] || eds[2] || 'Not mentioned',   // granola_title preferred
    current_company: eds[3] || 'Not mentioned',
    location: eds[4] || 'Not mentioned',

    // Scope Match
    scope_match: parseScopeMatch(eds[21] || ''),
    scope_seasoning: undefined,

    // Key Criteria
    key_criteria: parseKeyCriteria(eds[24] || '', jsCriteriaNames),

    // Compensation
    compensation: {
      current_base: 'Not mentioned',
      current_total: eds[10] || 'Not mentioned',
      expected_base: 'Not mentioned',
      expected_total: eds[11] || 'Not mentioned',
      flexibility: eds[12] || 'Not mentioned',
      budget_range: budgetParts.length > 0 ? budgetParts.join(' · ') : undefined,
    },
    notice_period: eds[13] || 'Not mentioned',
    earliest_start_date: eds[14] || 'Not mentioned',

    // Motivation
    why_interested: parseMotivation(eds[23] || ''),

    // Concerns
    potential_concerns: parseConcerns(eds[16] || ''),

    // Our Take
    // eds[18] = our_take (polished text from Make Engine)
    // eds[19] = our_take_source (raw consultant notes — consultant-only)
    our_take: {
      text: eds[18] || '',
      original_note: eds[19] || undefined,
      ai_rationale: undefined,  // populated by Make Engine in future; see Step 10 notes
    },

    // Meta
    search_name: js[0] || eds[0] || searchId,
    role_title: js[2] || 'Not specified',
    generated_date: eds[27] || todayFormatted(),
    consultant_name: eds[25] || 'SmartSearch',

    match_score_display: 'HIDE',
    cv_url: undefined,
  };
}

/**
 * Build a full SearchContext (deck landing page) from EDS + JS rows.
 * Maintains backward compatibility with DeckClient which expects SearchContext.
 */
export function transformToSearchContext(
  edsRows: SheetRow[],
  jsRow: SheetRow | null,
  searchId: string
): SearchContext {
  const js = jsRow ? Object.values(jsRow) : [];

  // JS criteria names for the search context header
  const keyCriteriaNames: string[] = [];
  for (let i = 9; i <= 21; i += 3) {
    const name = js[i]?.trim();
    if (name) keyCriteriaNames.push(name);
  }

  const candidates: IntroCardData[] = edsRows.map((row) => {
    const edcData = transformToEDCData(row, jsRow, searchId);
    const eds = Object.values(row);

    // Flash summary: use candidate_overview (index 23), truncated
    const overview = eds[23] || '';
    const flashSummary = overview.length > 160
      ? overview.slice(0, 157).replace(/\s+\S+$/, '') + '...'
      : overview;

    // Key strengths: split key_strength field (index 17) or derive from criteria names
    const strengthText = eds[17] || '';
    const keyStrengths = strengthText
      ? strengthText.split(/[;,\n]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 3)
      : edcData.key_criteria.slice(0, 3).map((k) => k.name);

    return {
      candidate_id: nameToCandidateId(edcData.candidate_name),
      candidate_name: edcData.candidate_name,
      current_title: edcData.current_title,
      current_company: edcData.current_company,
      location: edcData.location,
      initials: getInitials(edcData.candidate_name),
      flash_summary: flashSummary,
      key_strengths: keyStrengths,
      notice_period: edcData.notice_period !== 'Not mentioned' ? edcData.notice_period : undefined,
      compensation_alignment: 'not_set' as const,  // EDS doesn't expose this directly
      edc_data: edcData,
    };
  });

  return {
    search_name: js[0] || searchId,
    client_company: js[3] || 'Not specified',
    client_location: js[4] || '',
    key_criteria_names: keyCriteriaNames,
    search_lead: js[2] || 'SmartSearch',
    candidates,
  };
}
