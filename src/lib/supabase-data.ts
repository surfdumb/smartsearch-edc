import { getServiceClient, SUPABASE_ENABLED } from './supabase';
import type { SearchContext, IntroCardData, EDCData } from './types';
import { mergeKeyCriteria } from './merge-criteria';

// ─── Search key → UUID resolver ─────────────────────────────────────────────

export async function resolveSearchId(searchKey: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('searches')
    .select('id')
    .eq('search_key', searchKey)
    .single();

  return data?.id ?? null;
}

// ─── Main deck data loader ──────────────────────────────────────────────────

export async function getSupabaseDeckData(searchKey: string): Promise<SearchContext | null> {
  if (!SUPABASE_ENABLED) return null;

  const supabase = getServiceClient();

  // 1. Fetch search
  const { data: search, error: searchErr } = await supabase
    .from('searches')
    .select('*')
    .eq('search_key', searchKey)
    .single();

  if (searchErr || !search) return null;

  // 2. Fetch candidates for this search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates, error: candErr } = await supabase
    .from('candidates')
    .select('*, edc_data, ai_generated_edc')
    .eq('search_id', search.id)
    .order('candidate_name') as { data: Record<string, unknown>[] | null; error: unknown };

  if (candErr) {
    console.error('[supabase-data] candidates query error', candErr);
    return null;
  }
  if (!candidates) return null;

  // 3. Transform candidates into IntroCardData[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const introCards: IntroCardData[] = candidates.map((c: any) => {
    const raw = (c.edc_data || null) as Record<string, unknown> | null;

    let edcPayload: EDCData;

    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      // Handle nested vs flat edc_data structure
      edcPayload = (
        raw.edc_data &&
        typeof raw.edc_data === 'object' &&
        'key_criteria' in (raw.edc_data as Record<string, unknown>)
      )
        ? raw.edc_data as unknown as EDCData
        : raw as unknown as EDCData;

      // Merge pristine Engine criteria with edc_data, preserving consultant edits.
      // ai_generated_edc is never modified by the client, so it's the structural authority.
      // But if a consultant edited evidence/context_anchor in edc_data, keep their version.
      const aiGenerated = c.ai_generated_edc as Record<string, unknown> | null;
      if (aiGenerated?.key_criteria && Array.isArray(aiGenerated.key_criteria) && aiGenerated.key_criteria.length > 0) {
        edcPayload.key_criteria = mergeKeyCriteria(
          aiGenerated.key_criteria as EDCData['key_criteria'],
          edcPayload.key_criteria,
        );
      }
    } else {
      // edc_data is NULL — build EDCData from raw EDS candidate fields

      // Parse scope_match_dimensions ("Headcount, Geography, ...") into scope rows
      const scopeRows = c.scope_match_dimensions
        ? (c.scope_match_dimensions as string).split(',').map((d: string) => ({
            scope: d.trim(),
            candidate_actual: 'Not assessed',
            role_requirement: '',
            alignment: 'not_assessed' as const,
          }))
        : [];

      // Parse key_criteria_assessment_prose ("External reporting: Very Good. Manufacturing: Strong.")
      // and match against search-level criteria names
      const keyCriteriaFromSearch = (search.key_criteria as { name: string; detail?: string }[] | null) || [];
      const assessmentProse = (c.key_criteria_assessment_prose as string) || '';
      const parsedAssessments = parseAssessmentProse(assessmentProse);
      const keyCriteria = keyCriteriaFromSearch.map((kc) => {
        // Try to match assessment by checking if criteria name starts with the short key
        const match = parsedAssessments.find((a) =>
          kc.name.toLowerCase().startsWith(a.shortName.toLowerCase())
        );
        return {
          name: kc.name,
          evidence: match ? match.rating : '',
          context_anchor: '',
        };
      });

      edcPayload = {
        candidate_name: c.candidate_name || '',
        current_title: c.current_title || '',
        current_company: c.current_company || '',
        location: c.location || '',
        scope_match: scopeRows,
        key_criteria: keyCriteria,
        compensation: {
          current_base: '',
          current_bonus: '',
          current_total: c.compensation_current_total || '',
          expected_base: '',
          expected_bonus: '',
          expected_total: c.compensation_expected_total || '',
          flexibility: c.compensation_flexibility || '',
        },
        notice_period: c.notice_period || 'Not mentioned',
        why_interested: [],
        potential_concerns: [],
        our_take: { text: c.our_take || '' },
        motivation_hook: c.key_strength || undefined,
        search_name: '',
        role_title: '',
        generated_date: '',
        consultant_name: '',
        // Guard flag: this edc_data was constructed from raw EDS fields,
        // NOT loaded from Supabase edc_data column. The save handler must
        // skip writing edc_data back to Supabase when this flag is present
        // to avoid overwriting future Engine-generated data.
        _fromFallback: true,
      } as EDCData;
    }

    return {
      candidate_name: c.candidate_name,
      candidate_id: c.candidate_slug,
      current_title: c.current_title || '',
      current_company: c.current_company || '',
      location: c.location || '',
      initials: c.initials || makeInitials(c.candidate_name),
      headline: c.headline || (raw?.headline as string) || c.candidate_overview_prose || `${c.current_title} at ${c.current_company}`,
      flash_summary: c.flash_summary || (raw?.flash_summary as string) || c.candidate_overview_prose || undefined,
      compensation_alignment: (c.compensation_alignment || 'not_set') as 'green' | 'amber' | 'not_set',
      career_trajectory: c.career_trajectory || (raw?.career_trajectory as string) || undefined,
      industry_shorthand: c.industry_shorthand || (raw?.industry_shorthand as string) || undefined,
      photo_url: (raw?.photo_url as string) || undefined,
      motivation_hook: c.motivation_hook || (raw?.motivation_hook as string) || c.key_strength || undefined,
      edc_data: edcPayload,
    } as IntroCardData;
  });

  // 4. Build SearchContext
  const keyCriteria = search.key_criteria as { name: string }[] | null;
  const ctx: SearchContext = {
    search_name: search.client_display_name || search.client,
    role_title: search.role_title || search.position || '',
    client_company: search.client,
    client_display_name: search.client_display_name || undefined,
    client_location: search.location || '',
    client_logo_url: search.client_logo_url || undefined,
    key_criteria_names: keyCriteria?.map((k) => k.name) || [],
    search_lead: search.kam || '',
    candidates: introCards,
    candidate_statuses: Object.fromEntries(
      candidates.map((c) => [c.candidate_slug, c.deck_status || 'active'])
    ),
    card_order: search.card_order || undefined,
    hidden_candidates: search.hidden_candidates || undefined,
    deck_settings: (search.deck_settings as SearchContext['deck_settings']) || undefined,
    js_source_url: (search.js_source_url as string) || undefined,
    scope_match_dimensions: (search.scope_match_dimensions as { name: string; role_requirement: string }[] | null) || undefined,
  };

  // Thread raw Job Summary fields when js_in_portal is enabled
  const ds = search.deck_settings as Record<string, unknown> | null;
  if (ds?.js_in_portal) {
    ctx.job_summary_data = {
      position: (search.position as string) || undefined,
      remit: (search.remit as string) || undefined,
      core_mission: (search.core_mission as string) || undefined,
      why_open: (search.why_open as string) || undefined,
      key_responsibilities: (search.key_responsibilities as string) || undefined,
      budget_base: (search.budget_base as string) || undefined,
      budget_bonus: (search.budget_bonus as string) || undefined,
      budget_lti: (search.budget_lti as string) || undefined,
      budget_di: (search.budget_di as string) || undefined,
      red_flag_title: (search.red_flag_title as string) || undefined,
      red_flag_detail: (search.red_flag_detail as string) || undefined,
      predecessor_context: (search.predecessor_context as string) || undefined,
      candidate_messaging: (search.candidate_messaging as string) || undefined,
      additional_internal_notes: (search.additional_internal_notes as string) || undefined,
      confidentiality: (search.confidentiality as string) || undefined,
      revenue: (search.revenue as string) || undefined,
      team_size: (search.team_size as string) || undefined,
      line_manager: (search.line_manager as string) || undefined,
      key_criteria_detailed: (search.key_criteria as { name: string; detail?: string; priority?: string }[] | null) || undefined,
      scope_dimensions: search.scope_dimensions || undefined,
      alt_criteria: search.alt_criteria || undefined,
      js_last_synced_at: (search.js_last_synced_at as string) || (search.updated_at as string) || undefined,
    };
  }

  return ctx;
}

function makeInitials(name: string): string {
  const parts = name.split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/** Parse "External reporting: Very Good. Manufacturing: Strong." into [{shortName, rating}] */
function parseAssessmentProse(prose: string): { shortName: string; rating: string }[] {
  if (!prose) return [];
  // Split on period followed by space or end of string
  return prose.split(/\.\s*/).filter(Boolean).map((segment) => {
    const colonIdx = segment.indexOf(':');
    if (colonIdx === -1) return null;
    return {
      shortName: segment.slice(0, colonIdx).trim(),
      rating: segment.slice(colonIdx + 1).trim(),
    };
  }).filter((x): x is { shortName: string; rating: string } => x !== null);
}
