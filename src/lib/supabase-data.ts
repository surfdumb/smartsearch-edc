import { getServiceClient, SUPABASE_ENABLED } from './supabase';
import type { SearchContext, IntroCardData, EDCData } from './types';

// ─── Search key → UUID resolver with cache ─────────────────────────────────

const searchKeyCache = new Map<string, string>();

export async function resolveSearchId(searchKey: string): Promise<string | null> {
  if (searchKeyCache.has(searchKey)) return searchKeyCache.get(searchKey)!;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('searches')
    .select('id')
    .eq('search_key', searchKey)
    .single();

  if (data?.id) {
    searchKeyCache.set(searchKey, data.id);
    return data.id;
  }
  return null;
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

  // Cache the UUID for later write operations
  searchKeyCache.set(searchKey, search.id);

  // 2. Fetch candidates for this search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates, error: candErr } = await supabase
    .from('candidates')
    .select('*, edc_data, ai_generated_edc')
    .eq('search_id', search.id)
    .order('candidate_name') as { data: Record<string, unknown>[] | null; error: unknown };

  if (candErr) {
    console.error('[SUPABASE-DEBUG] candidates query error', candErr);
    return null;
  }
  if (!candidates) return null;

  // Debug: log raw Supabase query result for first candidate
  if (candidates?.length) {
    const c0 = candidates[0] as Record<string, unknown>;
    const rawColumns = Object.keys(c0);
    const raw = (c0.edc_data || null) as Record<string, unknown> | null;
    console.log('[SUPABASE-DEBUG] raw query result', {
      name: c0.candidate_name,
      returned_columns: rawColumns,
      returned_column_count: rawColumns.length,
      edc_data_type: typeof c0.edc_data,
      edc_data_is_null: c0.edc_data === null,
      edc_data_keys: raw ? Object.keys(raw) : 'null',
      edc_data_key_count: raw ? Object.keys(raw).length : 0,
      has_key_criteria: raw ? 'key_criteria' in raw : false,
      first_evidence: (raw as Record<string, unknown> & { key_criteria?: { evidence?: string }[] })?.key_criteria?.[0]?.evidence?.slice(0, 80),
      scope_count: (raw as Record<string, unknown> & { scope_match?: unknown[] })?.scope_match?.length,
      scope_first_field: (raw as Record<string, unknown> & { scope_match?: { scope?: string }[] })?.scope_match?.[0]?.scope?.slice(0, 50),
      compensation_budget: (raw as Record<string, unknown> & { compensation?: { budget_base?: string } })?.compensation?.budget_base?.slice(0, 30),
      has_ai_generated_edc: c0.ai_generated_edc !== null && c0.ai_generated_edc !== undefined,
      supabase_url_tail: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(-20),
    });
  }

  // 3. Transform candidates into IntroCardData[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const introCards: IntroCardData[] = candidates.map((c: any) => {
    const raw = (c.edc_data || null) as Record<string, unknown> | null;

    let edcPayload: EDCData;

    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      console.log('[SUPABASE-DEBUG] transform decision', {
        name: c.candidate_name,
        raw_exists: !!raw,
        raw_is_object: typeof raw === 'object',
        raw_key_count: raw ? Object.keys(raw as Record<string, unknown>).length : 0,
        has_nested_edc_data: raw ? 'edc_data' in (raw as Record<string, unknown>) : false,
        path: 'engine',
      });
      // Handle nested vs flat edc_data structure
      // Norican: flat (key_criteria at top level)
      // Crestview: nested (edc_data.edc_data.key_criteria)
      edcPayload = (
        raw.edc_data &&
        typeof raw.edc_data === 'object' &&
        'key_criteria' in (raw.edc_data as Record<string, unknown>)
      )
        ? raw.edc_data as unknown as EDCData
        : raw as unknown as EDCData;
      /* eslint-disable @typescript-eslint/no-explicit-any */
      console.log('[SUPABASE-DEBUG] transform path', {
        name: c.candidate_name,
        path: 'engine',
        used_nested: !!(raw.edc_data && typeof raw.edc_data === 'object' && 'key_criteria' in (raw.edc_data as Record<string, unknown>)),
        edcPayload_keys: Object.keys(edcPayload),
        edcPayload_criteria_count: (edcPayload as any)?.key_criteria?.length,
        edcPayload_first_evidence: (edcPayload as any)?.key_criteria?.[0]?.evidence?.slice(0, 60),
        edcPayload_scope_count: (edcPayload as any)?.scope_match?.length,
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    } else {
      console.log('[SUPABASE-DEBUG] transform decision', {
        name: c.candidate_name,
        raw_exists: !!raw,
        raw_is_object: typeof raw === 'object',
        raw_key_count: raw ? Object.keys(raw as Record<string, unknown>).length : 0,
        has_nested_edc_data: raw ? 'edc_data' in (raw as Record<string, unknown>) : false,
        path: 'fallback',
      });
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
      /* eslint-disable @typescript-eslint/no-explicit-any */
      console.log('[SUPABASE-DEBUG] transform path', {
        name: c.candidate_name,
        path: 'fallback',
        edcPayload_keys: Object.keys(edcPayload),
        edcPayload_criteria_count: (edcPayload as any)?.key_criteria?.length,
        edcPayload_first_evidence: (edcPayload as any)?.key_criteria?.[0]?.evidence?.slice(0, 60),
        edcPayload_scope_count: (edcPayload as any)?.scope_match?.length,
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
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
  };

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
