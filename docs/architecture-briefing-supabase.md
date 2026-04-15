# SmartSearch EDC — Architecture Briefing for Supabase Migration & Automation Pipeline

## Context for This Conversation

You already know SmartSearch and the EDC product intimately. This document is about the **technical plumbing** — what exists today, what we're moving to, and what we need to design together.

We're at an inflection point. The EDC web app works. Consultants can view, edit, and present candidate decks. But the **data pipeline behind it is held together with duct tape** — Google Sheets as a database, Vercel Blob JSON files as an edit persistence layer, static JSON fixtures committed to git, and a Make.com automation that reads/writes Sheets. Every new deck requires manual JSON authoring or fragile Sheets-to-app synchronisation.

We want to fix this properly with Supabase as the data backbone, and simultaneously solve the **Job Summary editing problem** — consultants author and edit Job Summaries in Word (often via SharePoint), and those edits need to flow back into the EDC deck cleanly.

---

## What We're Trying to Achieve

### 1. Clean Automation of Search-Specific Deck Creation

**Today:** Creating a new deck means either (a) manually writing a JSON fixture file with all candidate data, or (b) entering data into Google Sheets and hoping the Make.com → Sheets → App pipeline works. Both are fragile and require developer involvement.

**Goal:** A consultant starts a new search, the system creates the deck structure automatically, and candidates flow in as they're assessed. No developer, no JSON editing, no spreadsheet wrangling.

### 2. Job Summary Editing in Word with Write-Back

**Today:** Job Summary PDFs are uploaded to Vercel Blob storage. The app can extract key criteria from them via Claude Vision. But the Job Summary is a **living document** — consultants refine it after client calls, adjust criteria names, update compensation ranges. These edits happen in Word (often stored in SharePoint). The EDC deck has no idea the Job Summary changed.

**Goal:** Consultants edit the Job Summary in Word/SharePoint as they always have. Those changes (especially key criteria names, scope dimensions, compensation parameters) automatically propagate to the EDC deck. When criteria names change, the deck updates. When comp ranges change, the comp section reflects it. Ideally bidirectional — if a consultant tweaks a criterion name in the EDC UI, that could write back to the Job Summary source.

### 3. Regeneration Workflow

**Today:** If the Job Summary changes substantially, there's no way to trigger a re-generation of EDC content from the app. The consultant would need to re-run the Make.com automation manually, and even then, Blob edit overlays would mask the new data.

**Goal:** A "Regenerate" button at deck level that re-fires the AI pipeline against updated Job Summary criteria. Clear handling of what happens to consultant manual edits (warn, archive, or selectively preserve). Real-time feedback when regeneration completes.

### 4. Single Source of Truth

**Today:** Data lives in 4+ places (JSON fixtures, Google Sheets tabs, Vercel Blob overlays, localStorage) with a complex priority chain determining which version wins. This makes debugging impossible and creates subtle data inconsistencies.

**Goal:** Supabase is the canonical data store. Everything reads from and writes to Supabase. No priority chain, no merge logic, no stale overlays.

---

## Current Technical Architecture (What Exists Today)

### Tech Stack
- **Framework:** Next.js 14 (App Router), deployed on Vercel
- **Styling:** Tailwind CSS + custom design tokens
- **AI:** Claude API (Sonnet) for EDS→EDC transformation, Our Take generation, PDF criteria extraction
- **Data stores:** Google Sheets (3 tabs), Vercel Blob (file + JSON storage), static JSON fixtures in git
- **Automation:** Make.com (reads Sheets, calls Claude, writes back to Sheets)
- **Auth:** None (obscurity-only URLs)

### Data Flow (Current)

```
Consultant interviews candidate
        ↓
Manually enters data into Google Sheets ("EDS Text Store")
        ↓
Make.com reads EDS rows → calls Claude API → structures into EDC JSON
        ↓
Make writes structured JSON to Google Sheets ("EDC Output Store")
        ↓
Next.js app reads from Sheets (or static JSON fixtures in /data/decks/)
        ↓
Browser renders EDC cards
        ↓
Consultant edits in-browser (contentEditable fields)
        ↓
Auto-saves: localStorage → debounce 2s → POST /api/edits/save → Vercel Blob
        ↓
Next page load: Blob overlay takes priority over all other data sources
```

### Data Priority Chain (Current — the core problem)

```
Priority 0 (HIGHEST): Vercel Blob edit overlays (edits/{searchId}/{candidateId}.json)
Priority 1: Static JSON fixtures (/data/decks/{searchId}.json with candidates array)
Priority 2: EDC Output Store sheet (Make-generated structured JSON)
Priority 3: Raw EDS text + Claude transformation (fallback)
Priority 4: Legacy test fixtures
```

This means:
- Blob edits ALWAYS win, even over fresh AI-generated content
- Regenerating content via Make is invisible if blob edits exist
- No way to selectively preserve some edits while accepting new generated content
- Debugging "why does this field show X?" requires checking 4 data sources

### Google Sheets Structure (Current)

**Spreadsheet ID:** `1FOcDCMlmmHs9TL1WxhLE_R4Y6cQng-ICWo7Pjr0xtaA`

**EDS Text Store** (one row per candidate):
- search_key, candidate_name, title, company, location
- compensation fields (current total, expected total, flexibility)
- notice_period, timeline_constraints
- key_concern, key_strength, our_take
- scope_match_dimensions, key_criteria_assessment
- consultant_name, eds_date
- ~27 columns, positional indexing (fragile)

**JS Text Store** (one row per search):
- search_name, search_lead, client_name, client_location
- 5 key criteria (name/flash/detail each at specific column indices)
- 3 alternative criteria
- Budget figures (base, bonus, MIP/LTI, DI)
- scope_match_dimensions (pipe-separated)
- ~47 columns, positional indexing (extremely fragile)

**EDC Output Store** (one row per candidate):
- Contains `edc_json` column with pre-structured JSON from Make.com

### Vercel Blob Storage Structure (Current)

```
edits/{searchId}/{candidateId}.json     ← Full EDCData overlay (auto-saved)
deck-config/{searchId}/card-order.json  ← Card display order
deck-config/{searchId}/hidden-candidates.json
cv/{searchId}/{candidateId}.pdf
job-summary/{searchId}/{filename}.pdf
photos/{searchId}/{candidateId}.jpg
```

### API Routes (Current)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/deck/[searchId]` | GET | Full SearchContext (all candidates for deck) |
| `/api/edc/[searchId]/[candidateId]` | GET | Single candidate EDCData |
| `/api/edits/save` | POST | Save edit overlay to Vercel Blob |
| `/api/deck/[searchId]/sync-criteria` | POST | Claude Vision extracts criteria from Job Summary PDF → writes to JS Text Store sheet |
| `/api/deck/[searchId]/order` | POST | Save card order to Blob |
| `/api/deck/[searchId]/hidden` | POST | Save hidden candidates to Blob |
| `/api/transform` | POST | Raw EDS text → EDCData via Claude |
| `/api/generate-our-take` | POST | Generate Our Take assessment via Claude |
| `/api/blob/upload` | POST | File uploads (CVs, photos, PDFs) |
| `/api/blob/list` | GET | List blobs by prefix |

### Key Codebase Files

| File | Lines | Purpose |
|------|-------|---------|
| `/src/lib/data.ts` | ~14,000 | Data loading with priority chain (getDeckData, getCandidateData) |
| `/src/lib/sheets-transform.ts` | ~764 | Parses Sheets rows by column index into typed objects |
| `/src/lib/sheets.ts` | ~200 | Google Sheets API client |
| `/src/lib/types.ts` | ~200 | TypeScript interfaces (EDCData, SearchContext, IntroCardData) |
| `/src/hooks/useAutoSave.ts` | ~300 | localStorage → Blob edit persistence pipeline |
| `/src/app/deck/[searchId]/DeckClient.tsx` | ~1100 | Deck landing page (grid, Job Summary panel, edit mode) |
| `/src/components/edc/EDCCard.tsx` | ~800 | Main EDC card (3-page paginated layout) |
| `/data/decks/*.json` | varies | Static fixture files (8 decks currently) |

### TypeScript Interfaces (Core)

```typescript
interface EDCData {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;

  scope_match: {
    scope: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;

  key_criteria: {
    name: string;
    evidence: string;       // 1-2 sentences with <strong> tags
    context_anchor?: string; // Company name pill
  }[];

  compensation: {
    current_base: string;
    current_bonus?: string;
    current_lti?: string;
    current_benefits?: string;
    current_total: string;
    expected_base: string;
    expected_bonus?: string;
    expected_lti?: string;
    expected_benefits?: string;
    expected_total: string;
    flexibility: string;
    budget_range?: string;
    budget_base?: string;
    budget_bonus?: string;
    budget_lti?: string;
  };
  notice_period: string;

  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];

  potential_concerns?: {
    concern: string;
    severity: string;
  }[];

  our_take: {
    text: string;
    recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';
    discussion_points?: string[];
    original_note?: string;
    ai_rationale?: string;
  };
  our_take_fragments?: string[];

  miscellaneous?: { text: string; display: 'SHOW' | 'HIDE' };
  motivation_hook?: string;
  status?: 'new' | 'active' | 'rejected' | 'hold' | 'to_send';

  search_name: string;
  role_title: string;
  generated_date: string;
  consultant_name: string;
  match_score_percentage?: number;
  match_score_display?: 'SHOW' | 'HIDE';
  cv_url?: string;
  linkedin_url?: string;
  cv_highlights?: string[];
}

interface SearchContext {
  search_name: string;
  client_company: string;
  client_display_name?: string;
  client_location: string;
  client_logo_url?: string;
  key_criteria_names: string[];
  search_lead: string;
  job_summary_url?: string;
  job_summary_pdf_url?: string;
  candidates: IntroCardData[];
  card_order?: string[];
  hidden_candidates?: string[];
  deck_settings?: {
    match_score_display: 'SHOW' | 'HIDE';
    our_take_display: 'SHOW' | 'HIDE';
    scope_narrative_display: 'SHOW' | 'HIDE';
    edit_mode: boolean;
  };
}

interface IntroCardData {
  candidate_id: string;
  initials: string;
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;
  headline: string;
  flash_summary?: string;
  compensation_alignment: 'green' | 'amber' | 'not_set';
  career_trajectory?: string;
  industry_shorthand?: string;
  status?: string;
  edc_data: EDCData;
}
```

---

## Proposed Architecture (Supabase)

### Why Supabase

1. **Structured data with proper types** — no more positional column indices
2. **Real-time subscriptions** — browser gets push updates when Make finishes regenerating
3. **Row Level Security** — proper auth without building it from scratch
4. **Built-in auth** — magic links (already on the roadmap) come free
5. **Direct API** — Make.com has native Supabase connector
6. **Eliminates the priority chain** — one source of truth, edits update in place

### Proposed Schema (Starting Point for Discussion)

```sql
-- Searches (one per engagement)
CREATE TABLE searches (
  id TEXT PRIMARY KEY,                    -- e.g. 'cvw-ops-dir'
  search_name TEXT NOT NULL,              -- 'Operations Director'
  client_company TEXT NOT NULL,
  client_display_name TEXT,
  client_location TEXT,
  client_logo_url TEXT,
  deck_logo_url TEXT,
  search_lead TEXT,
  role_title TEXT,

  -- Key criteria (from Job Summary)
  key_criteria JSONB,                     -- [{name, flash, detail}] — up to 5
  alt_criteria JSONB,                     -- [{name, description}] — up to 3
  scope_dimensions TEXT[],                -- ['Industry Context', 'Operations Scale', ...]

  -- Budget (from Job Summary)
  budget_base TEXT,
  budget_bonus TEXT,
  budget_lti TEXT,
  budget_total TEXT,

  -- Job Summary source tracking
  job_summary_url TEXT,                   -- SharePoint/OneDrive URL
  job_summary_blob_url TEXT,              -- Vercel Blob URL for uploaded PDF
  job_summary_last_synced TIMESTAMPTZ,
  job_summary_hash TEXT,                  -- detect changes

  -- Deck settings
  deck_settings JSONB DEFAULT '{"match_score_display":"HIDE","our_take_display":"SHOW","scope_narrative_display":"SHOW","edit_mode":false}',
  card_order TEXT[],                      -- ordered candidate IDs
  hidden_candidates TEXT[],               -- hidden candidate IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates (one per candidate per search)
CREATE TABLE candidates (
  id TEXT PRIMARY KEY,                    -- e.g. 'marla-brown'
  search_id TEXT REFERENCES searches(id),
  candidate_name TEXT NOT NULL,
  current_title TEXT,
  current_company TEXT,
  location TEXT,
  photo_url TEXT,

  -- Intro card fields
  initials TEXT,
  headline TEXT,                          -- snippet for landing page
  flash_summary TEXT,
  compensation_alignment TEXT DEFAULT 'not_set',
  career_trajectory TEXT,
  industry_shorthand TEXT,
  status TEXT DEFAULT 'new',

  -- Full EDC data (the big payload)
  edc_data JSONB,                         -- Full EDCData object

  -- Edit tracking
  ai_generated_edc JSONB,                -- Original AI output (preserved for diff/reset)
  manually_edited_fields TEXT[],          -- Which fields consultant has touched
  last_generated_at TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ,
  edited_by TEXT,                         -- consultant name or 'ai'

  -- Source data
  eds_raw_text TEXT,                      -- Original EDS text (for regeneration)

  -- Files
  cv_url TEXT,
  linkedin_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(search_id, id)
);
```

### Key Schema Design Decisions to Discuss

1. **`edc_data` as JSONB vs normalised tables.** JSONB is simpler and matches the current TypeScript interface exactly. Normalised tables (separate `scope_match`, `key_criteria`, `compensation` tables) give better query/update granularity. Recommendation: start with JSONB, normalise later if needed.

2. **`ai_generated_edc` column.** This preserves the original AI output separately from consultant edits. Enables "Reset to AI-generated" per-field, and lets regeneration compare old vs new AI output before overwriting.

3. **`manually_edited_fields` tracking.** When a consultant edits a field, that field name gets added to this array. On regeneration, the system can warn: "You've manually edited Key Criteria and Our Take — regeneration will overwrite these. Continue?"

4. **Key criteria on `searches` table, not just in each candidate's `edc_data`.** This is the single source of truth for criteria names. When Job Summary changes criteria, update `searches.key_criteria` and cascade the NAME change to all candidates' `edc_data.key_criteria[].name` — without touching evidence text.

---

## The Job Summary ↔ SharePoint ↔ Supabase Problem

This is the hardest part to get right. Here's the challenge:

### Current Reality
- Consultants create Job Summaries in **Word** (using a SmartSearch template)
- These live in **SharePoint/OneDrive** (per-search folders)
- Consultants edit them continuously — after client calls, after candidate conversations
- The EDC app receives a **PDF snapshot** (uploaded manually)
- PDF extraction via Claude Vision pulls out criteria names
- But by the time the PDF is uploaded, the Word doc may have already changed again

### Options to Explore

**Option A: SharePoint Webhook → Supabase Sync**
- Register a SharePoint webhook on the Job Summary Word file
- When the file changes, a webhook fires
- A serverless function (or Make.com scenario) picks up the change
- Extracts criteria/scope/comp from the updated Word doc (via Claude or structured parsing)
- Writes updated fields to `searches` table in Supabase
- Supabase real-time pushes update to any open browser session

**Pros:** Fully automatic, consultants don't change their workflow
**Cons:** SharePoint webhooks are complex (Microsoft Graph API, subscription renewal every 3 days, change notifications are batched not instant). Word document parsing is harder than PDF extraction.

**Option B: OneDrive Embed + Manual Sync Button**
- Store the SharePoint/OneDrive URL in `searches.job_summary_url`
- Embed the Word doc viewer in the EDC app (Microsoft provides embed URLs)
- Add a "Sync from Job Summary" button that:
  1. Downloads the latest Word doc via Graph API
  2. Converts to PDF or extracts text
  3. Runs Claude extraction
  4. Updates `searches` table
  5. Optionally triggers candidate EDC regeneration

**Pros:** Simpler than webhooks, consultant controls when sync happens
**Cons:** Manual step, consultant could forget to sync

**Option C: Structured Job Summary Form in EDC App**
- Instead of parsing Word docs, build a Job Summary editor in the EDC web app
- Consultants enter criteria, scope dimensions, comp ranges directly
- This writes to Supabase, which becomes the source of truth
- Export TO Word/PDF for external sharing (reverse the flow)

**Pros:** Cleanest data flow, no parsing ambiguity
**Cons:** Requires consultants to change workflow (risky — they love Word)

**Option D: Hybrid — Word is king, but structured sync exists**
- Consultants keep editing in Word/SharePoint
- EDC app has a "structured view" of the Job Summary (read from Supabase)
- Periodic sync (manual or scheduled) extracts from Word → updates Supabase
- Consultants can also edit criteria directly in the EDC app
- **Bidirectional conflict resolution:** if consultant edits criterion name in EDC, flag it as divergent from Word source. On next sync, show diff and let consultant choose.

**This is probably the right answer** — it respects the Word workflow while building toward structured data.

---

## The Regeneration Workflow (Detailed)

### Trigger Points
1. **Job Summary updated** (new PDF uploaded, or SharePoint sync detects changes)
2. **Consultant clicks "Regenerate"** in deck edit mode
3. **New candidate added** to an existing search

### What Gets Regenerated
- **Criteria names only** (fast) — just cascade name changes from `searches.key_criteria` to all `candidates.edc_data.key_criteria[].name`
- **Full EDC content** (slow) — re-run Make.com/Claude pipeline on each candidate's EDS data against updated Job Summary
- **Single candidate** — regenerate one candidate (e.g., after editing their EDS text)

### Proposed Flow

```
Consultant clicks "Regenerate All" in deck edit mode
        ↓
App shows confirmation: "3 of 6 candidates have manual edits. Regeneration will:
  - Update criteria names for all candidates
  - Regenerate AI content for unedited candidates
  - Archive edited candidates' current state (restorable)
  Proceed?"
        ↓
App calls POST /api/deck/{searchId}/regenerate
        ↓
API writes regeneration request to Supabase `regeneration_jobs` table
        ↓
Make.com picks up the job (via Supabase trigger or webhook)
        ↓
Make processes each candidate: EDS text + Job Summary → Claude → structured EDC JSON
        ↓
Make writes results to candidates.ai_generated_edc in Supabase
        ↓
For candidates WITHOUT manual edits: copy ai_generated_edc → edc_data
For candidates WITH manual edits: keep edc_data, update criteria names only
        ↓
Supabase real-time pushes updates to browser
        ↓
UI shows "Regeneration complete" toast with summary of changes
```

### The `regeneration_jobs` Table

```sql
CREATE TABLE regeneration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id TEXT REFERENCES searches(id),
  type TEXT NOT NULL,                     -- 'full' | 'criteria_only' | 'single_candidate'
  candidate_id TEXT,                      -- null for full/criteria_only
  status TEXT DEFAULT 'pending',          -- 'pending' | 'processing' | 'complete' | 'failed'
  requested_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB                            -- summary of what changed
);
```

---

## Migration Path (Sheets → Supabase)

We don't need to rip out everything at once. Proposed phases:

### Phase 1: Supabase as Read/Write Layer (Keep Sheets as Input)
- Create Supabase schema
- Migrate existing fixture data into Supabase tables
- Point app's data loading at Supabase instead of fixtures/Sheets
- Edit persistence writes directly to Supabase (replace Blob overlays)
- **Sheets still exists** as consultant data entry point — Make syncs Sheets → Supabase

### Phase 2: Job Summary Sync
- Store SharePoint URLs in `searches` table
- Build sync mechanism (Option B or D above)
- Criteria changes cascade to candidates automatically

### Phase 3: Regeneration Pipeline
- Build regeneration_jobs table and workflow
- Make.com reads from and writes to Supabase
- Real-time UI updates

### Phase 4: Direct Data Entry (Eliminate Sheets)
- Build EDS entry form in the app (or keep Make.com as the structured entry point)
- Consultants no longer need to touch Google Sheets
- Sheets becomes optional/legacy

---

## Questions We Need to Answer Together

1. **JSONB vs normalised tables** for EDC data — what level of granularity do we need for queries and partial updates?

2. **Job Summary sync mechanism** — which option (A/B/C/D) best fits the team's actual workflow? How technical are the consultants? Will they reliably click a "Sync" button?

3. **Edit preservation strategy** — field-level tracking (`manually_edited_fields` array) vs snapshot-based (keep `ai_generated_edc` and `current_edc` separately)? Field-level is more precise but more complex.

4. **Make.com's role going forward** — is Make the right orchestrator long-term, or should the Claude API calls move into the Next.js app (or a separate backend)? Make adds latency and a black-box debugging layer, but it's visual and the team can modify workflows without code deployments.

5. **Auth timeline** — do we implement Supabase auth (magic links) as part of this migration, or keep obscurity-only URLs and add auth later?

6. **File storage** — keep Vercel Blob for files (CVs, photos, PDFs) and use Supabase only for structured data? Or consolidate everything into Supabase Storage?

7. **Offline/latency** — current localStorage-first approach means edits feel instant even with slow connections. Moving to Supabase-first means network dependency. Do we keep localStorage as a write-ahead cache, or is the added complexity not worth it?

---

## Environment & Dependencies (Current)

```
ANTHROPIC_API_KEY=sk-ant-...           # Claude API
BLOB_READ_WRITE_TOKEN=vercel_blob_...  # Vercel Blob
GOOGLE_SERVICE_ACCOUNT_EMAIL=...       # Google Sheets (to be replaced)
GOOGLE_PRIVATE_KEY=...                 # Google Sheets (to be replaced)
GOOGLE_PROJECT_ID=...                  # Google Sheets (to be replaced)
# NEW (needed):
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
# OPTIONAL (for SharePoint integration):
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...
```

---

## Summary: What We Need From This Conversation

1. **Validate the Supabase schema** — is this the right table structure?
2. **Choose the Job Summary sync approach** — SharePoint webhooks vs manual sync vs hybrid
3. **Design the regeneration workflow** in detail — especially the edit preservation UX
4. **Agree on migration phasing** — what ships first?
5. **Decide Make.com's long-term role** — keep it, replace it, or evolve it?
