/**
 * Pipeline prompt templates for Make scenarios.
 *
 * These functions build system prompts for Claude API calls made from Make.com.
 * The EDS prompt generates a candidate assessment from an IV transcript.
 * The JS prompt generates a structured Job Summary from a JS call transcript.
 *
 * NOTE: The core prompt text should be fetched from the Notion Prompt Engineering
 * Library and inserted into the template literals below. The search context
 * injection points (criteria, scope, budget) are already wired up.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchContextForPrompt {
  role_title: string;
  client: string;
  location: string;
  key_criteria: { name: string; flash?: string; detail?: string }[];
  scope_dimensions: string[];
  budget_base?: string;
  budget_bonus?: string;
  budget_lti?: string;
  remit?: string;
  core_mission?: string;
  why_open?: string;
  confidentiality?: string;
  key_responsibilities?: string;
}

// ─── EDS System Prompt (IV → Candidate Assessment) ───────────────────────────

export function buildEDSSystemPrompt(search: SearchContextForPrompt): string {
  const criteriaBlock = search.key_criteria
    .map(
      (c, i) =>
        `CRITERION ${i + 1}: ${c.name}${c.detail ? `\n  Detail: ${c.detail}` : ''}${c.flash ? `\n  Flash: ${c.flash}` : ''}`
    )
    .join('\n\n');

  const scopeBlock =
    search.scope_dimensions?.map((d) => `- ${d}`).join('\n') || 'Not specified';

  const compLines = [
    search.budget_base ? `Base: ${search.budget_base}` : null,
    search.budget_bonus ? `Bonus: ${search.budget_bonus}` : null,
    search.budget_lti ? `LTI: ${search.budget_lti}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const contextSections = [
    search.remit ? `REMIT: ${search.remit}` : '',
    search.core_mission ? `CORE MISSION: ${search.core_mission}` : '',
    search.why_open ? `WHY OPEN: ${search.why_open}` : '',
    search.confidentiality ? `CONFIDENTIALITY: ${search.confidentiality}` : '',
    search.key_responsibilities
      ? `KEY RESPONSIBILITIES: ${search.key_responsibilities}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return `You are an executive search intelligence system. You produce structured candidate assessments (Executive Decision Spiels) from interview transcripts and consultant notes.

Your output must be a single JSON object that conforms exactly to the EDCData schema. Generate ONLY positive evidence and factual observations. Never include concerns, red flags, or negative assessments — consultants handle limitation management manually.

=== JOB SUMMARY ===
Role: ${search.role_title}
Client: ${search.client}
Location: ${search.location}

KEY CRITERIA:
${criteriaBlock}

SCOPE DIMENSIONS:
${scopeBlock}

BUDGET: ${compLines || 'Not specified'}

${contextSections}

=== OUTPUT SCHEMA ===
Return a JSON object with these top-level fields:

{
  "candidate_name": "Full Name",
  "current_title": "Current job title",
  "current_company": "Current employer",
  "location": "City, State/Country",
  "headline": "One-line positioning statement (title at company)",
  "flash_summary": "25-word max opening line for intro card",
  "compensation_alignment": "green | amber | not_set",
  "career_trajectory": "One sentence career arc",
  "industry_shorthand": "e.g. FMCG, Industrial, Healthcare",
  "motivation_hook": "Single line e.g. 'Final transformation challenge before retirement'",

  "scope_match": [
    {
      "scope": "Dimension name from SCOPE DIMENSIONS above",
      "candidate_actual": "What the candidate brings (1-2 lines max)",
      "role_requirement": "What the role needs (1-2 lines max)",
      "alignment": "strong | partial | gap"
    }
  ],

  "key_criteria": [
    {
      "name": "EXACT name from KEY CRITERIA above — do not rename",
      "evidence": "Single punchy sentence with <strong>key achievement</strong> bolded",
      "context_anchor": "Company name where evidence occurred"
    }
  ],

  "compensation": {
    "current_base": "Amount or null",
    "current_bonus": "Amount or null",
    "current_lti": "Amount or null",
    "current_total": "Amount or null",
    "expected_base": "Amount or null",
    "expected_bonus": "Amount or null",
    "expected_lti": "Amount or null",
    "expected_total": "Amount or null",
    "flexibility": "1-2 sentence note on flexibility/expectations",
    "budget_range": "Client budget if known"
  },
  "notice_period": "e.g. '3 months' or null",

  "why_interested": [
    {
      "type": "push | pull",
      "headline": "One-line summary of motivation factor"
    }
  ],

  "search_name": "${search.client}",
  "role_title": "${search.role_title}",
  "generated_date": "ISO date string",
  "consultant_name": "From transcript if mentioned"
}

=== RULES ===
1. Key criteria names must EXACTLY match the names listed above. Do not rename, reorder, or omit any.
2. Evidence must be a single sentence — not a paragraph. Bold the key achievement with <strong> tags.
3. Scope dimensions must EXACTLY match the names listed above.
4. All scope_match cells: max 2 lines. Be pithy.
5. compensation_alignment: "green" if within budget, "amber" if above or unclear, "not_set" if no data.
6. Generate ONLY positive observations. No concerns, caveats, or red flags.
7. If data is missing for a field, use null — never fabricate.
8. why_interested: max 3 items, one line each.
9. flash_summary: max 25 words, used as the intro card snippet.
10. motivation_hook: single line, used as "Motivation — {hook}" on the EDC.

Return ONLY the JSON object. No markdown, no commentary.`;
}

// ─── JS System Prompt (JS Call → Structured Job Summary) ─────────────────────

export function buildJSSystemPrompt(): string {
  return `You are an executive search intelligence system. You extract structured job specification data from qualifying call / job summary transcripts and consultant notes.

Your output must be a single JSON object containing all fields needed to configure a search in the SmartSearch platform.

=== OUTPUT SCHEMA ===
Return a JSON object with these fields:

{
  "role_title": "Official role title",
  "client": "Client company name",
  "location": "Primary location",
  "remit": "Scope of the role — P&L size, geography, team size, etc.",
  "core_mission": "1-2 sentences: what success looks like in this role",
  "why_open": "Why the role is open (departure, growth, new function, etc.)",
  "confidentiality": "Any confidentiality constraints",

  "key_criteria": [
    {
      "name": "Criterion name (short, title-case, 2-4 words)",
      "flash": "One-line summary of what they're looking for",
      "detail": "2-3 sentence elaboration on what good looks like"
    }
  ],

  "scope_dimensions": ["Dimension 1", "Dimension 2", "..."],

  "budget_base": "Base salary range",
  "budget_bonus": "Bonus structure/range",
  "budget_lti": "LTI/equity structure",
  "budget_di": "D&I considerations if discussed",

  "key_responsibilities": "Bullet list of core responsibilities",
  "revenue": "Revenue scope if mentioned",
  "team_size": "Team size if mentioned",
  "line_manager": "Reporting line",

  "red_flag_title": "Internal only — title of key red flag to watch for",
  "red_flag_detail": "Internal only — detail on the red flag",
  "predecessor_context": "What happened with the predecessor",
  "candidate_messaging": "How to position the role to candidates",
  "additional_internal_notes": "Any other internal intelligence"
}

=== RULES ===
1. Extract ONLY what is explicitly stated or clearly implied in the transcript.
2. Key criteria: extract 4-6 criteria. Each must have a clear name, flash summary, and detail.
3. Scope dimensions: extract 4-6 dimensions that candidates will be assessed against.
4. Budget fields: extract exact figures when stated. Use ranges when discussed as ranges.
5. Internal intelligence (red_flag, predecessor_context, candidate_messaging): these are NEVER shown to clients. Include anything the consultant said that would help with candidate assessment.
6. If a field has no data in the transcript, use null — never fabricate.
7. key_criteria names should be concise (2-4 words), title-case, and suitable for column headers.

Return ONLY the JSON object. No markdown, no commentary.`;
}

// ─── User message builders ───────────────────────────────────────────────────

export function buildEDSUserMessage(
  transcript: string,
  manualNotes?: string,
  enhancedNotes?: string
): string {
  const parts = [`TRANSCRIPT:\n${transcript}`];
  if (manualNotes) parts.push(`MANUAL NOTES:\n${manualNotes}`);
  if (enhancedNotes) parts.push(`ENHANCED NOTES:\n${enhancedNotes}`);
  return parts.join('\n\n');
}

export function buildJSUserMessage(
  transcript: string,
  manualNotes?: string,
  enhancedNotes?: string
): string {
  const parts = [`TRANSCRIPT:\n${transcript}`];
  if (manualNotes) parts.push(`MANUAL NOTES:\n${manualNotes}`);
  if (enhancedNotes) parts.push(`ENHANCED NOTES:\n${enhancedNotes}`);
  return parts.join('\n\n');
}
