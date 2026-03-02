import { EDCData, SearchContext } from './types';
import fixtureData from '../../data/test_fixtures.json';

// Data fetching abstraction — reads JSON now, API later
// Portal-ready: swap this to fetch from Google Sheets API or Supabase

interface FixtureFile {
  candidates: Record<string, EDCData>;
}

const fixtures = fixtureData as FixtureFile;

export async function getCandidateData(
  searchId: string,
  candidateId: string
): Promise<EDCData | null> {
  // Check flat fixtures first (legacy)
  const candidate = fixtures.candidates[candidateId] ?? null;
  if (candidate) return candidate;

  // Fall back to deck data — covers candidates defined in /data/decks/[searchId].json
  const deck = await getDeckData(searchId);
  const deckCandidate = deck?.candidates.find((c) => c.candidate_id === candidateId);
  return deckCandidate?.edc_data ?? null;
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
