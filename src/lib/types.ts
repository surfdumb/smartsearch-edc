/**
 * Controls how EDCCard renders in different display contexts.
 * - standalone: Full header + full EDC (consultant/client direct URL)
 * - deck: Full header + full EDC (inside deck flip view)
 * - comparison: Compact header — just name + title, no meta row
 * - print: Full, optimised for @media print
 */
export type EDCContext = 'standalone' | 'deck' | 'comparison' | 'print';

export interface EDCData {
  // Header
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;

  // Scope Match
  scope_match: {
    dimension: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;

  // Key Criteria (parsed from key_criteria_assessment)
  key_criteria: {
    name: string;
    evidence: string;              // 1-2 sentences with <strong> for key phrases.
                                   // MUST include company name inline for v1.0.
    context_anchor?: string;       // Pill text — company name for v1.0.
                                   // v1.1: "VP Aftermarket, Norican · 2021–24"
  }[];

  // Compensation
  compensation: {
    current_base: string;
    current_total: string;
    expected_base: string;
    expected_total: string;
    flexibility: string;
    budget_range?: string;
  };
  notice_period: string;
  earliest_start_date: string;

  // Motivation
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];

  // Concerns
  potential_concerns: {
    concern: string;
    severity: 'development' | 'significant';
  }[];

  // Our Take — structured output from AI
  our_take: {
    text: string;                  // Main assessment paragraph (consultant voice)
    recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';  // Progress badge
    discussion_points?: string[];  // Key points to discuss with client
    original_note?: string;        // Raw consultant manual note (consultant-only, collapsible)
    ai_rationale?: string;         // Why the AI structured it this way (consultant-only, collapsible)
  };

  // Meta
  search_name: string;
  role_title: string;
  generated_date: string;   // No interview_date — removed per Feb 12 decision
  consultant_name: string;

  // Deprioritized — keep in type but hidden by default
  match_score_percentage?: number;
  match_score_display?: 'SHOW' | 'HIDE';  // Default: 'HIDE'

  // Extensible — not used in v1.0 but keep in type
  cv_url?: string;
  linkedin_url?: string;
  cv_highlights?: string[];
}

export interface SearchContext {
  search_name: string;
  client_company: string;
  client_location: string;
  client_logo_url?: string;
  key_criteria_names: string[];
  search_lead: string;
  candidates: IntroCardData[];
}

/**
 * Builds a plain-text summary of the candidate's EDC data for use as context
 * when generating the "Our Take" section via AI.
 */
export function buildCandidateContext(data: EDCData): string {
  const parts: string[] = [];

  parts.push(`CANDIDATE: ${data.candidate_name}`);
  parts.push(`ROLE: ${data.current_title} at ${data.current_company} (${data.location})`);
  parts.push(`SEARCH: ${data.search_name}`);
  parts.push('');

  // Scope match
  if (data.scope_match.length > 0) {
    parts.push('SCOPE MATCH:');
    for (const s of data.scope_match) {
      parts.push(`- ${s.dimension}: Candidate has "${s.candidate_actual}" vs requirement "${s.role_requirement}" → ${s.alignment}`);
    }
    if (data.scope_seasoning) {
      parts.push(`Scope seasoning: ${data.scope_seasoning.replace(/<[^>]+>/g, '')}`);
    }
    parts.push('');
  }

  // Key criteria
  if (data.key_criteria.length > 0) {
    parts.push('KEY CRITERIA:');
    for (const kc of data.key_criteria) {
      parts.push(`- ${kc.name}: ${kc.evidence.replace(/<[^>]+>/g, '')}${kc.context_anchor ? ` [${kc.context_anchor}]` : ''}`);
    }
    parts.push('');
  }

  // Compensation
  parts.push('COMPENSATION:');
  parts.push(`Current: ${data.compensation.current_base} base / ${data.compensation.current_total} total`);
  parts.push(`Expected: ${data.compensation.expected_base} base / ${data.compensation.expected_total} total`);
  parts.push(`Flexibility: ${data.compensation.flexibility}`);
  if (data.compensation.budget_range) parts.push(`Budget: ${data.compensation.budget_range}`);
  parts.push(`Notice: ${data.notice_period}, Earliest start: ${data.earliest_start_date}`);
  parts.push('');

  // Motivation
  if (data.why_interested.length > 0) {
    parts.push('MOTIVATION:');
    for (const m of data.why_interested) {
      parts.push(`- [${m.type.toUpperCase()}] ${m.headline}: ${m.detail}`);
    }
    parts.push('');
  }

  // Concerns
  if (data.potential_concerns.length > 0) {
    parts.push('CONCERNS:');
    for (const c of data.potential_concerns) {
      parts.push(`- [${c.severity}] ${c.concern}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

export interface IntroCardData {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  initials: string;
  flash_summary: string;
  key_strengths: string[];
  notice_period?: string;
  /** green = within range, amber = stretch, red = gap, not_set = unknown */
  compensation_alignment?: 'green' | 'amber' | 'red' | 'not_set';
  /** e.g. "Builder → Integrator", "Operator → Strategist" */
  career_trajectory?: string;
  /** Short industry label e.g. "FMCG", "FinTech", "Life Sciences" */
  industry_shorthand?: string;
  candidate_id: string;
  edc_data: EDCData;
}
