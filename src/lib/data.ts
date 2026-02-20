import { EDCData, SearchContext } from './types';
import fixtureData from '../../data/test_fixtures.json';

// Data fetching abstraction — reads JSON now, API later
// Portal-ready: swap this to fetch from Google Sheets API or Supabase

interface FixtureFile {
  candidates: Record<string, EDCData>;
}

const fixtures = fixtureData as FixtureFile;

export async function getCandidateData(
  _searchId: string,
  candidateId: string
): Promise<EDCData | null> {
  // For v1.0, _searchId is ignored — we have a single fixture file
  // When moving to API, searchId will scope the query
  const candidate = fixtures.candidates[candidateId] ?? null;
  return candidate;
}

export async function getSearchCandidates(
  _searchId: string
): Promise<string[]> {
  return Object.keys(fixtures.candidates);
}

export async function getDeckData(searchId: string): Promise<SearchContext | null> {
  try {
    const deckData = await import(`../../data/decks/${searchId}.json`);
    return deckData.default as SearchContext;
  } catch {
    return null;
  }
}
