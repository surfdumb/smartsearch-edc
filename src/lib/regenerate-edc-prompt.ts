/**
 * EDC regeneration prompt (v1.3 MVP).
 *
 * System prompt + user-message builder for the /api/deck/[searchId]/candidates/[slug]/regenerate
 * route. The model is instructed to return a single JSON object matching the EDCData type
 * at src/lib/types.ts. The server post-processes the response: `generated_date` is overwritten
 * with the server timestamp, and the merge layer reapplies any consultant edits flagged in
 * `manually_edited_fields`.
 */

export interface RegenerationSearchRow {
  position?: string | null;
  client_display_name?: string | null;
  client?: string | null;
  location?: string | null;
  industry?: string | null;
  role_title?: string | null;
  line_manager?: string | null;
  core_mission?: string | null;
  remit?: string | null;
  why_open?: string | null;
  key_responsibilities?: string | null;
  budget_base?: string | null;
  budget_bonus?: string | null;
  budget_lti?: string | null;
  budget_di?: string | null;
  budget_benefits?: string | null;
  budget_total?: string | null;
  key_criteria?: { name: string; detail?: string; priority?: string }[] | null;
  scope_match_dimensions?: string | { name: string; role_requirement?: string }[] | null;
  red_flag_title?: string | null;
  red_flag_detail?: string | null;
  candidate_messaging?: string | null;
  confidentiality?: string | null;
  notes?: string | null;
}

export interface RegenerationCandidateRow {
  candidate_name: string;
  current_title?: string | null;
  current_company?: string | null;
  location?: string | null;
  primary_industry?: string | null;
  years_in_current_role?: string | number | null;
  years_at_current_company?: string | number | null;
  total_team_size?: string | number | null;
  compensation_current_total?: string | null;
  compensation_expected_total?: string | null;
  compensation_flexibility?: string | null;
  notice_period?: string | null;
  earliest_start_date?: string | null;
  raw_manual_notes?: string | null;
  raw_transcript?: string | null;
  raw_enhanced_notes?: string | null;
}

export const REGENERATE_EDC_PROMPT = `You are SmartSearch's EDC (Executive Decision Card) generator. Your job is to produce structured candidate intelligence from raw interview material, against a specific search Brief, for a client-facing one-page card.

CORE PRINCIPLES (non-negotiable):
1. Show evidence. Let humans judge. No scoring, no recommendations, no badges.
2. Zero inference. If the candidate didn't explicitly say it, write "Not mentioned" — never speculate.
3. Source hierarchy:
   - Standard fields (key_criteria evidence, scope_match, candidate_overview): PRIMARY source is raw_transcript if present, else raw_manual_notes. Enhanced notes are cross-reference only.
   - Key Criteria NAMES are sacred — use the EXACT names from the search Brief, in order. Never rename, reorder, or paraphrase.
   - Our Take: PRIMARY source is raw_manual_notes ONLY. Never let transcript phrases leak in.
   - ENTITY CORRECTIONS / GLOSSARY (if present): naming/spelling authority ONLY — never evidence, never a content source.
4. Consultant voice: "We believe..." not "The candidate presents..." Written as if SmartSearch authored it.
5. Number precision: capture exact figures. "Approximately $50M P&L" not "significant P&L".
6. Salary format: "Base + Bonus + LTI + Benefits". Never just total.
7. Missing data: write "Not mentioned" — never blank, never inferred.

OUTPUT SHAPE (return ONLY valid JSON, no preamble, no markdown fences):
{
  "candidate_name": "...",
  "current_title": "...",
  "current_company": "...",
  "location": "...",
  "search_name": "...",          // from search Brief — client display name or client
  "role_title": "...",            // from search Brief
  "headline": "...",              // 1-line punch summary; wrap key numbers in <strong>...</strong>
  "motivation_hook": "...",       // 1-sentence why they're looking. The hook text ONLY — never prepend a "Motivation —" label; the UI renders that label itself.
  "key_criteria": [
    {
      "name": "<EXACT criterion name from Brief>",
      "evidence": "<single sentence, 1–2 lines max, factual, from transcript/notes. <strong> bold the key achievement phrase.>",
      "context_anchor": "<company name where the most relevant achievement happened>"
    }
    // one per Brief criterion, in the SAME order as the Brief
  ],
  "scope_match": [
    {
      "scope": "<EXACT dimension name from Brief — the name ONLY, never the role requirement, no — or : separator>",
      "candidate_actual": "<short factual statement of the candidate's actual scope on this dimension>",
      "role_requirement": "<what the role requires — pull from Brief>",
      "alignment": "strong" | "partial" | "gap"
    }
    // one per scope_match_dimensions
  ],
  "scope_seasoning": "<OPTIONAL: 1–2 sentence narrative across the table. Default: omit this field.>",
  "compensation": {
    "current_base": "...",
    "current_bonus": "...",
    "current_lti": "...",
    "current_total": "...",
    "expected_base": "...",
    "expected_bonus": "...",
    "expected_lti": "...",
    "expected_total": "...",
    "flexibility": "<1–2 sentence note>",
    "budget_range": "<from Brief budget; e.g. '\$220k–\$260k base + 30% bonus'>"
  },
  "notice_period": "<from candidate row>",
  "earliest_start_date": "<from candidate row, or omit>",
  "why_interested": [
    { "type": "pull", "headline": "<1-line headline>", "detail": "<1 sentence>" },
    { "type": "push", "headline": "<1-line headline>", "detail": "<1 sentence>" }
    // 3 items max
  ],
  "our_take": {
    "text": "<2-paragraph consultant assessment from manual notes ONLY. Paragraph 1 = Assessment. Paragraph 2 = Pivot/recommendation framing without using badges. Voice: 'We believe...'>"
  },
  "our_take_fragments": [],         // leave empty — fragments are a consultant-only construct
  "generated_date": "<YYYY-MM-DD>", // today's date; the server will overwrite this
  "match_score_display": "HIDE",
  "potential_concerns": []          // AI generates positives only — leave empty
}

DO NOT:
- Generate negative signals in potential_concerns — leave that array empty.
- Use markdown fences or any text outside the JSON object.
- Paraphrase or reorder Key Criteria names from the Brief.
- Output \`scope_match\` rows using "dimension" — the field name MUST be "scope".
- Concatenate the dimension name and its role requirement into "scope" (no "Name — requirement" strings).

INPUT FORMAT:
The user message that follows contains the SEARCH BRIEF, the CANDIDATE FACTS, and one or more of: RAW MANUAL NOTES, RAW TRANSCRIPT, RAW ENHANCED NOTES. Produce the EDC JSON respecting all 7 principles above.`;

function formatScopeDimensions(raw: RegenerationSearchRow['scope_match_dimensions']): string {
  if (!raw) return '(not specified)';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    // The dimension name and the role requirement are emitted as separate
    // labelled lines — never joined into one string. A joined "name — req"
    // line gets copied verbatim into the "scope" output field by the model.
    return raw
      .map((d) =>
        d.role_requirement
          ? `- scope: ${d.name}\n  role_requirement: ${d.role_requirement}`
          : `- scope: ${d.name}`,
      )
      .join('\n');
  }
  return '(not specified)';
}

function formatKeyCriteria(criteria: RegenerationSearchRow['key_criteria']): string {
  if (!criteria || criteria.length === 0) return '(none specified in Brief)';
  return criteria
    .map((c, i) => {
      const detail = c.detail ? `\n   ${c.detail}` : '';
      const priority = c.priority ? `\n   Priority: ${c.priority}` : '';
      return `${i + 1}. ${c.name}${detail}${priority}`;
    })
    .join('\n');
}

function nullish(v: unknown, fallback = 'Not mentioned'): string {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

export function buildRegenerationUserMessage(
  search: RegenerationSearchRow,
  candidate: RegenerationCandidateRow,
): string {
  // searches.notes is an internal-ops scratch field, NOT a glossary. Only
  // explicitly prefixed lines may reach the prompt — the filter is the
  // quarantine guarantee, not the prompt instruction.
  const corrections = (search.notes ?? '')
    .split('\n')
    .filter((l) => /^\s*(ENTITY CORRECTION|GLOSSARY):/i.test(l));
  const glossaryBlock = corrections.length > 0
    ? `
=== ENTITY CORRECTIONS / GLOSSARY (spelling authority only — NEVER a content source) ===
${corrections.join('\n')}
Use this block ONLY to spell entity names (companies, products, people, places) correctly.
Never treat anything in it as evidence, scope, or candidate fact.
`
    : '';

  const transcriptBlock = candidate.raw_transcript && candidate.raw_transcript.trim().length > 0
    ? candidate.raw_transcript
    : '(not available — use manual notes as primary)';

  const enhancedBlock = candidate.raw_enhanced_notes && candidate.raw_enhanced_notes.trim().length > 0
    ? candidate.raw_enhanced_notes
    : '(not available)';

  return `=== SEARCH BRIEF ===
Position: ${nullish(search.position, '(not specified)')}
Client: ${nullish(search.client_display_name ?? search.client, '(not specified)')}
Location: ${nullish(search.location, '(not specified)')}
Industry: ${nullish(search.industry, '(not specified)')}
Role title: ${nullish(search.role_title, '(not specified)')}
Line manager: ${nullish(search.line_manager, '(not specified)')}
Core mission: ${nullish(search.core_mission, '(not specified)')}
Remit: ${nullish(search.remit, '(not specified)')}
Why open: ${nullish(search.why_open, '(not specified)')}
Key responsibilities: ${nullish(search.key_responsibilities, '(not specified)')}

Compensation range (target):
- Base: ${nullish(search.budget_base, '(not specified)')}
- Bonus: ${nullish(search.budget_bonus, '(not specified)')}
- LTI: ${nullish(search.budget_lti, '(not specified)')}
- DI: ${nullish(search.budget_di, '(not specified)')}
- Benefits: ${nullish(search.budget_benefits, '(not specified)')}
- Total: ${nullish(search.budget_total, '(not specified)')}

KEY CRITERIA (use these exact names, in this exact order):
${formatKeyCriteria(search.key_criteria)}

SCOPE MATCH DIMENSIONS (one scope_match row per dimension, in this order. The "scope:" value goes in the "scope" field EXACTLY as written — the name ONLY. The "role_requirement:" text goes in the "role_requirement" field, NEVER in "scope"):
${formatScopeDimensions(search.scope_match_dimensions)}

Red flag: ${nullish(search.red_flag_title, '(none)')}
${nullish(search.red_flag_detail, '')}

Candidate messaging: ${nullish(search.candidate_messaging, '(none)')}
Confidentiality: ${nullish(search.confidentiality, '(standard)')}
${glossaryBlock}
=== CANDIDATE FACTS ===
Name: ${candidate.candidate_name}
Current title: ${nullish(candidate.current_title)}
Current company: ${nullish(candidate.current_company)}
Location: ${nullish(candidate.location)}
Industry: ${nullish(candidate.primary_industry)}
Years in role: ${nullish(candidate.years_in_current_role)}
Years at company: ${nullish(candidate.years_at_current_company)}
Team size: ${nullish(candidate.total_team_size)}

Compensation:
- Current total: ${nullish(candidate.compensation_current_total)}
- Expected total: ${nullish(candidate.compensation_expected_total)}
- Flexibility: ${nullish(candidate.compensation_flexibility)}

Notice period: ${nullish(candidate.notice_period)}
Earliest start: ${nullish(candidate.earliest_start_date)}

=== RAW MANUAL NOTES (PRIMARY for Our Take, strong source for evidence) ===
${candidate.raw_manual_notes ?? '(not available)'}

=== RAW TRANSCRIPT ===
${transcriptBlock}

=== RAW ENHANCED NOTES ===
${enhancedBlock}

Produce the EDC JSON now. Return ONLY the JSON object.`;
}
