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
  // 1. Try Google Sheets
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
        return transformToEDCData(edsRow, jsRow, searchId);
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
  // 1. Try Google Sheets
  if (SHEETS_ENABLED) {
    try {
      const { getEDSRowsForSearch, getJSRow } = await import('./sheets');
      const { transformToSearchContext } = await import('./sheets-transform');

      const edsRows = await getEDSRowsForSearch(searchId);
      if (edsRows.length > 0) {
        const searchName = Object.values(edsRows[0])[0] || searchId;
        const jsRow = await getJSRow(searchName);
        return transformToSearchContext(edsRows, jsRow, searchId);
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
