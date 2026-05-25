# CLAUDE.md — SmartSearch EDC

> **Last rewritten:** May 25, 2026. This is a description of what the system **is**, not what to build. For the historical March v2.0 build spec see the Decision Log at the bottom.

## What this is

The Executive Decision Card (EDC) is a one-screen, paginated candidate brief designed to replace the consultant's verbal pitch on alignment calls. **The real competitor is not the 40-page PowerPoint — it's the consultant's voice for 90 seconds.** Every word that doesn't help that pitch is wasted.

Live at **edc.smartsearchexec.com**. Vercel auto-deploys from `main`.

---

## The One Rule

**Each EDC page fits a 13" laptop screen without scrolling.** The card is height-locked: `calc(100vh - 140px)`, clamped between 520px and 720px (`EDCCard.tsx:254`). Content scrolls *within* a panel only as a last resort, never as the default. If it doesn't fit, cut words.

---

## Tech Stack

- **Framework:** Next.js 14.2 (App Router)
- **Backend:** Vercel Blob (overlays, photos, deck config) + Supabase (`@supabase/supabase-js`) for native searches + Google Sheets (legacy Make pipeline)
- **PDF generation:** Puppeteer-core + `@sparticuz/chromium-min` (server-side, for brief PDFs)
- **Auth:** JWT cookies via `jose` (per-search password gate, toggleable)
- **Styling:** Tailwind + custom CSS tokens
- **Fonts:** Inter (Outfit class), Cormorant Garamond (italic eyebrows), Sorts Mill Goudy (display)
- **AI:** `@anthropic-ai/sdk` for Our Take generation, candidate regeneration, brief drafts
- **Document parsing:** `mammoth` (DOCX → text)

---

## Routes

### Pages
| Path | Purpose |
|------|---------|
| `/` | Branded gateway homepage |
| `/deck/[searchId]` | Deck landing — client view, read-only |
| `/deck/[searchId]/edit` | Consultant edit mode (auth-exempt) |
| `/deck/[searchId]/access` | Password gate (only when enabled per-search) |
| `/deck/[searchId]/settings` | Logo upload, deck config |
| `/deck/[searchId]/closed` | Closed-search state page |
| `/search/[searchId]/edc/[candidateId]` | Standalone EDC URL |
| `/transform` | EDS-to-EDC text transform utility |
| `/cheatsheet` | Internal reference |

### API
Under `src/app/api/`:

- `deck/[searchId]/route.ts` — deck data
- `deck/[searchId]/brief/route.ts` — role brief CRUD; edit triggers candidate regen
- `deck/[searchId]/candidates/[slug]/regenerate/route.ts` — per-candidate regen
- `deck/[searchId]/candidates/[slug]/apply-regeneration/route.ts` — merge resolved conflicts
- `deck/[searchId]/regenerate-all/route.ts` — bulk regen
- `deck/[searchId]/criteria-visibility/route.ts` — per-candidate hidden criteria
- `deck/[searchId]/deck-settings/route.ts` — Our Take mode, narrative toggle, etc.
- `deck/[searchId]/access-settings/route.ts` — per-search password toggle (admin)
- `deck/[searchId]/order/route.ts` — card order persistence
- `deck/[searchId]/hidden/route.ts` — hidden candidates list
- `deck/[searchId]/mark-complete/route.ts` — `is_complete` flag
- `deck/[searchId]/pdf/route.ts` — server-side deck PDF (Puppeteer, RFC 5987 Content-Disposition)
- `deck/[searchId]/sync-criteria/route.ts` — JS criteria sync
- `edc/[searchId]/[candidateId]/route.ts` — single candidate
- `edits/save/route.ts` — auto-save overlay to Blob
- `generate-our-take/route.ts` — AI Our Take generation
- `narrative/[candidateId]/route.ts` — GET/PUT/DELETE Spiel narrative
- `pipeline/iv/route.ts` — V2 IV envelope ingest + disambiguation gate + pipeline_log
- `pipeline/js/route.ts` — Job Summary ingest
- `pipeline/match/route.ts` — match scoring
- `pipeline/log/route.ts` — pipeline event log
- `blob/upload|delete|list/route.ts` — Blob primitives
- `transform/route.ts` — EDS text → EDC JSON
- `debug/[searchId]/route.ts` — dev diagnostics

---

## Data Source Priority

`src/lib/data.ts` resolves a search in this order. **First hit wins.**

1. **Fixture with pre-structured candidates** (`data/decks/{searchId}.json` with nested `edc_data`) — highest priority. No enrichment needed.
2. **Supabase-native search** (when `SUPABASE_ENABLED` and no fixture) — reads from `searches` + `candidates` tables. Merges `ai_generated_edc` (pristine Engine output) with `edc_data` (user-edited) via `mergeKeyCriteria()`.
3. **Sheets EDC Output Store** (when `GOOGLE_SERVICE_ACCOUNT_EMAIL` set) — pre-transformed structured JSON from Make Engine.
4. **Sheets raw EDS text + transformation** — legacy fallback via `sheets-transform.ts`.
5. **JSON fixture (deck-level only, no candidates)** — partial.
6. **Legacy flat fixtures** (`data/test_fixtures.json`) — last resort.

**On top of any source**, `data.ts` applies in this order:
- Edit overlays from `edits/{searchId}/{candidateId}.json` (Blob)
- Photos from `photos/{searchId}/{candidateId}.{ext}` (Blob)
- Card order from `deck-config/{searchId}/card-order.json` (Blob)
- Hidden candidates from `deck-config/{searchId}/hidden-candidates.json` (Blob)
- Deck-level criteria names enforced over stale overlay names (Quality Rule #5)

> **Supabase-native exception:** for Supabase-backed searches, Blob *edit* overlays are skipped (Supabase is canonical). Blob photos, card order, and hidden candidates still apply.

---

## Storage Layers

| Layer | What | Path |
|-------|------|------|
| **Vercel Blob** | Edit overlays | `edits/{searchId}/{candidateId}.json` |
| | Photos | `photos/{searchId}/{candidateId}.{jpg/png}` |
| | Card order | `deck-config/{searchId}/card-order.json` |
| | Hidden candidates | `deck-config/{searchId}/hidden-candidates.json` |
| | Brief PDFs | `briefs/{searchId}/...` |
| **Supabase** | Searches table | `searches` (budget_*, scope_match_dimensions, is_complete, password, updated_at, etc.) |
| | Candidates table | `candidates` (ai_generated_edc, edc_data, raw_manual_notes, candidate_slug) |
| | Narrative table | `candidate_narratives` |
| | Pipeline logs | `pipeline_log` |
| **IndexedDB** | Client-side blobs | `src/lib/fileStore.ts` — CV PDFs, Job Summary PDFs |
| **localStorage** | Per-field edits before auto-save flushes | `edc_edit_{candidateId}_{section}`, `edc_photo_{candidateId}`, `card_edits_{candidateId}` |

---

## EDC Card Structure

`src/components/edc/EDCCard.tsx` is a paginated card. State is a single `currentPanel: 1 | 2 | 3 | 4`.

| Panel | Tab Label | Component | Content |
|-------|-----------|-----------|---------|
| 1 | Scope | `ScopeMatch.tsx` | Scope alignment table + optional narrative |
| 2 | Criteria | `KeyCriteria.tsx` | Bullet-format evidence with inline context pills |
| 3 | Compensation | `Compensation.tsx` | Three-layer comp + notice + optional Miscellaneous |
| 4 | Spiel (EDS) | `NarrativeTab.tsx` | **Consultant-only** internal narrative |

Persistent across all panels:
- `EDCHeader.tsx` — name, title, company, location, photo, LinkedIn link
- `MotivationStrip.tsx` — scrambler that cycles motivation_hook + why_interested headlines + our_take_fragments (yes, it's a carousel — kept by design)
- `TabNavigation.tsx` — tab bar; 4th tab visible only when `isEditable`
- `EDCFooter.tsx` — search name, role title, small confidentiality note

**Our Take** floats above the card via `OurTakePopover.tsx` (✦ icon, top-right). In client view with mode `'leading'`, an overlay covers the panel on first open. See "Our Take Modes" below.

---

## Our Take Modes

Resolved by `src/lib/our-take-mode.ts`:

| Mode | Behavior |
|------|----------|
| `leading` | Auto-opens as full-panel overlay on mount. View Evidence button dismisses to panels. |
| `button` | Default since May 18, 2026 (Phil's request). ✦ Our Take pill in top-right; click to open popover. |
| `hidden` | Section not rendered at all in client view. |

Deck settings field: `deck_settings.our_take_mode`. Legacy fields `our_take_display` (SHOW/HIDE) and `our_take_landing` (overlay/bubble) are still read for back-compat — `resolveOurTakeMode()` handles the cascade. The two legacy fields are kept in sync on write via `modeToLegacyFields()`.

In edit mode, the popover (`OurTakePopover`) replaces the overlay — consultants compose/regenerate from there. `OurTakeEmptyState` renders a CTA pill when no Our Take exists yet.

**Content shape:** `our_take_fragments: string[]` is the v1.1+ format — rendered as bullets. Legacy `our_take.text` paragraph is only rendered when no fragments exist (prevents stacking AI paragraphs behind consultant bullets — Tara/cvw-ops-dir bug, Apr 22).

---

## Edit Mode

Triggered by `/deck/[searchId]/edit` (auth-exempt). Wraps deck in `EditorContext` (`src/contexts/EditorContext.tsx`) which sets `isEditable: true`.

**Per-field edits:**
- Each editable section writes to `localStorage` under `edc_edit_{candidateId}_{section}` keys (header, scope, criteria, comp, ourtake, motivation).
- `EditableField.tsx` renders a gold tracking dot when modified.
- `signalEdit(candidateId)` dispatches the `edc-edit` event.

**Auto-save (`src/hooks/useAutoSave.ts`):**
- `useAutoSave` listens for `edc-edit` and `storage` events, debounces 2000ms, then POSTs the merged overlay to `/api/edits/save`.
- `useAutoSaveGrid` handles IntroCard edits from the deck landing page.
- Aborts in-flight saves via `AbortController` (Reset path) and flushes pending saves on unmount.

**Stale-write protection (`src/lib/edit-hash.ts`):**
- `isEditFresh(key, baseData)` compares a hash of base prop data against stored base — if upstream changed, the local edit is treated as stale.
- `writeBaseHash` updates the stored base after a successful save.

**Reset tiers:**
1. Per-field reset (gold dot click) — clears one localStorage key.
2. Reset Edits (candidate-level) — clears all `edc_edit_{candidateId}_*` keys + `card_edits_{candidateId}` + cancels in-flight saves.
3. `ReviewChangesModal.tsx` — resolves conflicts when card-level Regenerate returns diverging fields.

**Regenerate flow:**
- `RegenerateButton.tsx` calls `/api/deck/[searchId]/candidates/[slug]/regenerate` when `has_raw_notes`.
- Returns conflicts if user edits diverge from new AI output → `ReviewChangesModal` lets the consultant pick per-field.
- `apply-regeneration/route.ts` merges the chosen fields into Supabase + clears matching overlays.
- Editing the Role Brief (`/api/deck/[searchId]/brief` PUT) cascades to per-candidate regenerate — merge-aware (commit `d5f2d91`).

---

## Pipeline (V2 IV)

`src/app/api/pipeline/iv/route.ts` is the Make Engine ingest. Accepts the V2 envelope:

```json
{ "iv": { "search_id": "...", "candidate_name": "...", "edc_data": { ... }, "ai_generated_edc": { ... } } }
```

Behavior:
- Disambiguation gate: rejects payloads where `candidate_name` is ambiguous within a search.
- Upsert key: `(search_id, candidate_name)` matches the unique constraint.
- Dual-write narrative: writes to `candidate_narratives` table AND mirrors structured fields into `candidates.edc_data` (commit `f730008`).
- Merge-aware: existing user edits in `edc_data` are preserved; `ai_generated_edc` always holds pristine Engine output.
- Inserts/upserts a row into `pipeline_log` for every call.

`pipeline/js/route.ts` ingests Job Summaries into `searches`. `pipeline/match/route.ts` writes match scores.

---

## Access Control

Per-search password gate via JWT cookie. Default: **off**.

- `src/lib/edcAccess.ts` — `signAccessToken(searchId)` (48h expiry), `verifyAccessToken`, `cookieName(searchId)`.
- `src/lib/passwordGen.ts` — Stage 2 random ASCII generator.
- `/deck/[searchId]/access/page.tsx` — gate UI.
- Admin UI at `/deck/[searchId]/settings` toggles password requirement and rotates the password (commit `8f29ad0`).
- Edit route `/deck/[searchId]/edit` is path-exempt from the gate (commit `d8a6bbb`).
- `EDC_COOKIE_SECRET` env var required.
- `timingSafeEqualString()` for constant-time comparison.

The Feb-era "access code wall" is gone — direct URL access is fine unless a search opts in. ASCII-only assumption for passwords.

---

## Component Map

```
src/components/
  edc/
    EDCCard            — Paginated container, panel state, swipe nav, autosave wiring
    EDCHeader          — Name, title, company, location, photo, LinkedIn
    TabNavigation      — 3-tab (client) / 4-tab (consultant) bar
    PageNavigation     — Dots + arrows (alternate nav, optional)
    ScopeMatch         — Scope table, editable rows, narrative toggle
    KeyCriteria        — Bullet evidence + inline context pills, per-candidate visibility overlay
    Compensation       — Three-layer (headline / detail / deal-sensitive notes), Target Range column
    CompTicker         — Compensation summary strip
    MotivationStrip    — Scrambler carousel (motivation_hook + why_interested + our_take_fragments)
    WhyInterested      — Headlines-only (legacy, kept for completeness — no longer mounted by EDCCard)
    Miscellaneous      — Optional consultant-typed notes section
    NarrativeTab       — "Spiel (Internal)" — full EDS v1.2 layout, consultant-only
    OurTakePopover     — Floating editable Our Take with AI generation
    OurTakeEmptyState  — CTA pill when no Our Take exists yet (edit mode)
    OurTakeSavedToast  — Confirmation toast
    OurTake            — Legacy static render (kept for back-compat; new code uses popover)
    EditableField      — Click-to-edit primitive, gold dot, reset
    RegenerateButton   — Card-level AI regenerate trigger
    RegenerateToast    — Regenerate-in-progress feedback
    ReviewChangesModal — Per-field conflict resolution after regenerate
    EDCFooter          — Search name, role, confidentiality

  deck/
    DeckClient         — Top-level orchestration for /deck/[searchId]
    DeckEDCView        — Single-candidate view inside the deck shell
    DeckNavigation     — Prev/Next candidate
    CandidateNavigation — Candidate list strip
    CandidateGrid      — Landing grid wrapper
    IntroCard          — Per-candidate card (name, photo, title, location, snippet, status badge)
    ComparisonView     — Historical compare table — still present, but landing page is now the canonical index
    DeckSettings       — Logo upload, deck config admin UI
    EDCStatusBar       — Status info bar
    SearchContextHeader — Deck-level hero

  split/
    SplitViewContainer — CV + EDC side-by-side (60% EDC / 40% CV — see Decision Log)
    SplitToggle        — Show/hide CV panel
    CVPanel            — PDF iframe + IndexedDB lookup + full-page toggle

  ui/
    SectionLabel
    ContextAnchorPill
    AlignmentDot       — clientView prop collapses gap → amber
    LinkedInLink
```

---

## Hooks

- `useAutoSave(searchId, candidateId, baseEdc)` — debounced overlay save (single candidate).
- `useAutoSaveGrid(searchId, candidates)` — grid version for IntroCard edits.
- `useDeckMotivation()` — shared motivation state for the deck.
- `useDeckTheme()` — light/dark theme persistence.
- `useSwipeNavigation({ onSwipeLeft, onSwipeRight })` — touch swipe for candidate prev/next.

`signalEdit(candidateId)`, `markDirty(candidateId)`, `clearDirty(candidateId)` are module-level helpers exported from `useAutoSave.ts`.

---

## Data Contract

The canonical types live in `src/lib/types.ts`. Summary of the live shape (May 2026):

```typescript
type EDCContext = 'standalone' | 'deck' | 'comparison' | 'print';

interface EDCData {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;

  scope_match: {
    scope: string;                         // renamed from "dimension"
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;                // optional narrative under the table

  key_criteria: {
    name: string;                          // MUST match SearchContext.key_criteria_names exactly
    evidence: string;                      // 1-2 sentences, <strong> for key phrases
    context_anchor?: string;               // company name pill, inline-end
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
  earliest_start_date?: string;            // kept in type, not rendered

  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];

  potential_concerns: {                    // present in type only — no client UI renders this
    concern: string;
    severity: 'development' | 'significant';
  }[];

  our_take: {
    text: string;
    recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';
    discussion_points?: string[];
    original_note?: string;                // raw consultant note, consultant-only
    ai_rationale?: string;                 // consultant-only
  };
  our_take_fragments?: string[];           // v1.1+ bullet format — preferred over .text

  miscellaneous?: { text: string; display: 'SHOW' | 'HIDE' };

  search_name: string;
  role_title: string;
  generated_date: string;
  consultant_name: string;

  match_score_percentage?: number;
  match_score_display?: 'SHOW' | 'HIDE';

  status?: 'new' | 'active' | 'rejected' | 'hold' | 'to_send';
  motivation_hook?: string;                // single line, rendered in MotivationStrip carousel

  cv_url?: string;
  linkedin_url?: string;
  cv_highlights?: string[];
}

interface SearchContext {
  search_name: string;
  role_title?: string;
  client_company: string;
  client_display_name?: string;
  client_location: string;
  client_logo_url?: string;
  key_criteria_names: string[];            // SSOT — overrides candidate-level names
  search_lead: string;
  job_summary_url?: string;
  job_summary_pdf_url?: string;
  js_source_url?: string;                  // external fallback (e.g., SharePoint)
  scope_match_dimensions?: { name: string; role_requirement: string }[];
  search_budget?: {
    base?: string; bonus?: string; lti?: string;
    di?: string; benefits?: string; total?: string;
  };
  candidates: IntroCardData[];
  updated_at?: string;                     // server-side timestamp for stale-write protection
  candidate_statuses?: Record<string, string>;
  card_order?: string[];                   // Blob-persisted
  hidden_candidates?: string[];            // Blob-persisted
  hidden_criteria_per_candidate?: Record<string, string[]>;
  deck_settings?: {
    match_score_display: 'SHOW' | 'HIDE';
    our_take_display: 'SHOW' | 'HIDE';
    scope_narrative_display: 'SHOW' | 'HIDE';
    edit_mode: boolean;
    show_linkedin?: boolean;
    js_in_portal?: boolean;
    our_take_landing?: 'overlay' | 'bubble';
    our_take_mode?: 'leading' | 'button' | 'hidden';
  };
  job_summary_data?: JobSummaryData;       // raw JS fields when js_in_portal
}

interface IntroCardData {
  candidate_id: string;
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  initials: string;
  headline?: string;                       // ≤25 word snippet (replaces flash_summary)
  motivation?: string;
  scope_pills?: string[];                  // v2 (replaces key_strengths)
  placed?: boolean;
  notice_period?: string;
  photo_url?: string;
  compensation_alignment?: 'green' | 'amber' | 'not_set';
  career_trajectory?: string;
  industry_shorthand?: string;
  has_raw_notes?: boolean;                 // drives card-level Regenerate visibility
  edc_data: EDCData;
}
```

`buildCandidateContext(data: EDCData): string` (in types.ts) builds the plain-text prompt context for Our Take generation.

---

## Fixture Format

Place new decks at `data/decks/{searchId}.json`. **Always use the pre-structured format** (nested `edc_data` per candidate) — the flat format is legacy.

### Top-level shape

```json
{
  "search_name": "Role Title",
  "client_company": "Client Name",
  "client_display_name": "Optional override for footer",
  "client_location": "City, Country",
  "client_logo_url": null,
  "deck_logo_url": null,
  "search_lead": "Consultant Name",
  "role_title": "Role Title (for footer)",
  "key_criteria_names": ["Criterion 1", "Criterion 2", "..."],
  "job_summary_url": null,
  "job_summary_pdf_url": null,
  "deck_settings": {
    "match_score_display": "HIDE",
    "our_take_mode": "button",
    "scope_narrative_display": "HIDE",
    "edit_mode": false
  },
  "candidates": [ /* IntroCardData with nested edc_data */ ]
}
```

### Per-candidate rules

- `candidate_id`: URL slug (lowercase-hyphenated first-last).
- `headline`: ≤25-word landing-page snippet.
- `compensation_alignment`: `green` | `amber` | `not_set` only — **never `red`**.
- `status`: `new` | `active` | `rejected` | `hold` | `to_send`.
- `edc_data.key_criteria[].name` MUST exactly match top-level `key_criteria_names` (Quality Rule #5, enforced since commit `25f60a9`).
- Evidence uses `<strong>` tags for bold, NOT markdown `**`.
- Scope cells: max 6-8 words.
- `our_take_fragments`: bullet array (preferred). `our_take.text` is the fallback paragraph.

### Currently live decks

| Fixture | Client | Role | Lead |
|---------|--------|------|------|
| `pbv-dcb` | Pepsi Bottling Ventures | Dir Comp & Benefits | Jackie |
| `nor-swf-svp` | Norican Group | SVP StrikoWestofen | Kalum |
| `fer-cco` | Fertiberia Group | CCO | Kalum |
| `don-gtc-mgr` | Doncasters | Global Trade Compliance Mgr | Carlie |
| `dyw-fd` | Dywidag Bridge India | Finance Director | Blair |
| `stada-head-bd` | STADA | Head of BD | Jackie |
| `demo-coo` | Automotive Co. (anonymized) | COO | SmartSearch |
| `cvw-ops-dir` | Crestview | Ops Director | (April) |

Plus any Supabase-native search (no fixture file) like `ktj-cor-ctl`.

---

## Design Tokens

### Colors

```css
/* Core */
--ss-dark:          #1a1a1a
--ss-dark-soft:     #2c2c2c
--ss-header-bg:     #2d2824

/* Gold */
--ss-gold:          #c5a572
--ss-gold-light:    #d4ba8a
--ss-gold-pale:     #e8dbc7
--ss-gold-glow:     rgba(197, 165, 114, 0.15)
--ss-gold-deep:     #b08f5a

/* Backgrounds */
--ss-cream:         #faf8f5
--ss-warm-white:    #f7f4ef
--ss-warm-tint:     #fdfbf7
--ss-page-bg:       #f0ede8

/* Text */
--ss-gray:          #6b6b6b
--ss-gray-light:    #a0a0a0
--ss-gray-pale:     #d4d2ce

/* Semantic */
--ss-green:         #4a7c59          /* Strong alignment */
--ss-yellow:        #c9953a          /* Partial AND gap (client view) */
--ss-red:           #b85450          /* CONSULTANT-ONLY — never client view */
--ss-blue:          #4a6a8c          /* Context anchor pills */
```

**Red rule:** `AlignmentDot.tsx` has a `clientView` prop that collapses `gap` → amber. Red is reserved for internal/consultant views. Phil: "Red scares people."

### Typography

| Use | Family / Weight / Size |
|-----|------------------------|
| Candidate name | Inter 700, 2.0rem |
| Section labels | Inter 600, 0.65rem, uppercase, 2.5px tracking |
| Criteria headings | Inter 600, 0.88rem |
| Body / evidence | Inter 400, 0.82rem, line-height 1.55 |
| Meta labels | Inter 600, 0.65rem, uppercase |
| Meta values | Inter 400, 0.88rem |
| Our Take eyebrow | Cormorant Garamond italic, 1.3rem |
| Footer | Inter 400, 0.7rem |

Cormorant Garamond italic is used sparingly for the Our Take button and eyebrow only — never for body text on dark backgrounds (contrast issues).

---

## Quality Rules

1. **Never infer.** Display only what's in the data. "Not available" for missing fields.
2. **Consultant voice.** "We believe" not "The candidate presents."
3. **No emojis.** Color-coding in Scope Match only.
4. **No red in client view.** Amber/gold is the maximum warning. Red is consultant-only.
5. **Key Criteria names are sacred.** From the Job Summary / `key_criteria_names`. Never renamed, reordered, or reinterpreted by AI. Data loaders enforce this — Blob overlays cannot override deck-level names.
6. **Evidence vs judgment.** Key Criteria are factual. Our Take is the only judgment surface.
7. **No scoring labels.** No numeric scores, no Strong/Moderate/Weak — the bullet IS the assessment.
8. **Context anchors are factual.** Company name, not evaluation.
9. **AI generates positives only.** Negatives are consultant-typed via Miscellaneous.
10. **One screen per page.** If content doesn't fit, cut words.
11. **Pithy over comprehensive.** Every sentence earns its place.
12. **Reset visibility.** Per-field reset dots should be findable but not loud — only in edit mode.
13. **Font contrast.** No gold italic on charcoal body text — eyebrows only.
14. **Fixture review scope.** When adding a candidate, only `key_criteria[].name` canon matters. Don't "fix" `search_name`, `role_title`, or division names in body copy — loader overrides handle the former, and division names are usually intentional (see `feedback_fixture_review.md` memory).

---

## CI / Verification

There are no Vitest / Jest tests in this repo. Pre-commit runs `next lint`. Verify changes by:
- `npm run build` — catches type errors and missing imports.
- `npm run dev` — manual smoke against `/deck/demo-coo` (the cleanest fixture).
- Vercel preview deploys per branch.

---

## Decision Log

### v2.0 (March 9, 2026) — Live PBV pilot review

Full team (Phil, Ayrton, Jackie, Blair, Kalum, Tara, Carlie) reviewed the live pilot. Verdict: **aesthetics validated, IA rejected.** "We've made a six-page document." — Phil. Resulting changes, all now shipped:

| Change | Status |
|--------|--------|
| 3-page paginated card (Scope / Criteria / Comp) | Shipped |
| Header condensed, Search Lead removed | Shipped |
| "Dimension" → "Scope" rename | Shipped |
| Key Criteria → single-sentence bullets with inline context pills | Shipped |
| Potential Concerns section removed from client view | Shipped |
| Miscellaneous toggleable section added | Shipped |
| Compensation three-layer architecture | Shipped |
| Why Interested → headlines only (now in MotivationStrip) | Shipped |
| No red in client view | Shipped (`AlignmentDot.clientView`) |
| Password gate friction removed | Shipped — replaced with opt-in per-search JWT gate, default off |
| `WhatToExpect` intro screen | **Dropped from spec** (May 25 decision) |
| Index view stripped back | Shipped — landing page subsumes the role; `ComparisonView.tsx` retained but not the canonical entry point |
| CV Split: 60% EDC / 40% CV | Shipped — **inverse of original March proposal**, reversed during April sprint. EDC is the primary surface; CV is the reference. |
| Job Summary access from deck | Shipped |
| Photo support via `photo_url` | Shipped (Blob upload UI in edit mode) |

### Post-March enhancements (April–May 2026)

- **March 30 sprint** — Norican fixture, fixture-first data path, photo uploads, motivation header, edit tracking dots, 3-tier reset, edit persistence across navigation, Blob auto-save.
- **March 31** — Auto-save infrastructure, CDN cache busted, comp/Our Take/text-wrap all synced, page state on refresh.
- **April 1** — Doncasters deck, markdown fence stripping, key criteria reordering, `<strong>` rendering.
- **April 2** — Remove/reinstate hidden candidates, settings page contrast fix.
- **April 22** — Bullet-only Our Take render fix (cvw-ops-dir, Tara). When fragments exist, suppress paragraph fallback.
- **Apr 25 – May 18** — Brief PDF (server-side Puppeteer, RFC 5987 filenames), Brief v2 envelope with staleness-aware recovery, per-search password gate via JWT cookie + admin UI, comp Target Range editable from EDC and persisted to `searches.budget_*`, per-candidate Key Criteria visibility overlay, consultant comp sentinels render instead of hiding.
- **May 18** — `our_take_mode: 'leading' | 'button' | 'hidden'` — default changed to `button` per Phil.
- **May 22** — Brief edit triggers candidate regenerate (v1.3 MVP), merge-aware at deck and card level. Conflicts surface via `ReviewChangesModal`.
- **May 22–25** — V2 IV envelope + disambiguation gate in `/api/pipeline/iv`, `pipeline_log` insert-or-update, narrative dual-write to `candidate_narratives`, NarrativeTab restructured to EDS v1.2 and renamed "Spiel (Internal)".

### Things that changed direction

- **CV split proportions.** March spec said CV-dominant (55–60% CV). Shipped is 60% EDC / 40% CV. The April reversal stands — EDC is the primary surface; CV opens to full-page via toggle when needed.
- **Motivation.** March spec said static "Motivation — {hook}" line, no carousel. Shipped is `MotivationStrip` scrambler cycling motivation + why_interested + our_take_fragments. The carousel stays — it's the live behavior.
- **Password gate.** March spec said "fully removed." Shipped is opt-in per-search (default off). The `/access` route persists for searches that turn it on.
- **Our Take default.** March spec said "default HIDE." Shipped default is `button` mode (visible pill, click to open). HIDE is now `our_take_mode: 'hidden'`.
- **`WhatToExpect` intro screen.** March spec required it. Never built. Dropped from scope (May 25).
- **Comparison view.** March spec wanted a stripped Index route. Landing page (`DeckClient` + `IntroCard`) now is the index. `ComparisonView.tsx` is kept but not the canonical navigation target.
- **`Concerns.tsx`.** March spec said DELETE. Removed May 25 — the `potential_concerns` field stays in `EDCData` for back-compat (no UI references it).

---

## Memory references

- `~/.claude/projects/.../memory/platform_state_apr2026.md` — April 6 system snapshot
- `~/.claude/projects/.../memory/sprint_mar30_apr2.md` — March 30–April 2 sprint log
- `~/.claude/projects/.../memory/fixture_format_guide.md` — canonical fixture JSON
- `~/.claude/projects/.../memory/feedback_fixture_review.md` — what to fix vs leave alone in a candidate fixture

Verify these against current code before relying on them — they're point-in-time snapshots.
