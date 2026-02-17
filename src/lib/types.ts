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

  // Our Take
  our_take: {
    text: string;     // Free-form consultant judgment. Editable.
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
