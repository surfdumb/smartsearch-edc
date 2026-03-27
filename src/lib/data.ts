import type { EDCData, SearchContext } from './types';

// ─── Data fetching abstraction ────────────────────────────────────────────────
// Priority order:
//   1. Google Sheets (when GOOGLE_SERVICE_ACCOUNT_EMAIL is set)
//   2. JSON fixtures in /data/decks/[searchId].json
//   3. Legacy flat fixtures in /data/test_fixtures.json

const SHEETS_ENABLED = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

// ─── getCandidateData ─────────────────────────────────────────────────────────

export async function getCandidateData(
  searchId: string,
  candidateId: string
): Promise<EDCData | null> {
  // 1. Try pre-transformed EDC Output Store (structured JSON from Make Engine)
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, candidateIdMatchesName } = await import('./sheets-transform');

      const outputRows = await getEDCOutputRowsForSearch(searchId);
      const match = outputRows.find((row) => {
        const name = row['candidate_name'] || Object.values(row)[2] || '';
        return candidateIdMatchesName(candidateId, name);
      });

      if (match) {
        const edcJson = match['edc_json'] || Object.values(match)[4] || '';
        if (edcJson) {
          try {
            const parsed = JSON.parse(edcJson);
            const edcData = normalizeEDCJson(parsed);

            // If key_criteria is empty, populate from deck fixture criteria names
            if (edcData.key_criteria.length === 0) {
              try {
                const deckData = await import(`../../data/decks/${searchId}.json`);
                const fixture = deckData.default as SearchContext;
                if (fixture?.key_criteria_names?.length > 0) {
                  edcData.key_criteria = fixture.key_criteria_names.map((name: string) => ({
                    name,
                    evidence: 'Assessment pending',
                    context_anchor: undefined,
                  }));
                }
              } catch { /* no fixture */ }
            }

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
        const jsRow = await getJSRow(searchName);
        const edcData = transformToEDCData(edsRow, jsRow, searchId);

        // Populate empty key_criteria from deck fixture criteria names
        if (edcData.key_criteria.length === 0) {
          try {
            const deckData = await import(`../../data/decks/${searchId}.json`);
            const fixture = deckData.default as SearchContext;
            if (fixture?.key_criteria_names?.length > 0) {
              edcData.key_criteria = fixture.key_criteria_names.map((name: string) => ({
                name,
                evidence: 'Assessment pending',
                context_anchor: undefined,
              }));
            }
          } catch { /* no fixture */ }
        }

        return edcData;
      }
    } catch (err) {
      console.warn('[data] Sheets lookup failed for getCandidateData, falling back:', err);
    }
  }

  // 2. Deck JSON fixture
  const deck = await getDeckData(searchId);
  if (deck) {
    const match = deck.candidates.find((c) => c.candidate_id === candidateId);
    if (match) return match.edc_data;
  }

  // 3. Legacy flat fixtures
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
  // 1. Try pre-transformed EDC Output Store for structured candidates
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch, getJSRow, getEDSRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, nameToCandidateId } = await import('./sheets-transform');

      const outputRows = await getEDCOutputRowsForSearch(searchId);

      if (outputRows.length > 0) {
        // We have structured EDC data — build SearchContext from it
        // Still need JS row for search-level metadata (client name, criteria names, etc.)

        // Try to get JS row for search context metadata
        // Use EDS rows to find the search_name → JS lookup
        const edsRows = await getEDSRowsForSearch(searchId);
        const edsSearchName = edsRows.length > 0
          ? (Object.values(edsRows[0])[0] || searchId)
          : searchId;
        const jsRow = await getJSRow(edsSearchName);
        const js = jsRow ? Object.values(jsRow) : [];

        // JS criteria names for the search context header + fallback population
        const keyCriteriaNames: string[] = [];
        for (let i = 9; i <= 21; i += 3) {
          const name = js[i]?.trim();
          if (name) keyCriteriaNames.push(name);
        }

        // Load deck fixture for criteria names, candidate statuses, and other metadata
        let fixtureCriteriaNames: string[] = keyCriteriaNames;
        let fixtureStatuses: Record<string, string> = {};
        let fixtureContext: Partial<SearchContext> = {};
        try {
          const deckData = await import(`../../data/decks/${searchId}.json`);
          const fixture = deckData.default as SearchContext & { candidate_statuses?: Record<string, string> };
          fixtureContext = fixture;
          if (fixture?.key_criteria_names?.length > 0 && fixtureCriteriaNames.length === 0) {
            fixtureCriteriaNames = fixture.key_criteria_names;
          }
          if (fixture?.candidate_statuses) {
            fixtureStatuses = fixture.candidate_statuses;
          }
        } catch { /* no fixture */ }

        // Build candidates from structured EDC JSON
        const candidates = outputRows
          .map((row) => {
            const edcJson = row['edc_json'] || Object.values(row)[4] || '';
            if (!edcJson) return null;
            try {
              const parsed = JSON.parse(edcJson);
              const edcData = normalizeEDCJson(parsed);

              // If key_criteria is empty, populate from search criteria names
              if (edcData.key_criteria.length === 0 && fixtureCriteriaNames.length > 0) {
                edcData.key_criteria = fixtureCriteriaNames.map((name) => ({
                  name,
                  evidence: 'Assessment pending',
                  context_anchor: undefined,
                }));
              }

              const name = edcData.candidate_name;
              const initials = name.split(/\s+/).length >= 2
                ? `${name.split(/\s+/)[0][0]}${name.split(/\s+/).pop()?.[0] || ''}`.toUpperCase()
                : name.slice(0, 2).toUpperCase();

              const candidateId = nameToCandidateId(name);

              // Merge status from fixture
              if (fixtureStatuses[candidateId]) {
                edcData.status = fixtureStatuses[candidateId] as EDCData['status'];
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
          return {
            search_name: fixtureContext.search_name || js[0] || searchId,
            client_company: fixtureContext.client_company || js[3] || 'Not specified',
            client_location: fixtureContext.client_location || js[4] || '',
            client_logo_url: fixtureContext.client_logo_url,
            key_criteria_names: fixtureCriteriaNames.length > 0 ? fixtureCriteriaNames : keyCriteriaNames,
            search_lead: fixtureContext.search_lead || js[2] || 'SmartSearch',
            candidate_statuses: Object.keys(fixtureStatuses).length > 0 ? fixtureStatuses : undefined,
            deck_settings: fixtureContext.deck_settings,
            candidates,
          };
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
        const jsRow = await getJSRow(searchName);
        const context = transformToSearchContext(edsRows, jsRow, searchId);

        // Merge fixture metadata (candidate_statuses, deck_settings, logo, etc.)
        try {
          const deckData = await import(`../../data/decks/${searchId}.json`);
          const fixture = deckData.default as SearchContext & { candidate_statuses?: Record<string, string> };
          if (fixture?.candidate_statuses) {
            context.candidate_statuses = fixture.candidate_statuses;
          }
          if (fixture?.deck_settings) {
            context.deck_settings = fixture.deck_settings;
          }
          if (fixture?.client_logo_url) {
            context.client_logo_url = fixture.client_logo_url;
          }
          if (fixture?.search_name) {
            context.search_name = fixture.search_name;
          }
          if (fixture?.client_company) {
            context.client_company = fixture.client_company;
          }
          if (fixture?.search_lead) {
            context.search_lead = fixture.search_lead;
          }
          // Populate empty key_criteria from fixture criteria names
          if (fixture?.key_criteria_names?.length > 0) {
            if (!context.key_criteria_names?.length) {
              context.key_criteria_names = fixture.key_criteria_names;
            }
            for (const candidate of context.candidates) {
              if (candidate.edc_data && candidate.edc_data.key_criteria.length === 0) {
                candidate.edc_data.key_criteria = fixture.key_criteria_names.map((name: string) => ({
                  name,
                  evidence: 'Assessment pending',
                  context_anchor: undefined,
                }));
              }
            }
          }
        } catch { /* no fixture */ }

        return context;
      }
    } catch (err) {
      console.warn('[data] Sheets lookup failed for getDeckData, falling back:', err);
    }
  }

  // 2. JSON fixture file
  try {
    const deckData = await import(`../../data/decks/${searchId}.json`);
    return deckData.default as SearchContext;
  } catch {
    return null;
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
