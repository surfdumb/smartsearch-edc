import type { EDCData, SearchContext } from './types';
import fs from 'fs';
import path from 'path';

// ─── Data fetching abstraction ────────────────────────────────────────────────
// Priority order:
//   1. Google Sheets (when GOOGLE_SERVICE_ACCOUNT_EMAIL is set)
//   2. JSON fixtures in /data/decks/[searchId].json
//   3. Legacy flat fixtures in /data/test_fixtures.json

const SHEETS_ENABLED = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

// ─── Fixture loader ──────────────────────────────────────────────────────────

type FixtureData = SearchContext & { candidate_statuses?: Record<string, string> };

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

// ─── getCandidateData ─────────────────────────────────────────────────────────

export async function getCandidateData(
  searchId: string,
  candidateId: string
): Promise<EDCData | null> {
  const fixture = await loadFixture(searchId);

  // 1. Try pre-transformed EDC Output Store (structured JSON from Make Engine)
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch, getEDSRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, candidateIdMatchesName, nameToCandidateId, parseKeyCriteria } = await import('./sheets-transform');

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

            // Always enrich key_criteria from EDS when fixture has criteria names
            // (EDC Output Store JSON often has empty/mismatched criteria)
            const criteriaNames = fixture?.key_criteria_names || [];
            if (criteriaNames.length > 0) {
              const edsRows = await getEDSRowsForSearch(searchId);
              const edsRow = edsRows.find((row) => {
                const name = Object.values(row)[1] || '';
                return nameToCandidateId(name) === candidateId;
              });

              if (edsRow) {
                const eds = Object.values(edsRow);
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
        const jsRow = await getJSRow(searchName) || await getJSRow(searchId);
        const edcData = transformToEDCData(edsRow, jsRow, searchId);

        // Enrich key_criteria from EDS assessment + fixture criteria names
        const criteriaNames = fixture?.key_criteria_names || [];
        if (criteriaNames.length > 0) {
          const { parseKeyCriteria: parseCriteria } = await import('./sheets-transform');
          const eds = Object.values(edsRow);
          const assessmentText = eds[24] || eds[20] || '';
          if (assessmentText && assessmentText !== 'Not mentioned') {
            edcData.key_criteria = parseCriteria(assessmentText, criteriaNames);
          } else if (edcData.key_criteria.length === 0) {
            edcData.key_criteria = criteriaNames.map((name: string) => ({
              name, evidence: 'Assessment pending', context_anchor: undefined,
            }));
          }
        }

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
  const fixture = await loadFixture(searchId);

  // 1. Try pre-transformed EDC Output Store for structured candidates
  if (SHEETS_ENABLED) {
    try {
      const { getEDCOutputRowsForSearch, getJSRow, getEDSRowsForSearch } = await import('./sheets');
      const { normalizeEDCJson, nameToCandidateId, parseKeyCriteria } = await import('./sheets-transform');

      const outputRows = await getEDCOutputRowsForSearch(searchId);

      if (outputRows.length > 0) {
        // Load EDS rows for supplementary data
        const edsRows = await getEDSRowsForSearch(searchId);
        const edsSearchName = edsRows.length > 0
          ? (Object.values(edsRows[0])[0] || searchId)
          : searchId;
        // Try JS lookup by EDS search_key first (getJSRow now matches on col 0 OR col 1)
        const jsRow = await getJSRow(edsSearchName) || await getJSRow(searchId);
        const js = jsRow ? Object.values(jsRow) : [];

        // JS criteria names
        const keyCriteriaNames: string[] = [];
        for (let i = 9; i <= 21; i += 3) {
          const name = js[i]?.trim();
          if (name) keyCriteriaNames.push(name);
        }

        // JS scope dimensions with role requirements (column 43+)
        const jsScopeDimensions = js[43] || '';

        // Merge fixture + JS criteria names
        const fixtureCriteriaNames = fixture?.key_criteria_names || [];
        const effectiveCriteriaNames = keyCriteriaNames.length > 0
          ? keyCriteriaNames
          : fixtureCriteriaNames;
        const fixtureStatuses = fixture?.candidate_statuses || {};

        // Build candidates from structured EDC JSON
        const candidates = outputRows
          .map((row) => {
            const edcJson = row['edc_json'] || Object.values(row)[4] || '';
            if (!edcJson) return null;
            try {
              const parsed = JSON.parse(edcJson);
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
                enrichScopeFromEDS(edcData, eds, jsScopeDimensions);
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
            search_name: fixture?.search_name || js[0] || searchId,
            client_company: fixture?.client_company || js[3] || 'Not specified',
            client_location: fixture?.client_location || js[4] || '',
            client_logo_url: fixture?.client_logo_url,
            key_criteria_names: effectiveCriteriaNames,
            search_lead: fixture?.search_lead || js[2] || 'SmartSearch',
            candidate_statuses: Object.keys(fixtureStatuses).length > 0 ? fixtureStatuses : undefined,
            deck_settings: fixture?.deck_settings,
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
        const jsRow = await getJSRow(searchName) || await getJSRow(searchId);
        const context = transformToSearchContext(edsRows, jsRow, searchId);

        // Merge fixture metadata
        if (fixture) {
          if (fixture.candidate_statuses) context.candidate_statuses = fixture.candidate_statuses;
          if (fixture.deck_settings) context.deck_settings = fixture.deck_settings;
          if (fixture.client_logo_url) context.client_logo_url = fixture.client_logo_url;
          if (fixture.search_name) context.search_name = fixture.search_name;
          if (fixture.client_company) context.client_company = fixture.client_company;
          if (fixture.search_lead) context.search_lead = fixture.search_lead;
          if (fixture.key_criteria_names?.length) {
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
        }

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

/** Enrich scope_match with candidate_actual from EDS assessment text */
function enrichScopeFromEDS(edcData: EDCData, eds: string[], jsScopeDimensions: string) {
  const allEmpty = edcData.scope_match.every(
    (s) => s.candidate_actual === 'Not assessed' || !s.candidate_actual
  );
  if (!allEmpty) return;

  // Try to parse EDS scope column (index 21)
  const scopeText = eds[21] || '';
  // Also try the AI assessment for scope data
  const assessmentText = eds[20] || '';

  for (const scopeItem of edcData.scope_match) {
    const dimName = scopeItem.scope.toLowerCase();

    // Try to find candidate value in scope text
    const scopeMatch = findValueForDimension(scopeText, dimName);
    if (scopeMatch) {
      scopeItem.candidate_actual = scopeMatch;
    }

    // Try to find in assessment text
    if (scopeItem.candidate_actual === 'Not assessed' || !scopeItem.candidate_actual) {
      const assessMatch = findValueForDimension(assessmentText, dimName);
      if (assessMatch) {
        scopeItem.candidate_actual = assessMatch;
      }
    }

    // Try to find role requirement from JS scope dimensions
    if ((scopeItem.role_requirement === 'Not specified' || !scopeItem.role_requirement) && jsScopeDimensions) {
      const reqMatch = findValueForDimension(jsScopeDimensions, dimName);
      if (reqMatch) {
        scopeItem.role_requirement = reqMatch;
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

/** Enrich compensation from EDS raw columns */
function enrichCompFromEDS(edcData: EDCData, eds: string[]) {
  const comp = edcData.compensation;
  // If current_base is still the full blob (>100 chars), re-parse from EDS
  if (comp.current_base && comp.current_base.length > 100) {
    // The base field has the entire comp blob — re-parse properly
    const parsed = parseCompFromBlob(eds[10] || comp.current_base);
    if (parsed.base) comp.current_base = parsed.base;
    if (parsed.bonus) comp.current_bonus = parsed.bonus;
    if (parsed.lti) comp.current_lti = parsed.lti;
    if (parsed.benefits) comp.current_benefits = parsed.benefits;
    if (parsed.total) comp.current_total = parsed.total;
  }

  // Same for expected
  if (comp.expected_base && comp.expected_base.length > 100) {
    const parsed = parseCompFromBlob(eds[11] || comp.expected_base);
    if (parsed.base) comp.expected_base = parsed.base;
    if (parsed.bonus) comp.expected_bonus = parsed.bonus;
    if (parsed.lti) comp.expected_lti = parsed.lti;
    if (parsed.benefits) comp.expected_benefits = parsed.benefits;
    if (parsed.total) comp.expected_total = parsed.total;
  }

  // If expected is long prose, extract just the amount
  if (comp.expected_total && comp.expected_total.length > 80) {
    const amountMatch = comp.expected_total.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?(?:\s*(?:k|K|p\.a\.))?/);
    if (amountMatch) {
      const prose = comp.expected_total;
      comp.expected_total = amountMatch[0];
      // Move the prose to flexibility if flexibility is empty/default
      if (!comp.flexibility || comp.flexibility === 'Not mentioned') {
        comp.flexibility = prose;
      }
    }
  }
}

/** Parse a compensation text blob into structured components */
function parseCompFromBlob(text: string): {
  base?: string; bonus?: string; lti?: string; benefits?: string; total?: string;
} {
  if (!text) return {};
  const result: { base?: string; bonus?: string; lti?: string; benefits?: string; total?: string } = {};

  // Try line-by-line parsing
  const lines = text.split(/\n|(?:(?<=\))\s*)|(?:;\s*)/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (lower.startsWith('base:') || lower.startsWith('base salary:') || lower.startsWith('fixed:') || lower.startsWith('fixed salary:')) {
      result.base = extractCompAmount(trimmed.replace(/^(?:base(?:\s+salary)?|fixed(?:\s+salary)?)\s*:\s*/i, ''));
    } else if (lower.startsWith('bonus:') || lower.startsWith('variable:') || lower.startsWith('sti:') || lower.startsWith('short-term')) {
      result.bonus = extractCompAmount(trimmed.replace(/^(?:bonus|variable|sti|short-term\s*(?:incentive)?)\s*:\s*/i, ''));
    } else if (lower.startsWith('lti:') || lower.startsWith('ltip:') || lower.startsWith('equity:') || lower.startsWith('long-term')) {
      result.lti = extractCompAmount(trimmed.replace(/^(?:lti[p]?|equity|long-term\s*(?:incentive)?)\s*:\s*/i, ''));
    } else if (lower.startsWith('benefits:') || lower.startsWith('benefit:') || lower.startsWith('other:')) {
      result.benefits = trimmed.replace(/^(?:benefits?|other)\s*:\s*/i, '').trim();
    } else if (lower.startsWith('total:') || lower.startsWith('total package:') || lower.startsWith('total comp')) {
      result.total = extractCompAmount(trimmed.replace(/^total(?:\s+(?:package|comp(?:ensation)?))?\s*:\s*/i, ''));
    }
  }

  // Try parenthetical total
  if (!result.total) {
    const totalMatch = text.match(/total(?:\s+(?:fixed|package|comp(?:ensation)?))?\s*[:=]\s*([€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?(?:\s*(?:k|K|p\.a\.))?)/i);
    if (totalMatch) result.total = totalMatch[1].trim();
  }

  // If no structured parsing worked, try to extract first amount as base
  if (!result.base && !result.total) {
    const firstAmount = text.match(/[€$£][\d,.']+(?:\s*[-–]\s*[€$£]?[\d,.']+)?/);
    if (firstAmount) {
      // Check if it's clearly a base amount
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
