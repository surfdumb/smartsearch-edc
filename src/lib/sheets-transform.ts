/* eslint-disable @typescript-eslint/no-unused-vars */
import type { EDCData, SearchContext, IntroCardData } from './types';
import type { SheetRow } from './sheets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get a value by column header name, with fallback. */
function getVal(row: SheetRow, key: string, fallback = 'Not mentioned'): string {
  return row[key]?.trim() || fallback;
}

/** Get a value by column index position (0-based). */
function getByIndex(row: SheetRow, index: number, fallback = ''): string {
  const values = Object.values(row);
  return values[index]?.trim() || fallback;
}

/** Transliterate common European characters to ASCII equivalents. */
function transliterate(str: string): string {
  return str
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/é|è|ê|ë/g, 'e').replace(/É|È|Ê|Ë/g, 'E')
    .replace(/á|à|â|ã/g, 'a').replace(/Á|À|Â|Ã/g, 'A')
    .replace(/í|ì|î|ï/g, 'i').replace(/Í|Ì|Î|Ï/g, 'I')
    .replace(/ó|ò|ô|õ/g, 'o').replace(/Ó|Ò|Ô|Õ/g, 'O')
    .replace(/ú|ù|û/g, 'u').replace(/Ú|Ù|Û/g, 'U')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/ś/g, 's').replace(/Ś/g, 'S')
    .replace(/ź|ż/g, 'z').replace(/Ź|Ż/g, 'Z')
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/ń/g, 'n').replace(/Ń/g, 'N');
}

/** Generate a URL-safe candidate slug from a full name. e.g. "Christopher Snider" → "c-snider" */
export function nameToCandidateId(name: string): string {
  const transliterated = transliterate(name);
  const parts = transliterated.trim().split(/\s+/);
  if (parts.length < 2) return transliterated.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const first = parts[0][0].toLowerCase();
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${first}-${last}`;
}

/** Check if a candidate slug matches a name. */
export function candidateIdMatchesName(candidateId: string, candidateName: string): boolean {
  return nameToCandidateId(candidateName) === candidateId.toLowerCase().trim();
}

/** Derive initials from a full name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── EDS Column Index Map ─────────────────────────────────────────────────────
// Based on Make Engine blueprint ({{5.`N`}} references):
// 0: search_key        1: candidate_name      2: current_title
// 3: current_company   4: location            5: years_in_current_role
// 6: years_at_company  7: total_team_size      8: criteria_source
// 9: primary_industry  10: compensation_current_total
// 11: compensation_expected_total              12: compensation_flexibility
// 13: notice_period    14: earliest_start_date 15: timeline_constraints
// 16: key_concern      17: key_strength        18: our_take
// 19: our_take_source  20: execflow_ai_assessment
// 21: eds_scope_match_dimensions               22: job_summary_used
// 23: candidate_overview                       24: key_criteria_assessment
// 25: consultant_name  26: granola_title        27: eds_date

// ─── JS Column Index Map ──────────────────────────────────────────────────────
// 0: search_name       1: file_name (often empty — NOT search_key)  2: search_lead
// 3: client_name       4: client_location
// Criteria groups at 9, 12, 15, 18, 21 (name / detail / weight per group)
// Budget at 34-37: base, bonus, mip_lti, di
// 43: scope_match_dimensions

// ─── Key Criteria Parsing ────────────────────────────────────────────────────

export function parseKeyCriteria(
  criteriaText: string,
  jsCriteriaNames: string[]
): EDCData['key_criteria'] {
  const names = jsCriteriaNames.length > 0
    ? jsCriteriaNames
    : extractNamesFromText(criteriaText);

  if (!criteriaText || criteriaText === 'Not mentioned') {
    return names.map((name) => ({ name, evidence: 'Assessment pending' }));
  }

  // Helper: extract context anchor (company name) from evidence text
  function extractAnchor(evidence: string): string | undefined {
    // Pattern 1: "at CompanyName" followed by positional/temporal word
    const atMatch = evidence.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,'-]{2,40?})(?=\s+(?:in|for|from|during|where|with|he|she|they|and|,|\.))/);
    if (atMatch) return `at ${atMatch[1].trim().replace(/[,.]$/, '')}`;
    // Pattern 2: "at CompanyName" at end of sentence
    const atEnd = evidence.match(/\bat\s+([A-Z][A-Za-z0-9\s&'-]{2,30}?)\.?\s*$/);
    if (atEnd) return `at ${atEnd[1].trim().replace(/[,.]$/, '')}`;
    return undefined;
  }

  // Strategy 0: Markdown bold-header format from key_criteria_assessment_prose
  // Format: "**1. Criterion Name:** Rating\nEvidence text\n\n**2. Next:**..."
  // Parse numbered bold sections and map by index to criteria names array
  // Split on any newline before a numbered bold header (handles both \n and \n\n separators)
  const sections = criteriaText.split(/\n(?=\*\*\d+\.)/).filter((s) => s.trim());
  // Also check double-newline split for non-numbered headers (like "Key Criteria Source")
  const allParagraphs = criteriaText.split(/\n\n+/).filter((p) => p.trim());

  const boldBlocks: { header: string; body: string; num: number | null }[] = [];

  // First pass: extract numbered sections from the aggressive split
  for (const section of sections) {
    const headerMatch = section.match(/^\*\*(.+?)\*\*:?\s*([\s\S]*)/);
    if (headerMatch) {
      const rawHeader = headerMatch[1].trim();
      const numMatch = rawHeader.match(/^(\d+)\.\s*/);
      const num = numMatch ? parseInt(numMatch[1]) : null;
      const header = rawHeader.replace(/^\d+\.\s*/, '').trim();
      const body = headerMatch[2].trim();
      boldBlocks.push({ header, body, num });
    }
  }

  // If aggressive split didn't find numbered blocks, try the double-newline split
  if (boldBlocks.filter((b) => b.num !== null).length < 2) {
    boldBlocks.length = 0;
    for (const para of allParagraphs) {
      const headerMatch = para.match(/^\*\*(.+?)\*\*:?\s*([\s\S]*)/);
      if (headerMatch) {
        const rawHeader = headerMatch[1].trim();
        const numMatch = rawHeader.match(/^(\d+)\.\s*/);
        const num = numMatch ? parseInt(numMatch[1]) : null;
        const header = rawHeader.replace(/^\d+\.\s*/, '').trim();
        const body = headerMatch[2].trim();
        boldBlocks.push({ header, body, num });
      }
    }
  }

  // Filter to only numbered sections (skip "Key Criteria Source" etc.), sort by number
  const numberedBlocks = boldBlocks
    .filter((b) => b.num !== null)
    .sort((a, b) => a.num! - b.num!);

  // Helper: clean evidence text from a bold block
  function cleanBlockEvidence(block: { header: string; body: string }): string {
    let evidence = block.body;
    // Strip any remaining markdown bold markers
    evidence = evidence.replace(/\*\*/g, '');
    // Remove standalone rating words at the start
    evidence = evidence.replace(/^(?:Limited|Strong|Moderate|Very\s+Good|Good|Partial|Significant|Confirmed|Not\s+assessed)\s*\n?/i, '').trim();
    // Strip repeated criterion name at start of evidence (sometimes duplicated)
    const headerLower = block.header.toLowerCase().replace(/[:.]/g, '').trim();
    const evidenceLower = evidence.toLowerCase();
    if (evidenceLower.startsWith(headerLower)) {
      evidence = evidence.slice(headerLower.length).replace(/^[:\s]*/, '').trim();
      // Re-strip rating after name removal
      evidence = evidence.replace(/^(?:Limited|Strong|Moderate|Very\s+Good|Good|Partial|Significant|Confirmed|Not\s+assessed)\s*\n?/i, '').trim();
    }
    return evidence;
  }

  if (numberedBlocks.length >= 2) {
    return names.map((name, i) => {
      const block = numberedBlocks[i]; // index-based: criteria[0] → section 1
      const evidence = block ? cleanBlockEvidence(block) : '';
      return {
        name,
        evidence: evidence || 'Assessment pending',
        context_anchor: evidence ? extractAnchor(evidence) : undefined,
      };
    });
  }

  // Strategy 0.5: Unnumbered bold-header format — **Criterion Name:** Rating\nEvidence
  // Filter out metadata blocks (e.g., "Key Criteria Source") and match to criteria by keyword similarity
  const unnumberedBlocks = boldBlocks.filter((b) => {
    const h = b.header.toLowerCase();
    return b.num === null && !h.includes('key criteria source') && !h.includes('source:');
  });

  if (unnumberedBlocks.length >= 2) {
    // Match blocks to criteria names by keyword similarity (not just index)
    // because EDS block order may differ from fixture criteria order
    return names.map((name) => {
      const nameWords = name.toLowerCase().replace(/[&]/g, 'and').split(/[\s,/]+/)
        .filter((w) => w.length > 3 && !['with', 'the', 'and', 'for', 'that', 'this', 'from', 'ability'].includes(w));

      let bestBlock: typeof unnumberedBlocks[0] | null = null;
      let bestScore = 0;

      for (const block of unnumberedBlocks) {
        const headerLower = block.header.toLowerCase();
        let score = 0;
        for (const word of nameWords) {
          if (headerLower.includes(word)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestBlock = block;
        }
      }

      // Fall back to index if no keyword match found
      if (!bestBlock && unnumberedBlocks.length > 0) {
        bestBlock = unnumberedBlocks[names.indexOf(name)] || null;
      }

      const evidence = bestBlock ? cleanBlockEvidence(bestBlock) : '';
      return {
        name,
        evidence: evidence || 'Assessment pending',
        context_anchor: evidence ? extractAnchor(evidence) : undefined,
      };
    });
  }

  // Helper: strip markdown + rating from any evidence string
  function stripMarkdownAndRating(text: string): string {
    return text
      .replace(/\*\*/g, '')
      .replace(/^(?:Limited|Strong|Moderate|Very\s+Good|Good|Partial|Significant|Confirmed|Not\s+assessed)\s*\n?/i, '')
      .trim();
  }

  // Strategy 1: Split by numbered blocks "1.", "2.", etc.
  const blocks = criteriaText.split(/(?=\d+\.\s)/).filter((b) => b.trim());
  if (blocks.length >= names.length) {
    return names.map((name, i) => {
      const block = blocks[i] || '';
      const evidence = stripMarkdownAndRating(
        block.replace(/^\d+\.\s*[^:\n]+:\s*/, '').replace(/^\d+\.\s*/, '').trim()
      ) || 'Assessment pending';
      return { name, evidence, context_anchor: extractAnchor(evidence) };
    });
  }

  // Strategy 2: Fuzzy match criterion names within prose assessment text
  const sentences = criteriaText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);

  return names.map((name) => {
    const keywords = name.toLowerCase()
      .replace(/[&]/g, 'and')
      .split(/[\s,/]+/)
      .filter((w) => w.length > 3 && !['with', 'the', 'and', 'for', 'that', 'this', 'from', 'ability'].includes(w));

    let bestSentence = '';
    let bestScore = 0;

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }

    const evidence = bestScore >= 2 ? stripMarkdownAndRating(bestSentence) : 'Assessment pending';
    return { name, evidence, context_anchor: extractAnchor(evidence) };
  });
}

function extractNamesFromText(text: string): string[] {
  const matches = text.match(/^\d+\.\s*([^:\n]+)/gm) || [];
  return matches.map((m) => m.replace(/^\d+\.\s*/, '').split(':')[0].trim()).filter(Boolean);
}

// ─── Scope Match Parsing ─────────────────────────────────────────────────────

function parseScopeMatch(edsScopeText: string): EDCData['scope_match'] {
  if (!edsScopeText || edsScopeText === 'Not mentioned') return [];

  // First try semicolon/newline split (original structured format)
  const semiSplit = edsScopeText.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
  if (semiSplit.length > 1) {
    return semiSplit.map((dim) => {
      const parts = dim.split(':').map((p) => p.trim());
      return {
        scope: parts[0] || dim,
        candidate_actual: parts[1] || 'Not assessed',
        role_requirement: parts[2] || 'Not specified',
        alignment: 'not_assessed' as const,
      };
    });
  }

  // Fallback: try expanding crammed format (comma-separated, possibly with parentheticals)
  const expanded = expandScopeMatch([{
    scope: edsScopeText,
    candidate_actual: 'Not assessed',
    role_requirement: 'Not specified',
    alignment: 'not_assessed',
  }]);
  if (expanded.length > 0) return expanded;

  // Final fallback: single item
  return [{
    scope: edsScopeText,
    candidate_actual: 'Not assessed',
    role_requirement: 'Not specified',
    alignment: 'not_assessed',
  }];
}

// ─── Concerns Parsing ────────────────────────────────────────────────────────

function parseConcerns(concernText: string): EDCData['potential_concerns'] {
  if (!concernText || concernText === 'Not mentioned') return [];
  return concernText
    .split(/[;\n]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((concern) => ({ concern, severity: 'development' as const }));
}

// ─── Motivation Parsing ──────────────────────────────────────────────────────

function parseMotivation(overviewText: string): EDCData['why_interested'] {
  if (!overviewText || overviewText === 'Not mentioned') return [];
  // Return as a single pull item — the full overview is too rich to auto-parse
  // This is a bridge until pre-transformed EDC data is available
  return [{ type: 'pull' as const, headline: 'See candidate overview', detail: overviewText.slice(0, 200) }];
}

// ─── Today's Date ────────────────────────────────────────────────────────────

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Expand crammed scope_match ─────────────────────────────────────────────

/**
 * When Claude crams all dimensions into a single scope_match entry like
 * "P&L, Headcount, Geography, Revenue Target, Industry Segment" or
 * "P&L (€58M current vs €60M target), Headcount (10 vs 170 FTEs), ..."
 * split them into separate rows with parsed candidate/requirement values.
 */
function expandScopeMatch(
  rawItems: { dimension?: string; scope?: string; candidate_actual?: string; role_requirement?: string; alignment?: string }[]
): EDCData['scope_match'] {
  const result: EDCData['scope_match'] = [];

  for (const item of rawItems) {
    const scopeText = item.dimension || item.scope || '';
    const hasDetails = item.candidate_actual && item.candidate_actual !== 'Not assessed';

    // If the item already has proper candidate_actual values (i.e. structured), keep as-is
    if (hasDetails) {
      result.push({
        scope: scopeText,
        candidate_actual: item.candidate_actual || 'Not assessed',
        role_requirement: item.role_requirement || 'Not specified',
        alignment: (item.alignment as EDCData['scope_match'][0]['alignment']) || 'not_assessed',
      });
      continue;
    }

    // Detect crammed format: multiple dimensions in one scope field
    // Pattern A: "P&L (€58M current vs €60M target), Headcount (10 vs 170), ..."
    // Pattern B: "P&L, Headcount, Geography, Revenue Target, Industry Segment"
    const hasParenthetical = /\([^)]+\)/.test(scopeText);

    if (hasParenthetical) {
      // Split on ", " that precedes a capital letter followed by " ("
      // e.g. "P&L (details), Headcount (details), Geography (details)"
      const dimRegex = /([A-Z][^,(]*?)\s*\(([^)]+)\)/g;
      let match;
      while ((match = dimRegex.exec(scopeText)) !== null) {
        const dimName = match[1].trim().replace(/,\s*$/, '');
        const details = match[2].trim();

        // Try to parse "candidate vs requirement" or "candidate current vs requirement target"
        const vsMatch = details.match(/^(.+?)\s+(?:current\s+)?vs\.?\s+(.+?)(?:\s+target)?$/i);
        if (vsMatch) {
          result.push({
            scope: dimName,
            candidate_actual: vsMatch[1].trim(),
            role_requirement: vsMatch[2].trim(),
            alignment: 'not_assessed',
          });
        } else {
          result.push({
            scope: dimName,
            candidate_actual: details,
            role_requirement: 'Not specified',
            alignment: 'not_assessed',
          });
        }
      }
    }

    // Pattern B or fallback: simple comma-separated list "P&L, Headcount, Geography"
    if (result.length === 0 || (!hasParenthetical && scopeText.includes(','))) {
      // Only use this if we didn't already parse parenthetical format
      if (!hasParenthetical) {
        const dimensions = scopeText.split(',').map(d => d.trim()).filter(Boolean);
        for (const dim of dimensions) {
          result.push({
            scope: dim,
            candidate_actual: 'Not assessed',
            role_requirement: 'Not specified',
            alignment: 'not_assessed',
          });
        }
      }
    }

    // Fallback: if nothing was parsed, keep original as single row
    if (result.length === 0) {
      result.push({
        scope: scopeText || 'Unknown',
        candidate_actual: item.candidate_actual || 'Not assessed',
        role_requirement: item.role_requirement || 'Not specified',
        alignment: (item.alignment as EDCData['scope_match'][0]['alignment']) || 'not_assessed',
      });
    }
  }

  return result;
}

// ─── Parse compensation text blobs ──────────────────────────────────────────

/**
 * Extract structured compensation amounts from text blobs like:
 * "Base: €190,000 + €10,000 company car + €10,000 pension contribution (total fixed: €210,000)
 *  Bonus: 2.5% of company profit, historically approximately €25,000 annually
 *  Benefits: Standard German benefits package"
 */
function parseCompensationText(text: string): {
  base?: string;
  bonus?: string;
  lti?: string;
  benefits?: string;
  total?: string;
  raw: string;
} {
  if (!text || text === 'Not mentioned') return { raw: text || 'Not mentioned' };

  const result: { base?: string; bonus?: string; lti?: string; benefits?: string; total?: string; raw: string } = { raw: text };

  // Split into lines or sections
  const lines = text.split(/\n|(?<=\))\s*(?=[A-Z])/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    if (lower.startsWith('base:') || lower.startsWith('base salary:') || lower.startsWith('fixed:')) {
      result.base = trimmed.replace(/^(?:base(?:\s+salary)?|fixed)\s*:\s*/i, '').trim();
    } else if (lower.startsWith('bonus:') || lower.startsWith('variable:') || lower.startsWith('sti:')) {
      result.bonus = trimmed.replace(/^(?:bonus|variable|sti)\s*:\s*/i, '').trim();
    } else if (lower.startsWith('lti:') || lower.startsWith('ltip:') || lower.startsWith('equity:') || lower.startsWith('long-term:')) {
      result.lti = trimmed.replace(/^(?:lti[p]?|equity|long-term)\s*:\s*/i, '').trim();
    } else if (lower.startsWith('benefits:') || lower.startsWith('benefit:')) {
      result.benefits = trimmed.replace(/^benefits?\s*:\s*/i, '').trim();
    } else if (lower.startsWith('total:') || lower.startsWith('total package:') || lower.startsWith('total comp')) {
      result.total = trimmed.replace(/^total(?:\s+(?:package|comp(?:ensation)?))?\s*:\s*/i, '').trim();
    }
  }

  // Try to extract a total from parenthetical like "(total fixed: €210,000)"
  if (!result.total) {
    const totalMatch = text.match(/total(?:\s+(?:fixed|package|comp(?:ensation)?))?\s*[:=]\s*([€$£][\d,.']+\s*(?:k|K)?)/i);
    if (totalMatch) result.total = totalMatch[1].trim();
  }

  // Extract base amount from the first €-amount if base line exists but is complex
  if (result.base) {
    const amountMatch = result.base.match(/^([€$£][\d,.']+(?:\s*(?:k|K|thousand|million|p\.a\.))?)/);
    if (amountMatch && result.base.length > 60) {
      // Keep the full text but mark a clean amount
      result.base = result.base;
    }
  }

  return result;
}

// ─── Strip markdown fences from JSON ────────────────────────────────────────

export function stripMarkdownJson(text: string): string {
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '');
    s = s.replace(/\n?```\s*$/, '');
  }
  return s.trim();
}

// ─── Normalize Claude JSON to EDCData ────────────────────────────────────────

/**
 * Normalize a parsed EDC JSON object from the Make Engine (Claude output)
 * into the EDCData interface shape. Handles field name differences.
 * e.g. Claude outputs `dimension` for scope match, but EDCData expects `scope`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeEDCJson(parsed: any): EDCData {
  // Expand crammed scope_match entries into separate rows
  const rawScopeItems = Array.isArray(parsed.scope_match) ? parsed.scope_match : [];
  const expandedScope = rawScopeItems.length > 0 ? expandScopeMatch(rawScopeItems) : [];

  // Parse compensation text blobs into structured fields
  const rawComp = parsed.compensation || {};
  const currentParsed = parseCompensationText(rawComp.current_total || '');
  const expectedParsed = parseCompensationText(rawComp.expected_total || '');

  // Clean current_title — strip Make pipeline prefixes like "IV Patrik Vogtel - Norican SVP"
  let cleanTitle = parsed.current_title || 'Not mentioned';
  if (/^IV\s+/i.test(cleanTitle)) {
    // Format: "IV {Name} - {SearchContext}" — not an actual job title, fall back
    cleanTitle = 'Not mentioned';
  }

  return {
    candidate_name: parsed.candidate_name || 'Unknown',
    current_title: cleanTitle,
    current_company: parsed.current_company || 'Not mentioned',
    location: parsed.location || 'Not mentioned',
    photo_url: parsed.photo_url,

    scope_match: expandedScope,
    scope_seasoning: parsed.scope_seasoning || undefined,

    key_criteria: Array.isArray(parsed.key_criteria)
      ? parsed.key_criteria.map((k: { name?: string; evidence?: string; context_anchor?: string }) => ({
          name: k.name || 'Unknown',
          evidence: k.evidence || 'Not mentioned',
          context_anchor: k.context_anchor,
        }))
      : [],

    compensation: {
      current_base: rawComp.current_base !== 'Not mentioned' && rawComp.current_base
        ? rawComp.current_base
        : currentParsed.base || 'Not mentioned',
      current_bonus: currentParsed.bonus,
      current_lti: currentParsed.lti,
      current_benefits: currentParsed.benefits,
      current_total: currentParsed.total || rawComp.current_total || 'Not mentioned',
      expected_base: rawComp.expected_base !== 'Not mentioned' && rawComp.expected_base
        ? rawComp.expected_base
        : expectedParsed.base || 'Not mentioned',
      expected_bonus: expectedParsed.bonus,
      expected_lti: expectedParsed.lti,
      expected_benefits: expectedParsed.benefits,
      expected_total: expectedParsed.total || rawComp.expected_total || 'Not mentioned',
      flexibility: rawComp.flexibility || 'Not mentioned',
      budget_range: rawComp.budget_range || undefined,
    },
    notice_period: parsed.notice_period || 'Not mentioned',
    earliest_start_date: parsed.earliest_start_date || 'Not mentioned',

    why_interested: Array.isArray(parsed.why_interested)
      ? parsed.why_interested.map((w: { type?: string; headline?: string; detail?: string }) => ({
          type: (w.type as 'pull' | 'push') || 'pull',
          headline: w.headline || '',
          detail: w.detail || '',
        }))
      : [],

    potential_concerns: Array.isArray(parsed.potential_concerns)
      ? parsed.potential_concerns.map((c: { concern?: string; severity?: string }) => ({
          concern: c.concern || '',
          severity: (c.severity as 'development' | 'significant') || 'development',
        }))
      : [],

    our_take: {
      text: parsed.our_take?.text || '',
      recommendation: parsed.our_take?.recommendation,
      discussion_points: parsed.our_take?.discussion_points,
      original_note: parsed.our_take?.original_note,
      ai_rationale: parsed.our_take?.ai_rationale,
    },

    search_name: parsed.search_name || '',
    role_title: parsed.role_title || 'Not specified',
    generated_date: parsed.generated_date || todayFormatted(),
    consultant_name: parsed.consultant_name || 'SmartSearch',

    match_score_percentage: parsed.match_score_percentage ?? undefined,
    match_score_display: parsed.match_score_display || 'HIDE',
  };
}

// ─── Main Transform ──────────────────────────────────────────────────────────

/**
 * Transform EDS + JS sheet rows into a full EDCData object.
 * Column access is position-based (index) for resilience against header name variation.
 * After the first test run, verify console logs of raw headers and adjust indices as needed.
 */
export function transformToEDCData(
  edsRow: SheetRow,
  jsRow: SheetRow | null,
  searchId: string
): EDCData {
  const eds = Object.values(edsRow);
  const js = jsRow ? Object.values(jsRow) : [];

  // JS criteria names: groups at indices 9, 12, 15, 18, 21 (name is first in each group)
  const jsCriteriaNames: string[] = [];
  for (let i = 9; i <= 21; i += 3) {
    const name = js[i]?.trim();
    if (name) jsCriteriaNames.push(name);
  }

  // Budget from JS indices 34–37
  const budgetParts = [
    js[34] ? `Base: ${js[34]}` : null,
    js[35] ? `Bonus: ${js[35]}` : null,
    js[36] ? `MIP/LTI: ${js[36]}` : null,
    js[37] ? `DI: ${js[37]}` : null,
  ].filter(Boolean) as string[];

  // Clean title: prefer actual title (eds[2]) over Granola interview title (eds[26])
  // Strip Make pipeline prefixes like "IV Patrik Vogtel - Norican SVP"
  const rawTitle = eds[2] || eds[26] || '';
  const cleanedTitle = /^IV\s+/i.test(rawTitle) ? '' : rawTitle;
  // If primary title was bad, try the other column
  const fallbackTitle = !cleanedTitle && eds[26] && !/^IV\s+/i.test(eds[26]) ? eds[26] : '';

  // Parse compensation text blobs into structured fields
  const currentCompParsed = parseCompensationText(eds[10] || '');
  const expectedCompParsed = parseCompensationText(eds[11] || '');

  return {
    // Header
    candidate_name: eds[1] || 'Unknown',
    current_title: cleanedTitle || fallbackTitle || 'Not mentioned',
    current_company: eds[3] || 'Not mentioned',
    location: eds[4] || 'Not mentioned',

    // Scope Match
    scope_match: parseScopeMatch(eds[21] || ''),
    scope_seasoning: undefined,

    // Key Criteria
    key_criteria: parseKeyCriteria(eds[24] || '', jsCriteriaNames),

    // Compensation — parse text blobs into structured rows
    compensation: {
      current_base: currentCompParsed.base || 'Not mentioned',
      current_bonus: currentCompParsed.bonus,
      current_lti: currentCompParsed.lti,
      current_benefits: currentCompParsed.benefits,
      current_total: currentCompParsed.total || eds[10] || 'Not mentioned',
      expected_base: expectedCompParsed.base || 'Not mentioned',
      expected_bonus: expectedCompParsed.bonus,
      expected_lti: expectedCompParsed.lti,
      expected_benefits: expectedCompParsed.benefits,
      expected_total: expectedCompParsed.total || eds[11] || 'Not mentioned',
      flexibility: eds[12] || 'Not mentioned',
      budget_range: budgetParts.length > 0 ? budgetParts.join(' · ') : undefined,
      budget_base: js[34] || undefined,
      budget_bonus: js[35] || undefined,
      budget_lti: js[36] || undefined,
    },
    notice_period: eds[13] || 'Not mentioned',
    earliest_start_date: eds[14] || 'Not mentioned',

    // Motivation
    why_interested: parseMotivation(eds[23] || ''),

    // Concerns
    potential_concerns: parseConcerns(eds[16] || ''),

    // Our Take
    // eds[18] = our_take (polished text from Make Engine)
    // eds[19] = our_take_source (raw consultant notes — consultant-only)
    our_take: {
      text: eds[18] || '',
      original_note: eds[19] || undefined,
      ai_rationale: undefined,  // populated by Make Engine in future; see Step 10 notes
    },

    // Meta
    search_name: js[0] || eds[0] || searchId,
    role_title: js[2] || 'Not specified',
    generated_date: eds[27] || todayFormatted(),
    consultant_name: eds[25] || 'SmartSearch',

    match_score_display: 'HIDE',
    cv_url: undefined,
  };
}

/**
 * Build a full SearchContext (deck landing page) from EDS + JS rows.
 * Maintains backward compatibility with DeckClient which expects SearchContext.
 */
export function transformToSearchContext(
  edsRows: SheetRow[],
  jsRow: SheetRow | null,
  searchId: string
): SearchContext {
  const js = jsRow ? Object.values(jsRow) : [];

  // JS criteria names for the search context header
  const keyCriteriaNames: string[] = [];
  for (let i = 9; i <= 21; i += 3) {
    const name = js[i]?.trim();
    if (name) keyCriteriaNames.push(name);
  }

  const candidates: IntroCardData[] = edsRows.map((row) => {
    const edcData = transformToEDCData(row, jsRow, searchId);
    const eds = Object.values(row);

    // Flash summary: use candidate_overview (index 23), truncated
    const overview = eds[23] || '';
    const flashSummary = overview.length > 160
      ? overview.slice(0, 157).replace(/\s+\S+$/, '') + '...'
      : overview;

    // Key strengths: split key_strength field (index 17) or derive from criteria names
    const strengthText = eds[17] || '';
    const keyStrengths = strengthText
      ? strengthText.split(/[;,\n]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 3)
      : edcData.key_criteria.slice(0, 3).map((k) => k.name);

    return {
      candidate_id: nameToCandidateId(edcData.candidate_name),
      candidate_name: edcData.candidate_name,
      current_title: edcData.current_title,
      current_company: edcData.current_company,
      location: edcData.location,
      initials: getInitials(edcData.candidate_name),
      flash_summary: flashSummary,
      key_strengths: keyStrengths,
      notice_period: edcData.notice_period !== 'Not mentioned' ? edcData.notice_period : undefined,
      compensation_alignment: 'not_set' as const,  // EDS doesn't expose this directly
      edc_data: edcData,
    };
  });

  return {
    search_name: js[0] || searchId,
    role_title: js[1] || js[0] || searchId,
    client_company: js[3] || 'Not specified',
    client_location: js[4] || '',
    key_criteria_names: keyCriteriaNames,
    search_lead: js[2] || 'SmartSearch',
    candidates,
  };
}
