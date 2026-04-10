import type { EDCData, IntroCardData, SearchContext } from './types';
import { getSupabaseDeckData } from './supabase-data';
import { SUPABASE_ENABLED } from './supabase';
import fs from 'fs';
import path from 'path';

// ─── Data fetching abstraction ────────────────────────────────────────────────
// Priority order:
//   0. JSON fixture with pre-structured candidates (highest — no Sheets needed)
//   1. Google Sheets EDC Output Store (when GOOGLE_SERVICE_ACCOUNT_EMAIL is set)
//   2. Google Sheets raw EDS text + transformation
//   3. JSON fixture without candidates (deck-level metadata only)
//   4. Legacy flat fixtures in /data/test_fixtures.json

const SHEETS_ENABLED = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// ─── Blob photo lookup ──────────────────────────────────────────────────────

/** Look up uploaded candidate photos from Vercel Blob. Returns map of candidateId → blob URL. */
async function getPhotoUrls(searchId: string): Promise<Record<string, string>> {
  if (!BLOB_ENABLED) return {};
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `photos/${searchId}/` });
    const map: Record<string, string> = {};
    for (const blob of blobs) {
      // pathname: photos/{searchId}/{candidateId}.jpg
      const filename = blob.pathname.split('/').pop() || '';
      const candidateId = filename.replace(/\.\w+$/, '');
      if (candidateId) map[candidateId] = blob.url;
    }
    return map;
  } catch {
    return {};
  }
}

/** Attach blob photo URLs to candidates */
function attachPhotos(candidates: IntroCardData[], photos: Record<string, string>) {
  for (const c of candidates) {
    const url = photos[c.candidate_id];
    if (url) {
      c.edc_data.photo_url = url;
      // Also set on IntroCardData if the field exists
      if ('photo_url' in c) (c as IntroCardData & { photo_url?: string }).photo_url = url;
    }
  }
}

// ─── Blob edit overlays ─────────────────────────────────────────────────────

/** Fetch all persisted edit overlays for a search. Returns map of candidateId → EDCData. */
async function getEditOverlays(searchId: string): Promise<Record<string, EDCData>> {
  if (!BLOB_ENABLED) return {};
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `edits/${searchId}/` });
    if (blobs.length === 0) return {};
    const overlays: Record<string, EDCData> = {};
    await Promise.all(blobs.map(async (blob) => {
      const filename = blob.pathname.split('/').pop() || '';
      const candidateId = filename.replace(/\.json$/, '');
      if (!candidateId) return;
      try {
        const res = await fetch(blob.url, { cache: 'no-store' });
        if (res.ok) overlays[candidateId] = await res.json();
      } catch { /* ignore individual fetch failures */ }
    }));
    return overlays;
  } catch {
    return {};
  }
}

/** Apply edit overlays to candidates — overlays replace full edc_data */
function applyEditOverlays(candidates: IntroCardData[], overlays: Record<string, EDCData>) {
  for (const c of candidates) {
    const overlay = overlays[c.candidate_id];
    if (overlay) {
      // Skip overlays that lack essential EDC fields (e.g. test/corrupt saves)
      if (!overlay.candidate_name || !overlay.key_criteria) continue;
      c.edc_data = overlay;
      c.candidate_name = overlay.candidate_name;
      c.current_title = overlay.current_title;
      c.current_company = overlay.current_company;
      c.location = overlay.location;
      // IntroCard fields synced from auto-save
      if (overlay.status) c.edc_data.status = overlay.status;
      if (overlay.status) (c as unknown as Record<string, unknown>).status = overlay.status;
      const overlayAny = overlay as unknown as Record<string, unknown>;
      if (overlayAny.compensation_alignment) {
        c.compensation_alignment = overlayAny.compensation_alignment as 'green' | 'amber' | 'not_set';
      }
      if (overlayAny.headline) {
        c.headline = overlayAny.headline as string;
      }
    }
  }
}

// ─── Blob card order ───────────────────────────────────────────────────────

/** Load server-persisted card order from Vercel Blob */
async function getCardOrder(searchId: string): Promise<string[] | null> {
  if (!BLOB_ENABLED) return null;
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `deck-config/${searchId}/card-order.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (res.ok) return await res.json();
    return null;
  } catch { return null; }
}

// ─── Blob hidden candidates ────────────────────────────────────────────────

/** Load server-persisted hidden candidate IDs from Vercel Blob */
async function getHiddenCandidates(searchId: string): Promise<string[] | null> {
  if (!BLOB_ENABLED) return null;
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `deck-config/${searchId}/hidden-candidates.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (res.ok) return await res.json();
    return null;
  } catch { return null; }
}

// ─── Fixture loader ──────────────────────────────────────────────────────────

type FixtureData = SearchContext & {
  candidate_statuses?: Record<string, string>;
  js_search_name?: string;
  scope_requirements?: Record<string, string>;
  role_title?: string;
  /** Fixture candidates may be flat (EDC fields directly on candidate) or IntroCardData shaped */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidates: any[];
};

// Cache to avoid repeated file reads within a single request
const fixtureCache = new Map<string, FixtureData | null>();

function loadFixtureSync(searchId: string): FixtureData | null {
  if (fixtureCache.has(searchId)) return fixtureCache.get(searchId) || null;
  try {
    const filePath = path.join(process.cwd(), 'data', 'decks', `${searchId}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    fixtureCache.set(searchId, parsed);
    return parsed;
  } catch {
    fixtureCache.set(searchId, null);
    return null;
  }
}

async function loadFixture(searchId: string): Promise<FixtureData | null> {
  // Try fs.readFileSync first (works in Node.js / Vercel functions)
  const sync = loadFixtureSync(searchId);
  if (sync) return sync;

  // Fallback to dynamic import (webpack bundles all JSON in data/decks/)
  try {
    const mod = await import(`../../data/decks/${searchId}.json`);
    const data = mod.default as FixtureData;
    fixtureCache.set(searchId, data);
    return data;
  } catch {
    return null;
  }
}

// ─── Fixture candidate helpers ───────────────────────────────────────────────

/** Convert a flat fixture candidate into EDCData. For wrapped candidates, return edc_data as-is. */
function fixtureCandidateToEDCData(
  c: Record<string, unknown>,
  fixture: FixtureData
): EDCData {
  // Already wrapped — return existing edc_data
  if (c.edc_data) return c.edc_data as EDCData;

  // Flat format — assemble EDCData from top-level fields
  const comp = (c.compensation || {}) as Record<string, string>;
  return {
    candidate_name: (c.candidate_name as string) || '',
    current_title: (c.current_title as string) || '',
    current_company: (c.current_company as string) || '',
    location: (c.location as string) || '',
    photo_url: c.photo_url as string | undefined,
    scope_match: ((c.scope_match || []) as Record<string, string>[]).map(s => ({
      scope: s.scope || s.dimension || '',
      candidate_actual: s.candidate_actual || '',
      role_requirement: s.role_requirement || '',
      alignment: (s.alignment || 'not_assessed') as 'strong' | 'partial' | 'gap' | 'not_assessed',
    })),
    scope_seasoning: (c.scope_seasoning as string) || '',
    key_criteria: (c.key_criteria || []) as EDCData['key_criteria'],
    compensation: {
      current_base: comp.current_base || '',
      current_bonus: comp.current_bonus,
      current_lti: comp.current_lti,
      current_benefits: comp.current_benefits,
      current_total: comp.current_total || '',
      expected_base: comp.expected_base || '',
      expected_bonus: comp.expected_bonus,
      expected_lti: comp.expected_lti,
      expected_benefits: comp.expected_benefits,
      expected_total: comp.expected_total || '',
      flexibility: comp.flexibility || '',
      budget_range: comp.budget_range,
      budget_base: comp.budget_base,
      budget_bonus: comp.budget_bonus,
      budget_lti: comp.budget_lti,
    },
    notice_period: comp.notice_period || (c.notice_period as string) || 'Not mentioned',
    why_interested: (c.why_interested || []) as EDCData['why_interested'],
    potential_concerns: (c.potential_concerns || []) as EDCData['potential_concerns'],
    our_take: (c.our_take || { text: '' }) as EDCData['our_take'],
    search_name: (c.search_name as string) || fixture.client_company || fixture.search_name || '',
    role_title: (c.role_title as string) || fixture.role_title || fixture.search_name || '',
    generated_date: (c.generated_date as string) || '',
    consultant_name: (c.consultant_name as string) || fixture.search_lead || '',
    status: c.status as EDCData['status'],
    motivation_hook: c.motivation_hook as string | undefined,
    our_take_fragments: c.our_take_fragments as string[] | undefined,
    miscellaneous: c.miscellaneous as EDCData['miscellaneous'],
  };
}

// ─── getCandidateData ─────────────────────────────────────────────────────────

export async function getCandidateData(
  searchId: string,
  candidateId: string
): Promise<EDCData | null> {
  const fixture = await loadFixture(searchId);

  // Blob edit overlays only apply to fixture-based searches.
  // Supabase-native searches persist edits to Supabase directly.
  if (fixture) {
    const overlays = await getEditOverlays(searchId);
    if (overlays[candidateId]) {
      const photos = await getPhotoUrls(searchId);
      const overlay = overlays[candidateId];
      if (photos[candidateId]) overlay.photo_url = photos[candidateId];
      return overlay;
    }
  }

  // 0. Fixture with pre-structured candidates — highest priority, no enrichment needed
  if (fixture?.candidates?.length) {
    const match = fixture.candidates.find(
      (c: Record<string, unknown>) => c.candidate_id === candidateId
    );
    if (match) {
      const edcData = fixtureCandidateToEDCData(match, fixture);
      // Attach blob photo if uploaded
      const photos = await getPhotoUrls(searchId);
      if (photos[candidateId]) edcData.photo_url = photos[candidateId];
      return edcData;
    }
  }

  // 1. Try pre-transformed EDC Output Store (structured JSON from Make Engine)
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch, getEDSRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, candidateIdMatchesName, nameToCandidateId, parseKeyCriteria, stripMarkdownJson } = await import('./sheets-transform');

      const outputRows = await getEDCOutputRowsForSearch(searchId);
      const match = outputRows.find((row) => {
        const name = row['candidate_name'] || Object.values(row)[2] || '';
        return candidateIdMatchesName(candidateId, name);
      });

      if (match) {
        const edcJson = match['edc_json'] || Object.values(match)[4] || '';
        if (edcJson) {
          try {
            const parsed = JSON.parse(stripMarkdownJson(edcJson));
            const edcData = normalizeEDCJson(parsed);

            // Enrich from EDS: key_criteria, scope, comp, motivation
            const edsRows = await getEDSRowsForSearch(searchId);
            const edsRow = edsRows.find((row) => {
              const name = Object.values(row)[1] || '';
              return nameToCandidateId(name) === candidateId;
            });
            const eds = edsRow ? Object.values(edsRow) : [];

            // Key criteria enrichment
            const criteriaNames = fixture?.key_criteria_names || [];
            if (criteriaNames.length > 0) {
              if (eds.length > 0) {
                const assessmentText = eds[24] || eds[20] || '';
                if (assessmentText && assessmentText !== 'Not mentioned') {
                  edcData.key_criteria = parseKeyCriteria(assessmentText, criteriaNames);
                } else if (edcData.key_criteria.length === 0) {
                  edcData.key_criteria = criteriaNames.map((n: string) => ({
                    name: n, evidence: 'Assessment pending', context_anchor: undefined,
                  }));
                }
              } else if (edcData.key_criteria.length === 0) {
                edcData.key_criteria = criteriaNames.map((n: string) => ({
                  name: n, evidence: 'Assessment pending', context_anchor: undefined,
                }));
              }
            }

            // Scope, comp, motivation enrichment (requires JS row for scope dimensions)
            if (eds.length > 0) {
              const edsSearchName = eds[0] || searchId;
              const { getJSRow: getJS } = await import('./sheets');
              const jsRow2 = await getJS(edsSearchName)
                || await getJS(searchId)
                || (fixture?.js_search_name ? await getJS(fixture.js_search_name) : null);
              const js2 = jsRow2 ? Object.values(jsRow2) : [];
              const jsScopeDims = (js2[43] as string) || '';

              if (edcData.scope_match.length > 0) {
                enrichScopeFromEDS(edcData, eds, jsScopeDims, fixture?.scope_requirements);
              }
              enrichCompFromEDS(edcData, eds);
              if (edcData.why_interested.length === 0 ||
                  edcData.why_interested.every(w => w.headline === 'See candidate overview' || !w.headline)) {
                enrichMotivationFromEDS(edcData, eds);
              }

              // Fix title if it has Make pipeline prefix
              if (/^IV\s+/i.test(edcData.current_title) || edcData.current_title === 'Not mentioned') {
                const edsTitle = eds[2] || '';
                if (edsTitle && !/^IV\s+/i.test(edsTitle)) {
                  edcData.current_title = edsTitle;
                }
              }

            }

            // Override footer metadata from fixture (outside EDS block — always runs)
            if (fixture?.client_company) edcData.search_name = fixture.client_company;
            else if (fixture?.search_name) edcData.search_name = fixture.search_name;
            if (fixture?.role_title || fixture?.search_name) edcData.role_title = fixture.role_title || fixture.search_name || '';

            console.log('[data] Loaded structured EDC from Output Store for', candidateId);
            return edcData;
          } catch (e) {
            console.warn('[data] Failed to parse EDC Output JSON for', candidateId, ':', e);
          }
        }
      }
    } catch (err) {
      console.warn('[data] EDC Output Store lookup failed, trying raw EDS:', err);
    }
  }

  // 2. Fall back to raw EDS text + transformation
  if (SHEETS_ENABLED) {
    try {
      const { getEDSRowsForSearch, getJSRow } = await import('./sheets');
      const { transformToEDCData, candidateIdMatchesName } = await import('./sheets-transform');

      const edsRows = await getEDSRowsForSearch(searchId);
      const edsRow = edsRows.find((row) => {
        const name = Object.values(row)[1] || '';
        return candidateIdMatchesName(candidateId, name);
      });

      if (edsRow) {
        const searchName = Object.values(edsRow)[0] || searchId;
        const jsRow = await getJSRow(searchName)
          || await getJSRow(searchId)
          || (fixture?.js_search_name ? await getJSRow(fixture.js_search_name) : null);
        const edcData = transformToEDCData(edsRow, jsRow, searchId);

        // Enrich key_criteria from EDS assessment + fixture criteria names
        const eds = Object.values(edsRow);
        const criteriaNames = fixture?.key_criteria_names || [];
        if (criteriaNames.length > 0) {
          const { parseKeyCriteria: parseCriteria } = await import('./sheets-transform');
          const assessmentText = eds[24] || eds[20] || '';
          if (assessmentText && assessmentText !== 'Not mentioned') {
            edcData.key_criteria = parseCriteria(assessmentText, criteriaNames);
          } else if (edcData.key_criteria.length === 0) {
            edcData.key_criteria = criteriaNames.map((name: string) => ({
              name, evidence: 'Assessment pending', context_anchor: undefined,
            }));
          }
        }

        // Scope, comp enrichment
        const js2 = jsRow ? Object.values(jsRow) : [];
        const jsScopeDims2 = (js2[43] as string) || '';
        if (edcData.scope_match.length > 0) {
          enrichScopeFromEDS(edcData, eds, jsScopeDims2, fixture?.scope_requirements);
        }
        enrichCompFromEDS(edcData, eds);

        // Override footer metadata from fixture (same as path 1)
        if (fixture?.client_company) edcData.search_name = fixture.client_company;
        else if (fixture?.search_name) edcData.search_name = fixture.search_name;
        if (fixture?.role_title || fixture?.search_name) edcData.role_title = fixture.role_title || fixture.search_name || '';

        return edcData;
      }
    } catch (err) {
      console.warn('[data] Sheets lookup failed for getCandidateData, falling back:', err);
    }
  }

  // 3. Deck JSON fixture
  const deck = await getDeckData(searchId);
  if (deck) {
    const match = deck.candidates.find((c) => c.candidate_id === candidateId);
    if (match) return match.edc_data;
  }

  // 4. Legacy flat fixtures
  try {
    const fixtureData = await import('../../data/test_fixtures.json');
    const fixtures = fixtureData.default as { candidates: Record<string, EDCData> };
    return fixtures.candidates?.[candidateId] ?? null;
  } catch {
    return null;
  }
}

// ─── getDeckData ──────────────────────────────────────────────────────────────

export async function getDeckData(searchId: string): Promise<SearchContext | null> {
  // Priority chain: Fixture + Blob ALWAYS wins. Supabase is fallback only.
  const fixture = await loadFixture(searchId);

  // 1. Fixture with pre-structured candidates
  if (fixture?.candidates?.length) {
    const candidates = fixture.candidates.map((c: Record<string, unknown>) => {
      // Already IntroCardData shaped (has edc_data) — pass through with enriched footer
      if (c.edc_data) {
        const edcData = c.edc_data as EDCData;
        if (fixture.client_company) edcData.search_name = fixture.client_display_name || fixture.client_company;
        if (fixture.role_title || fixture.search_name) edcData.role_title = fixture.role_title || fixture.search_name || '';
        return c as unknown as IntroCardData;
      }
      // Flat fixture candidate — wrap into IntroCardData shape
      const edcData = fixtureCandidateToEDCData(c, fixture);
      const name = (c.candidate_name as string) || '';
      const initials = name.split(/\s+/).length >= 2
        ? `${name.split(/\s+/)[0][0]}${name.split(/\s+/).pop()?.[0] || ''}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
      return {
        candidate_id: (c.candidate_id as string) || '',
        candidate_name: name,
        current_title: (c.current_title as string) || '',
        current_company: (c.current_company as string) || '',
        location: (c.location as string) || '',
        initials,
        compensation_alignment: 'not_set' as const,
        edc_data: edcData,
      } as IntroCardData;
    });

    // Attach uploaded photos and edit overlays from Vercel Blob
    const [photos, editOverlays, cardOrder, hiddenCandidates] = await Promise.all([
      getPhotoUrls(searchId),
      getEditOverlays(searchId),
      getCardOrder(searchId),
      getHiddenCandidates(searchId),
    ]);
    console.log('[getDeckData] Edit overlays found:', Object.keys(editOverlays));
    applyEditOverlays(candidates, editOverlays);
    // Photos must be attached AFTER overlays — overlays replace entire edc_data,
    // which would wipe photo_url set by attachPhotos if run before.
    attachPhotos(candidates, photos);

    // Enforce deck-level criteria names — Blob overlays may contain stale names
    const deckCriteriaNames: string[] = fixture.key_criteria_names || [];
    if (deckCriteriaNames.length > 0) {
      for (const c of candidates) {
        if (!c.edc_data?.key_criteria?.length) continue;
        for (let i = 0; i < c.edc_data.key_criteria.length && i < deckCriteriaNames.length; i++) {
          c.edc_data.key_criteria[i].name = deckCriteriaNames[i];
        }
      }
    }

    const context: SearchContext = {
      search_name: fixture.search_name || searchId,
      role_title: fixture.role_title || fixture.search_name || searchId,
      client_company: fixture.client_company || '',
      client_display_name: fixture.client_display_name,
      client_location: fixture.client_location || (fixture as unknown as Record<string, string>).location || '',
      client_logo_url: fixture.client_logo_url,
      key_criteria_names: fixture.key_criteria_names || [],
      search_lead: fixture.search_lead || '',
      candidate_statuses: fixture.candidate_statuses,
      deck_settings: fixture.deck_settings,
      candidates,
    };
    if (cardOrder) context.card_order = cardOrder;
    if (hiddenCandidates) context.hidden_candidates = hiddenCandidates;
    return context;
  }

  // 1b. Supabase — for Supabase-native searches (e.g., ktj-cor-ctl) that have no fixture
  if (SUPABASE_ENABLED) {
    const supabaseData = await getSupabaseDeckData(searchId);
    if (supabaseData) {
      // Supabase is canonical for these searches — do NOT load Blob edit overlays,
      // which may contain stale pre-Engine data that would overwrite rich edc_data.
      // (The save handler already skips Blob writes for Supabase-native searches.)
      // Still load photos, card order, and hidden candidates from Blob.
      const [photos, savedOrder, hiddenCandidates] = await Promise.all([
        getPhotoUrls(searchId),
        getCardOrder(searchId),
        getHiddenCandidates(searchId),
      ]);
      if (Object.keys(photos).length > 0) attachPhotos(supabaseData.candidates, photos);
      if (savedOrder) supabaseData.card_order = savedOrder;
      if (hiddenCandidates) supabaseData.hidden_candidates = hiddenCandidates;

      // Fetch pristine Engine criteria directly and inject into candidates.
      // ai_generated_edc is never modified by auto-save, so it's always correct.
      try {
        const { getServiceClient } = await import('./supabase');
        const { resolveSearchId } = await import('./supabase-data');
        const searchUUID = await resolveSearchId(searchId);
        if (searchUUID) {
          const sb = getServiceClient();
          const { data: aiRows } = await sb
            .from('candidates')
            .select('candidate_slug, ai_generated_edc')
            .eq('search_id', searchUUID);
          if (aiRows) {
            const aiMap = new Map<string, Record<string, unknown>>();
            for (const r of aiRows) {
              if (r.ai_generated_edc && typeof r.ai_generated_edc === 'object') {
                aiMap.set(r.candidate_slug as string, r.ai_generated_edc as Record<string, unknown>);
              }
            }
            for (const c of supabaseData.candidates) {
              if (!c.edc_data) continue;
              const ai = aiMap.get(c.candidate_id);
              if (ai?.key_criteria && Array.isArray(ai.key_criteria) && ai.key_criteria.length > 0) {
                c.edc_data.key_criteria = ai.key_criteria as EDCData['key_criteria'];
              }
            }
          }
        }
      } catch (err) {
        console.warn('[getDeckData] ai_generated_edc fetch failed, using edc_data as-is:', err);
      }

      // Seed criteria from search-level names only for candidates without any evidence
      const deckCriteriaNames = supabaseData.key_criteria_names || [];
      if (deckCriteriaNames.length > 0) {
        for (const c of supabaseData.candidates) {
          if (!c.edc_data) continue;
          if (c.edc_data.key_criteria?.length > 0 && c.edc_data.key_criteria[0]?.evidence) continue;
          c.edc_data.key_criteria = deckCriteriaNames.map((name) => ({
            name,
            evidence: '',
            context_anchor: '',
          }));
        }
      }

      // Always set search_name and role_title from search context (authoritative source)
      const ctxSearchName = supabaseData.search_name || '';
      const ctxRoleTitle = supabaseData.role_title || '';
      for (const c of supabaseData.candidates) {
        if (!c.edc_data) continue;
        c.edc_data.search_name = ctxSearchName;
        c.edc_data.role_title = ctxRoleTitle;
      }

      return supabaseData;
    }
  }

  // 2. Try pre-transformed EDC Output Store for structured candidates (Sheets)
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch, getJSRow, getEDSRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, nameToCandidateId, parseKeyCriteria, stripMarkdownJson } = await import('./sheets-transform');

      const outputRows = await getEDCOutputRowsForSearch(searchId);

      if (outputRows.length > 0) {
        // Load EDS rows for supplementary data
        const edsRows = await getEDSRowsForSearch(searchId);
        const edsSearchName = edsRows.length > 0
          ? (Object.values(edsRows[0])[0] || searchId)
          : searchId;
        // Try JS lookup by EDS search_key first (getJSRow now matches on col 0 OR col 1)
        const jsRow = await getJSRow(edsSearchName)
          || await getJSRow(searchId)
          || (fixture?.js_search_name ? await getJSRow(fixture.js_search_name) : null);
        const js = jsRow ? Object.values(jsRow) : [];

        // JS criteria names
        const keyCriteriaNames: string[] = [];
        for (let i = 9; i <= 21; i += 3) {
          const name = js[i]?.trim();
          if (name) keyCriteriaNames.push(name);
        }

        // JS scope dimensions with role requirements (column 43+)
        const jsScopeDimensions = js[43] || '';

        // Fixture criteria names are sacred — always prefer over JS names
        const fixtureCriteriaNames = fixture?.key_criteria_names || [];
        const effectiveCriteriaNames = fixtureCriteriaNames.length > 0
          ? fixtureCriteriaNames
          : keyCriteriaNames;
        const fixtureStatuses = fixture?.candidate_statuses || {};

        // Build candidates from structured EDC JSON
        const candidates = outputRows
          .map((row) => {
            const edcJson = row['edc_json'] || Object.values(row)[4] || '';
            if (!edcJson) return null;
            try {
              const parsed = JSON.parse(stripMarkdownJson(edcJson));
              const edcData = normalizeEDCJson(parsed);
              const name = edcData.candidate_name;
              const candidateId = nameToCandidateId(name);

              // Find corresponding EDS row for enrichment
              const edsRow = edsRows.find((r) => {
                const rName = Object.values(r)[1] || '';
                return nameToCandidateId(rName) === candidateId;
              });
              const eds = edsRow ? Object.values(edsRow) : [];

              // ── Always enrich key_criteria from EDS when criteria names available ──
              if (effectiveCriteriaNames.length > 0 && eds.length > 0) {
                const assessmentText = eds[24] || eds[20] || '';
                if (assessmentText && assessmentText !== 'Not mentioned') {
                  edcData.key_criteria = parseKeyCriteria(assessmentText, effectiveCriteriaNames);
                } else if (edcData.key_criteria.length === 0) {
                  edcData.key_criteria = effectiveCriteriaNames.map((n) => ({
                    name: n,
                    evidence: 'Assessment pending',
                    context_anchor: undefined,
                  }));
                }
              }

              // ── Enrich scope_match candidate_actual from EDS ──
              if (edcData.scope_match.length > 0 && eds.length > 0) {
                enrichScopeFromEDS(edcData, eds, jsScopeDimensions, fixture?.scope_requirements);
              }

              // ── Enrich compensation from EDS if not parsed ──
              if (eds.length > 0) {
                enrichCompFromEDS(edcData, eds);
              }

              // ── Enrich motivation from EDS ──
              if (edcData.why_interested.length === 0 ||
                  (edcData.why_interested.length === 1 && edcData.why_interested[0].headline === 'See candidate overview')) {
                enrichMotivationFromEDS(edcData, eds);
              }

              const initials = name.split(/\s+/).length >= 2
                ? `${name.split(/\s+/)[0][0]}${name.split(/\s+/).pop()?.[0] || ''}`.toUpperCase()
                : name.slice(0, 2).toUpperCase();

              // Merge status from fixture
              if (fixtureStatuses[candidateId]) {
                edcData.status = fixtureStatuses[candidateId] as EDCData['status'];
              }

              // Fix title if it has Make pipeline prefix
              if (/^IV\s+/i.test(edcData.current_title) || edcData.current_title === 'Not mentioned') {
                const edsTitle = eds[2] || '';
                if (edsTitle && !/^IV\s+/i.test(edsTitle)) {
                  edcData.current_title = edsTitle;
                }
              }

              // Override footer metadata from fixture — search_name uses client_company,
              // role_title uses fixture search_name (the role portion)
              if (fixture?.client_company) {
                edcData.search_name = fixture.client_company;
              } else if (fixture?.search_name) {
                edcData.search_name = fixture.search_name;
              }
              if (fixture?.role_title || fixture?.search_name) {
                edcData.role_title = fixture.role_title || fixture.search_name || '';
              }

              return {
                candidate_id: candidateId,
                candidate_name: name,
                current_title: edcData.current_title,
                current_company: edcData.current_company,
                location: edcData.location,
                initials,
                flash_summary: edcData.why_interested?.[0]?.detail?.slice(0, 160) || '',
                key_strengths: edcData.key_criteria.slice(0, 3).map((k: { name: string }) => k.name),
                notice_period: edcData.notice_period !== 'Not mentioned' ? edcData.notice_period : undefined,
                compensation_alignment: 'not_set' as const,
                edc_data: edcData,
              };
            } catch (e) {
              console.warn('[data] Failed to parse EDC Output row:', e);
              return null;
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        if (candidates.length > 0) {
          console.log('[data] Loaded structured deck from EDC Output Store for', searchId, `(${candidates.length} candidates)`);
          const [photos, eo1, co1, hc1] = await Promise.all([getPhotoUrls(searchId), getEditOverlays(searchId), getCardOrder(searchId), getHiddenCandidates(searchId)]);
          console.log('[getDeckData] Edit overlays found:', Object.keys(eo1));
          applyEditOverlays(candidates, eo1);
          attachPhotos(candidates, photos);
          // Enforce deck-level criteria names over stale overlay names
          if (effectiveCriteriaNames.length > 0) {
            for (const c of candidates) {
              if (!c.edc_data?.key_criteria?.length) continue;
              for (let i = 0; i < c.edc_data.key_criteria.length && i < effectiveCriteriaNames.length; i++) {
                c.edc_data.key_criteria[i].name = effectiveCriteriaNames[i];
              }
            }
          }
          const ctx1: SearchContext = {
            search_name: fixture?.search_name || js[0] || searchId,
            role_title: fixture?.role_title || fixture?.search_name || js[0] || searchId,
            client_company: fixture?.client_company || js[3] || 'Not specified',
            client_location: fixture?.client_location || js[4] || '',
            client_logo_url: fixture?.client_logo_url,
            key_criteria_names: effectiveCriteriaNames,
            search_lead: fixture?.search_lead || js[2] || 'SmartSearch',
            candidate_statuses: Object.keys(fixtureStatuses).length > 0 ? fixtureStatuses : undefined,
            deck_settings: fixture?.deck_settings,
            candidates,
          };
          if (co1) ctx1.card_order = co1;
          if (hc1) ctx1.hidden_candidates = hc1;
          return ctx1;
        }
      }
    } catch (err) {
      console.warn('[data] EDC Output Store deck lookup failed, trying raw EDS:', err);
    }
  }

  // 2. Fall back to raw EDS text + transformation
  if (SHEETS_ENABLED) {
    try {
      const { getEDSRowsForSearch, getJSRow } = await import('./sheets');
      const { transformToSearchContext } = await import('./sheets-transform');

      const edsRows = await getEDSRowsForSearch(searchId);
      if (edsRows.length > 0) {
        const searchName = Object.values(edsRows[0])[0] || searchId;
        const jsRow = await getJSRow(searchName)
          || await getJSRow(searchId)
          || (fixture?.js_search_name ? await getJSRow(fixture.js_search_name) : null);
        const context = transformToSearchContext(edsRows, jsRow, searchId);

        // Merge fixture metadata
        if (fixture) {
          if (fixture.candidate_statuses) context.candidate_statuses = fixture.candidate_statuses;
          if (fixture.deck_settings) context.deck_settings = fixture.deck_settings;
          if (fixture.client_logo_url) context.client_logo_url = fixture.client_logo_url;
          if (fixture.search_name) context.search_name = fixture.search_name;
          if (fixture.role_title || fixture.search_name) context.role_title = fixture.role_title || fixture.search_name;
          if (fixture.client_company) context.client_company = fixture.client_company;
          if (fixture.search_lead) context.search_lead = fixture.search_lead;
          if (fixture.key_criteria_names?.length) {
            if (!context.key_criteria_names?.length) {
              context.key_criteria_names = fixture.key_criteria_names;
            }
          }
        }

        // Enrich each candidate with criteria, scope, comp, and footer from EDS + fixture
        const { parseKeyCriteria: parseCriteria, nameToCandidateId: toId } = await import('./sheets-transform');
        const fixtureCriteriaNames = fixture?.key_criteria_names || [];
        const jsScopeDims = (jsRow ? Object.values(jsRow)[43] : '') || '';

        for (const candidate of context.candidates) {
          const edcData = candidate.edc_data;
          if (!edcData) continue;

          // Find matching EDS row for this candidate
          const edsRow2 = edsRows.find((r) => {
            const rName = Object.values(r)[1] || '';
            return toId(rName) === candidate.candidate_id;
          });
          const eds = edsRow2 ? Object.values(edsRow2) : [];

          // Key criteria enrichment from EDS assessment text
          if (fixtureCriteriaNames.length > 0 && eds.length > 0) {
            const assessmentText = eds[24] || eds[20] || '';
            if (assessmentText && assessmentText !== 'Not mentioned') {
              edcData.key_criteria = parseCriteria(assessmentText, fixtureCriteriaNames);
            } else if (edcData.key_criteria.length === 0) {
              edcData.key_criteria = fixtureCriteriaNames.map((n: string) => ({
                name: n, evidence: 'Assessment pending', context_anchor: undefined,
              }));
            }
          } else if (fixtureCriteriaNames.length > 0 && edcData.key_criteria.length === 0) {
            edcData.key_criteria = fixtureCriteriaNames.map((n: string) => ({
              name: n, evidence: 'Assessment pending', context_anchor: undefined,
            }));
          }

          // Scope enrichment
          if (edcData.scope_match.length > 0 && eds.length > 0) {
            enrichScopeFromEDS(edcData, eds, jsScopeDims, fixture?.scope_requirements);
          }

          // Compensation enrichment
          if (eds.length > 0) {
            enrichCompFromEDS(edcData, eds);
          }

          // Footer override from fixture
          if (fixture?.client_company) edcData.search_name = fixture.client_company;
          else if (fixture?.search_name) edcData.search_name = fixture.search_name;
          if (fixture?.role_title || fixture?.search_name) edcData.role_title = fixture.role_title || fixture.search_name || '';

          // Merge status from fixture
          const statuses = fixture?.candidate_statuses || {};
          if (statuses[candidate.candidate_id]) {
            edcData.status = statuses[candidate.candidate_id] as EDCData['status'];
          }
        }

        const [photos2, eo2, co2, hc2] = await Promise.all([
          getPhotoUrls(searchId),
          getEditOverlays(searchId),
          getCardOrder(searchId),
          getHiddenCandidates(searchId),
        ]);
        applyEditOverlays(context.candidates, eo2);
        attachPhotos(context.candidates, photos2);
        // Enforce deck-level criteria names over stale overlay names
        const ctxCriteriaNames = context.key_criteria_names || [];
        if (ctxCriteriaNames.length > 0) {
          for (const c of context.candidates) {
            if (!c.edc_data?.key_criteria?.length) continue;
            for (let i = 0; i < c.edc_data.key_criteria.length && i < ctxCriteriaNames.length; i++) {
              c.edc_data.key_criteria[i].name = ctxCriteriaNames[i];
            }
          }
        }
        if (co2) context.card_order = co2;
        if (hc2) context.hidden_candidates = hc2;
        return context;
      }
    } catch (err) {
      console.warn('[data] Sheets lookup failed for getDeckData, falling back:', err);
    }
  }

  // 3. JSON fixture file
  if (fixture) return fixture;

  return null;
}

// ─── EDS Enrichment Helpers ──────────────────────────────────────────────────

/** Enrich scope_match with candidate_actual and role_requirement */
function enrichScopeFromEDS(
  edcData: EDCData,
  eds: string[],
  jsScopeDimensions: string,
  fixtureRequirements?: Record<string, string>
) {
  const allCandidateEmpty = edcData.scope_match.every(
    (s) => s.candidate_actual === 'Not assessed' || !s.candidate_actual
  );

  const scopeText = eds[21] || '';
  const assessmentText = eds[20] || '';
  const overviewText = eds[23] || '';

  // EDS field-based candidate actuals (specific columns → dimensions)
  const fieldMap: Record<string, string | undefined> = {
    headcount: eds[7] || undefined,  // total_team_size
    team: eds[7] || undefined,
    geography: eds[4] || undefined,  // location
    location: eds[4] || undefined,
    industry: eds[9] || undefined,   // primary_industry
    sector: eds[9] || undefined,
  };

  for (const scopeItem of edcData.scope_match) {
    const dimLower = scopeItem.scope.toLowerCase();

    // ── CANDIDATE ACTUAL (only when not already populated) ──
    if (allCandidateEmpty) {
      // 1. Try prose text search in scope column + assessment
      const scopeMatch = findValueForDimension(scopeText, dimLower);
      if (scopeMatch) {
        scopeItem.candidate_actual = scopeMatch;
      }
      if (scopeItem.candidate_actual === 'Not assessed' || !scopeItem.candidate_actual) {
        const assessMatch = findValueForDimension(assessmentText, dimLower);
        if (assessMatch) scopeItem.candidate_actual = assessMatch;
      }

      // 2. Try specific EDS field mapping
      if (scopeItem.candidate_actual === 'Not assessed' || !scopeItem.candidate_actual) {
        for (const [key, value] of Object.entries(fieldMap)) {
          if (dimLower.includes(key) && value && value.trim()) {
            scopeItem.candidate_actual = value.trim();
            break;
          }
        }
      }

      // 3. For P&L/revenue: regex search in assessment + overview
      if (scopeItem.candidate_actual === 'Not assessed' || !scopeItem.candidate_actual) {
        if (dimLower.includes('p&l') || dimLower.includes('revenue') || dimLower.includes('turnover')) {
          const combined = (assessmentText + ' ' + overviewText);
          const revenueMatch = combined.match(
            /(?:revenue|turnover|p&l|sales)\s*(?:of|:)?\s*(?:approximately?\s*)?([€$£][\d,.']+\s*(?:m(?:illion)?|bn|k)?)/i
          );
          if (revenueMatch) scopeItem.candidate_actual = revenueMatch[1].trim();
        }
      }
    }

    // ── ROLE REQUIREMENT (always try — fixture requirements are search-level constants) ──

    // 1. Try fixture requirements map first (most reliable for Norican)
    if ((scopeItem.role_requirement === 'Not specified' || !scopeItem.role_requirement) && fixtureRequirements) {
      for (const [key, value] of Object.entries(fixtureRequirements)) {
        if (dimLower.includes(key.toLowerCase()) || key.toLowerCase().includes(dimLower.split(/\s+/)[0])) {
          scopeItem.role_requirement = value;
          break;
        }
      }
    }

    // 2. Try JS scope dimensions text as fallback
    if ((scopeItem.role_requirement === 'Not specified' || !scopeItem.role_requirement) && jsScopeDimensions) {
      const reqMatch = findValueForDimension(jsScopeDimensions, dimLower);
      if (reqMatch) scopeItem.role_requirement = reqMatch;
    }

    // ── ALIGNMENT — auto-compute when not already set ──
    // If alignment is still not_assessed but we have candidate data, promote to partial
    // (true alignment assessment requires human judgment — partial is a safe default)
    if (scopeItem.alignment === 'not_assessed' || !scopeItem.alignment) {
      const hasCandidate = scopeItem.candidate_actual && scopeItem.candidate_actual !== 'Not assessed';
      if (hasCandidate) {
        scopeItem.alignment = 'partial';
      }
    }
  }
}

/** Search text for a value associated with a dimension name */
function findValueForDimension(text: string, dimName: string): string | null {
  if (!text) return null;

  // Normalize for matching
  const lowerText = text.toLowerCase();
  const dimIdx = lowerText.indexOf(dimName);
  if (dimIdx === -1) {
    // Try partial match
    const shortDim = dimName.split(/\s+/)[0]; // e.g., "p&l" from "p&l responsibility"
    const shortIdx = lowerText.indexOf(shortDim);
    if (shortIdx === -1) return null;
    return extractValueNear(text, shortIdx);
  }
  return extractValueNear(text, dimIdx);
}

/** Extract a value near a position in text — looks for amounts, parenthetical content, or colon-separated values */
function extractValueNear(text: string, pos: number): string | null {
  const after = text.slice(pos, pos + 200);

  // Pattern: "Dimension: value" or "Dimension - value"
  const colonMatch = after.match(/^[^:\-–(]*[:\-–]\s*(.{5,80?)(?=[,;\n]|$)/);
  if (colonMatch) return colonMatch[1].trim();

  // Pattern: "Dimension (value)"
  const parenMatch = after.match(/^[^(]*\(([^)]{3,80})\)/);
  if (parenMatch) return parenMatch[1].trim();

  // Pattern: currency amount nearby
  const amountMatch = after.match(/[€$£][\d,.']+\s*(?:k|K|m|M|million|thousand)?/);
  if (amountMatch) return amountMatch[0].trim();

  return null;
}

/** Detect "not disclosed" / "not mentioned" patterns in comp text */
function isCompNotDisclosed(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('not disclosed') || lower.includes('were not provided') ||
    lower.includes('did not disclose') || lower.includes('not mentioned during') ||
    lower.includes('declined to share') || lower.includes('chose not to');
}

/** Extract the first currency amount from prose, move rest to flexibility */
function extractAmountFromProse(
  comp: EDCData['compensation'],
  field: 'expected_total' | 'expected_base' | 'current_total' | 'current_base'
) {
  const val = comp[field];
  if (!val || val.length <= 80) return;
  const amountMatch = val.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?(?:\s*(?:k|K|p\.a\.))?/);
  if (amountMatch) {
    const prose = val;
    comp[field] = amountMatch[0];
    if (!comp.flexibility || comp.flexibility === 'Not mentioned') {
      comp.flexibility = prose;
    }
  }
}

/** Enrich compensation from EDS raw columns */
function enrichCompFromEDS(edcData: EDCData, eds: string[]) {
  const comp = edcData.compensation;
  const currentText = eds[10] || '';
  const expectedText = eds[11] || '';

  // ── Current compensation ──
  if (isCompNotDisclosed(currentText) || isCompNotDisclosed(comp.current_total)) {
    comp.current_base = 'Not disclosed';
    comp.current_total = 'Not disclosed';
    comp.current_bonus = undefined;
    comp.current_lti = undefined;
    comp.current_benefits = undefined;
  } else if (currentText) {
    // Always re-parse from EDS raw text when available — normalizeEDCJson
    // uses a weaker parser that can't handle inline + / = delimiters
    const parsed = parseCompFromBlob(currentText);
    if (parsed.base) comp.current_base = parsed.base;
    if (parsed.bonus) comp.current_bonus = parsed.bonus;
    if (parsed.lti) comp.current_lti = parsed.lti;
    if (parsed.benefits) comp.current_benefits = parsed.benefits;
    if (parsed.total) comp.current_total = parsed.total;
  }

  // ── Expected compensation ──
  if (isCompNotDisclosed(expectedText) || isCompNotDisclosed(comp.expected_total)) {
    comp.expected_base = 'Not disclosed';
    comp.expected_total = 'Not disclosed';
    comp.expected_bonus = undefined;
    comp.expected_lti = undefined;
    comp.expected_benefits = undefined;
  } else if (expectedText) {
    // Check for "not explicitly stated" or pure prose without amounts
    const lower = expectedText.toLowerCase();
    if (lower.includes('not explicitly stated') || lower.includes('to be discussed') ||
        lower.includes('to be confirmed') || lower.includes('would need to be discussed')) {
      // Extract amount if one exists, otherwise mark as TBD
      const amountMatch = expectedText.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?/);
      comp.expected_total = amountMatch ? amountMatch[0] : 'To be discussed';
      comp.expected_base = 'Not mentioned';
      comp.expected_bonus = undefined;
      comp.expected_lti = undefined;
      comp.expected_benefits = undefined;
      // Move prose to flexibility
      if (!comp.flexibility || comp.flexibility === 'Not mentioned') {
        comp.flexibility = expectedText;
      }
    } else {
      const parsed = parseCompFromBlob(expectedText);
      if (parsed.base) comp.expected_base = parsed.base;
      if (parsed.bonus) comp.expected_bonus = parsed.bonus;
      if (parsed.lti) comp.expected_lti = parsed.lti;
      if (parsed.benefits) comp.expected_benefits = parsed.benefits;
      if (parsed.total) comp.expected_total = parsed.total;
    }
  }

  // Extract amounts from any remaining long prose fields
  extractAmountFromProse(comp, 'expected_total');
  extractAmountFromProse(comp, 'expected_base');
  extractAmountFromProse(comp, 'current_total');
  extractAmountFromProse(comp, 'current_base');
}

/** Parse a compensation text blob into structured components.
 *  Handles both line-separated and inline formats like:
 *  "Base: €190,000 + Bonus: €50,000 = Total: €240,000" */
function parseCompFromBlob(text: string): {
  base?: string; bonus?: string; lti?: string; benefits?: string; total?: string;
} {
  if (!text) return {};
  if (isCompNotDisclosed(text)) return {};

  const result: { base?: string; bonus?: string; lti?: string; benefits?: string; total?: string } = {};

  // Find all label positions in the text using a single regex
  // Handles labels preceded by +, ;, =, newlines, commas, or start-of-string
  const labelRegex = /(?:^|[+;=\n,]\s*)((?:base(?:\s+salary)?|fixed(?:\s+salary)?|bonus|variable|sti|short-term(?:\s+incentive)?|lti[p]?|equity|long-term(?:\s+incentive)?|benefits?|other|total(?:\s+(?:package|comp(?:ensation)?))?)\s*[:=])\s*/gi;

  const labels: { type: string; valueStart: number }[] = [];
  let match;
  while ((match = labelRegex.exec(text)) !== null) {
    const labelText = match[1].toLowerCase().replace(/\s*[:=]\s*$/, '').trim();
    let type: string;
    if (labelText.startsWith('base') || labelText.startsWith('fixed')) type = 'base';
    else if (labelText.startsWith('bonus') || labelText.startsWith('variable') || labelText.startsWith('sti') || labelText.startsWith('short-term')) type = 'bonus';
    else if (labelText.startsWith('lti') || labelText.startsWith('equity') || labelText.startsWith('long-term')) type = 'lti';
    else if (labelText.startsWith('benefit') || labelText.startsWith('other')) type = 'benefits';
    else if (labelText.startsWith('total')) type = 'total';
    else continue;
    labels.push({ type, valueStart: match.index + match[0].length });
  }

  // Extract value between each label and the next (or end of string)
  for (let i = 0; i < labels.length; i++) {
    const valueEnd = i + 1 < labels.length ? labels[i + 1].valueStart - (labels[i + 1].type.length + 2) : text.length;
    const rawValue = text.slice(labels[i].valueStart, Math.max(labels[i].valueStart, valueEnd))
      .trim().replace(/[+;=,]\s*$/, '').trim();
    const key = labels[i].type as keyof typeof result;
    if (!result[key] && rawValue) {
      result[key] = key === 'benefits' ? rawValue.slice(0, 120) : extractCompAmount(rawValue);
    }
  }

  // Fallback: parenthetical total
  if (!result.total) {
    const totalMatch = text.match(/total(?:\s+(?:fixed|package|comp(?:ensation)?))?\s*[:=]\s*([€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?(?:\s*(?:k|K|p\.a\.))?)/i);
    if (totalMatch) result.total = totalMatch[1].trim();
  }

  // Fallback: first amount as base
  if (!result.base && !result.total) {
    const firstAmount = text.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?/);
    if (firstAmount) {
      const beforeAmount = text.slice(0, text.indexOf(firstAmount[0])).toLowerCase();
      if (beforeAmount.includes('base') || beforeAmount.includes('fixed') || beforeAmount.length < 20) {
        result.base = firstAmount[0];
      }
    }
  }

  return result;
}

/** Extract a clean amount from a comp string, preserving ranges */
function extractCompAmount(text: string): string {
  // Try to get the amount + range from the start
  const amountMatch = text.match(/^([€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?(?:\s*(?:k|K|p\.a\.|per\s+annum|annually|per\s+year))?)/);
  if (amountMatch) return amountMatch[1].trim();

  // Try currency amount anywhere
  const anyMatch = text.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?/);
  if (anyMatch) return anyMatch[0].trim();

  // If it's short enough, return as-is
  if (text.length <= 80) return text.trim();

  return text.slice(0, 80).trim() + '...';
}

/** Enrich motivation from EDS overview/assessment */
function enrichMotivationFromEDS(edcData: EDCData, eds: string[]) {
  const overview = eds[23] || ''; // candidate_overview
  const assessment = eds[20] || ''; // execflow_ai_assessment
  const keyStrength = eds[17] || ''; // key_strength

  // Try to extract push/pull from assessment
  const items: EDCData['why_interested'] = [];

  // Look for pull factors (positive reasons to join)
  const pullPatterns = [
    /(?:interested|attracted|motivated|drawn|excited)\s+(?:by|in|about)\s+(.{10,80}?)(?:\.|;|$)/gi,
    /(?:opportunity|role|position)\s+(?:to|for)\s+(.{10,60}?)(?:\.|;|$)/gi,
  ];
  for (const pattern of pullPatterns) {
    let match;
    const searchText = overview || assessment;
    while ((match = pattern.exec(searchText)) !== null && items.length < 2) {
      items.push({ type: 'pull', headline: match[1].trim(), detail: '' });
    }
  }

  // Look for push factors (reasons to leave current role)
  const pushPatterns = [
    /(?:limited|lack(?:ing)?|no\s+(?:room|opportunity)|ceiling|frustrated|outgrown|stagnant)\s+(.{5,60}?)(?:\.|;|$)/gi,
  ];
  for (const pattern of pushPatterns) {
    let match;
    const searchText = overview || assessment;
    while ((match = pattern.exec(searchText)) !== null && items.length < 3) {
      items.push({ type: 'push', headline: match[0].trim().slice(0, 60), detail: '' });
    }
  }

  // If we found items, use them. If key_strength exists, add as pull.
  if (items.length === 0 && keyStrength && keyStrength !== 'Not mentioned') {
    items.push({ type: 'pull', headline: keyStrength.slice(0, 80), detail: '' });
  }

  if (items.length > 0) {
    edcData.why_interested = items;
  } else {
    // No motivation data — set empty so component can hide itself
    edcData.why_interested = [];
  }
}

// ─── getSearchCandidates (legacy) ────────────────────────────────────────────

export async function getSearchCandidates(_searchId: string): Promise<string[]> {
  try {
    const fixtureData = await import('../../data/test_fixtures.json');
    const fixtures = fixtureData.default as { candidates: Record<string, EDCData> };
    return Object.keys(fixtures.candidates ?? {});
  } catch {
    return [];
  }
}
