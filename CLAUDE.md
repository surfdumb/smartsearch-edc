# CLAUDE.md — SmartSearch EDC v2.0

## What Changed and Why

On March 3, 2026, the full SmartSearch team (Phil, Ayrton, Jackie, Blair, Kalum, Tara, Carlie) reviewed the live PBV pilot at edc.smartsearchexec.com. The verdict: **aesthetics validated, information architecture rejected.** The EDC had become a scrollable multi-page document — the opposite of its 90-second-scan mission.

Phil's diagnosis: "We've made a six-page document." Ayrton: "Feels harder to digest than current spiels."

**This v2.0 spec is a structural redesign.** The core codebase (Next.js 14, components, data loading) stays intact. What changes fundamentally is how sections are composed, paginated, and density-managed. Every section must fit on one screen. No scrolling within pages. "Easy for a five-year-old to read."

**The EDC's real competitor is not the 40-page PowerPoint. It's the consultant's verbal pitch on the alignment call.** Every word that doesn't help that pitch is wasted.

---

## The One Rule That Governs Everything

**Each page must fit a 13-inch laptop screen without scrolling.**

This means: ~720px usable viewport height (minus browser chrome and navigation bar). Every section, every layout decision, every text density choice flows from this constraint. If it doesn't fit, cut words — not sections.

---

## Tech Stack (unchanged)

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom design tokens (defined below)
- **Font:** Inter (Google Fonts) — weights 400, 500, 600, 700, 800
- **Data:** JSON fixtures in `/data/decks/[searchId].json` → Google Sheets API or Supabase later
- **Deployment:** Vercel
- **PDF Export (future):** Puppeteer/Playwright server-side screenshot

---

## v2.0 Build Sequence

This is a refactor, not a rebuild. Existing components are modified in-place. Build in this order. Commit after each step.

### Step 1 — 3-Page Navigation Shell

**The most critical structural change.** Replace the current single-scroll EDC card with a paginated 3-page layout.

**Pages:**
- **Page 1: Scope** — Scope Match table + optional narrative
- **Page 2: Key Criteria** — Bullet-format evidence for each criterion
- **Page 3: Compensation & Interest** — Comp breakdown + Why Interested + optional Miscellaneous

**Navigation:**
- Page indicator dots or numbered tabs (1 · 2 · 3) centered below nav bar
- Arrow buttons: ← Prev Page / Next Page → at left/right edges
- Keyboard: ← → to navigate pages (distinct from candidate prev/next)
- Snap transitions — no scroll, no parallax, instant page swap with subtle crossfade (150ms)
- Current page indicator: gold underline or filled dot

**Layout per page:**
```
┌─────────────────────────────────────────────────────┐
│  ← Back to Deck    Director of C&B    CV Split  1/5 │  ← DeckNavBar (unchanged)
│                                        Next →        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ EDC Header ──────────────────────────────────┐  │
│  │  SmartSearch logo    Executive Decision Card   │  │
│  │  Christopher Snider                            │  │
│  │  Coca-Cola Consolidated · Comp Manager · NC    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Page Content ─────────────────────────────────┐  │
│  │                                                │  │
│  │  [Section content — must fit without scroll]   │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Page Nav ─────────────────────────────────────┐  │
│  │     ← Prev    ● ○ ○    Next →                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Footer ───────────────────────────────────────┐  │
│  │  PBV — Director of C&B · March 2026  CONFID.   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**The header and footer are persistent across all 3 pages.** Only the middle content area swaps. This means the header must be compact — reduced from the current design.

**Implementation:**
- New component: `PageNavigation.tsx` — dots + arrows + keyboard handler
- Modify `EDCCard.tsx` — wrap sections in page containers, render only active page
- State: `currentPage: 1 | 2 | 3` — stored in EDCCard, passed down
- Page transition: CSS opacity crossfade, 150ms, no layout shift

### Step 2 — Header Condensation

**Remove:** Search Lead from meta row.

**Keep:** SmartSearch logo (left), "Executive Decision Card" (right), candidate name (large), flash line (title · company · location).

**Reduce:** The header currently takes ~180px of vertical space. Target: ~120px max. Tighten padding, reduce name font size slightly (2.5rem → 2rem), compress meta row.

**Context-aware rendering (unchanged):** When `context === 'deck'`, hide role name and consultant name from meta row (client already sees these in deck hero).

### Step 3 — Scope Rename + Toggleable Narrative

**Terminology change throughout entire codebase:**
- "Dimension" → "Scope" (data field names, column headers, component props)
- Column headers: `SCOPE` | `CANDIDATE` | `ROLE REQUIREMENT`
- Section label: `SCOPE MATCH` (unchanged)

**Data contract change:**
```typescript
// OLD
scope_match: { dimension: string; ... }[]
// NEW  
scope_match: { scope: string; ... }[]
```

**Update `pbv-dcb.json`** and all fixture files to use `scope` instead of `dimension`.

**Narrative toggle:**
- The scope seasoning paragraph is now **toggleable, default OFF**
- New deck_settings field: `scope_narrative_display: 'SHOW' | 'HIDE'` — default: `'HIDE'`
- When hidden, the table gets more vertical space (good for 5+ dimensions)
- When shown, text is capped at 2 sentences max

**Editable dimension names:** In edit mode, each scope name is contenteditable. Consultants can rename "Industry Context" to "Sector Fit" etc.

**Removable rows:** In edit mode, each scope row has a subtle × button (right edge) to remove it entirely. Jackie needs this — e.g., "Industry Context" was irrelevant for PBV since no candidate had bottling experience.

**Text density in table cells:** Maximum 2 lines per cell. Current cells sometimes run to 3-4 lines. Enforce via CSS line-clamp or by writing pithier content.

### Step 4 — Key Criteria: Bullets Not Paragraphs

**This is the biggest text density reduction.** Current key criteria sections have 4-6 line paragraphs per criterion. Phil: "People don't like paragraphs."

**New format per criterion:**

```
┌─ ① ───────────────────────────────────────────────┐
│  Compensation Structure Builder                     │
│  • Built Ashley Furniture's first comp department   │
│    from scratch for 10,000 employees               │
│                                     at Ashley Furniture │
└─────────────────────────────────────────────────────┘
```

**Rules:**
- One bullet per criterion, 1-2 lines maximum
- Bold the key achievement phrase (as now)
- Context anchor pill inline at the end of the bullet, right-aligned or on same line
- No paragraph text — the bullet IS the evidence
- If the AI generates a paragraph, the prompt must be updated to produce a single sentence

**With 5 criteria at ~50px each = ~250px content, this fits comfortably on Page 2 within the 720px budget (header ~120px + page nav ~40px + footer ~40px = 270px overhead → ~450px for criteria = plenty).**

**Context anchor pills:** Keep current blue/neutral style. Move from stacked-below to inline-end position:

```
• Evidence text in a single punchy line          at Company Name
```

This is denser and more scannable. The pill sits right-aligned on the same row as the bullet text.

**Scroll indicator:** When Key Criteria content extends beyond the visible card area, display a subtle scroll indicator on the right side of the card — a thin scrollbar or downward arrow that signals more content below. Do NOT use accordion/collapse pattern (Phil: "too many things to click on for the client"). Content should be a single scrollable container with a visual cue that it continues.

### Step 5 — Potential Concerns → REMOVED / Miscellaneous Toggle

**Potential Concerns section is fully removed from the default EDC.**

**Replaced by:** A toggleable "Miscellaneous" section at the bottom of Page 3.
- Default: hidden
- In edit mode: consultant can expand and manually type notes
- This is NOT AI-generated — consultants handle limitation management manually
- Phil: "Potential concerns so few and far between, and when we do, it's very sensitive"

**Data contract change:**
```typescript
// OLD
potential_concerns: { concern: string; severity: 'development' | 'significant' }[]

// NEW — keep in type for backward compatibility, but never render by default
potential_concerns?: { concern: string; severity: string }[]

// NEW
miscellaneous?: {
  text: string;       // consultant-written, not AI
  display: 'SHOW' | 'HIDE';  // default: HIDE
}
```

**AI prompt update required:** Stop generating `potential_concerns`. Prompt must emphasize positives only. Any negative signal the consultant wants to share is handled manually via Miscellaneous.

### Step 6 — Motivation

**Motivation** — Displayed as: bold "Motivation —" prefix followed by the motivation hook text (e.g., "Motivation — Final transformation challenge before retirement"). Single static line, not a carousel. Consultant can edit the text in edit mode. The motivation hook is generated from the candidate's motivation analysis but displays as a clean, standardised label. No cycling/scrambling UI. No italic gold text — use regular weight with sufficient contrast on the background.

### Step 7 — Compensation: Three-Layer Architecture

**Ayrton: "If there is only one thing that a client wants to see that is not on their CV, it's how much they cost."**

**Three-layer architecture:**
- **Layer 1: Headline Table** — Quick scan. Columns: Component | Target Range | Current | Expected | Total Package. Components: Base, Bonus, LTI/Equity, Benefits. The "Target Range" column (formerly "Client Budget") shows the employer's parameters. Total package row emphasized (larger/bolder font).
- **Layer 2: Full Package Detail** — Collapsible panel (collapsed by default). Contains bonus structure with targets/actuals, vesting timelines with dates/amounts, detailed benefit breakdowns. Only shown for complex compensation packages.
- **Layer 3: Deal-Sensitive Notes** — Amber-highlighted flags for negotiation-critical items (e.g., "If joining before Dec 2026, expects reimbursement for unvested equity"). Separate from factual data to avoid contaminating the record.
- Font consistency: standardise sizes across all comp elements. Emphasize total package figures only.
- "Why Are They Interested?" section REMOVED from comp tab — motivation lives in the motivation hook on the scope page.
- Notice period remains near compensation (not in a separate section).

### Step 8 — Why Are They Interested (on Page 3)

**Keep current push/pull format but compress:**
- Headline only — remove detail paragraphs
- Format: `↗ Pull: Ground-up rebuild opportunity` / `↙ Push: Limited ceiling at current employer`
- 3 items max, one line each
- This section shares Page 3 with Compensation

**Visual:**
```
┌─ WHY ARE THEY INTERESTED? ────────────────────────┐
│                                                     │
│  ↗  Ground-up rebuild opportunity                   │
│  ↗  Team leadership growth                          │
│  ↙  Limited ceiling at current employer              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Step 9 — No Red in Client-Facing Outputs

**Absolute rule: no red anywhere the client can see.**

- Scope Match dots: keep green (strong) and amber/gold (partial). **Red "gap" dots become amber/gold.** All non-strong alignments use the same amber treatment.
- Intro card badges: green and yellow only. No red badges.
- "Comp gap" → "comp concern" — yellow, not red
- Phil: "Red scares people."

**In code:** Remove all references to `--ss-red` in client-facing rendering paths. Red remains available in consultant/internal views only.

**Alignment mapping change:**
```typescript
// OLD rendering logic
'strong' → green dot
'partial' → amber dot  
'gap' → red dot

// NEW rendering logic (client-facing)
'strong' → green dot
'partial' → amber/gold dot
'gap' → amber/gold dot  // same as partial in client view
```

Add a `context` check: if rendering in client view, both `partial` and `gap` render as amber. In consultant view, keep the three-way distinction if desired (optional — team may decide to remove red entirely).

### Step 10 — Remove Password Gate

**Remove the access code / password screen entirely.** Phil: "Looking at username and password screen makes you want to kill myself."

- Direct URL access, no authentication barrier
- Obscurity-only security for now (long, unguessable URLs)
- Magic link authentication is a fast-follow, not a launch dependency

### Step 11 — "What to Expect" Intro Screen

**Add a brief onboarding page that renders before the deck.**

- Shows once per session (or per search visit)
- Explains what the EDC contains and what's on each page
- Inspired by the aesthetics of the access code screen (which Phil liked visually, just not the friction)
- "Continue →" button to enter the deck
- Can be skipped / dismissed permanently

**Content:**
```
Welcome to your Executive Decision Cards

Each candidate is presented across three pages:

1. Scope Match — How their experience maps to your requirements
2. Key Criteria — Evidence against your priority criteria  
3. Compensation & Interest — Package details and motivation

Click any candidate to begin.

[Enter Deck →]
```

### Step 12 — Index View Redesign (Compare All)

**Current comparison view is too detailed. Redesign as a stripped-back "Index."**

**Show ONLY:**
- Candidate name (clickable → full EDC)
- First criterion match (one-line summary from Key Criteria #1)
- Location
- Compensation (toggleable column)
- Notice period (toggleable column)

**Remove:**
- Current role column
- All other criteria rows
- Career trajectory
- Industry shorthand

**Compensation should be near the top of the view** — Kalum/Blair use this as a decision-support tool at call close.

**Blair: location is critical** — clients need to see relocation implications at a glance.

### Step 13 — CV Split View: CV Dominates

**Current layout: CV panel too small, hard to read.**

**New proportions:**
- CV panel: 55-60% of width (MAJORITY of the screen)
- EDC panel: 40-45% of width
- Phil: "the CV at the end of the day is more important than the EDC for most clients"

**Full-page CV toggle:** Button to view CV alone, filling the viewport. Return to split view or EDC-only view via back navigation.

**All candidate CVs must be loaded per deck** (e.g., 4 Fertiberia candidates).

**PDF rendering** in an iframe or embedded viewer. DOCX files should be converted to PDF before display (future enhancement — for now, accept PDF only).

### Step 14 — Job Summary Access from Portal

**Phil asked where the Job Summary lives — it needs a clear access point from the deck.**

- Add a "Job Summary" link/button in the deck hero section (alongside "Compare All")
- For v2.0: link opens the JS PDF in a new tab (URL stored in search context data)
- New data field: `job_summary_url?: string` in SearchContext

### Step 15 — Candidate Photos (Initials for Now)

**Team wants candidate photos but agreed not to add manual upload steps.**

- Keep initials avatar as default (already implemented)
- Add `photo_url?: string` to candidate data type
- If populated, render photo instead of initials
- Future: investigate LinkedIn profile photo embed (no manual process)
- Do NOT add a photo upload UI — this adds friction the team rejected

### Post-March 9 Priority Fixes (for Wednesday March 12 rehearsal)

In order of priority:
1. Landing page strip-down: remove teasers, bubbles, extra rows. Cards show only: name, photo, title+company, location, comp indicator, snippet sentence.
2. Candidate status system: New/Active/Rejected/Hold badges on cards.
3. Header: remove "Executive Decision Card" text, remove "Confidential", enlarge SmartSearch logo.
4. CV viewer: increase CV width in split view, add full-page CV toggle.
5. Motivation: bold "Motivation —" prefix, remove carousel/scrambler.
6. Key Criteria: add scroll indicator.
7. Compensation: incorporate Target Range into headline table, fix font consistency.
8. Small fixes: reset button size, instructional text contrast, P&L scope → 170M, Fertiberia logo.
9. Add small confidential disclaimer at page bottom.
10. Embed Job Summary PDF viewer (accessible from landing page).

---

## Updated Data Contract

### EDCData (v2.0)

```typescript
interface EDCData {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;               // NEW — candidate photo, falls back to initials

  // Scope Match — renamed from "dimension" to "scope"
  scope_match: {
    scope: string;                   // RENAMED from "dimension"
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap';
  }[];
  scope_seasoning?: string;          // NOW OPTIONAL — toggleable, default hidden

  // Key Criteria — evidence condensed to bullet format
  key_criteria: {
    name: string;
    evidence: string;                // NOW: single sentence/bullet, not paragraph
    context_anchor: string;
  }[];

  // Compensation — explicit Base/Bonus/LTI structure
  compensation: {
    current_base?: string;
    current_bonus?: string;
    current_lti?: string;
    current_total?: string;
    expected_base?: string;
    expected_bonus?: string;
    expected_lti?: string;
    expected_total?: string;
    flexibility?: string;            // 1-2 sentence note
    budget_range?: string;
  };
  notice_period?: string;
  // earliest_start_date REMOVED

  // Motivation — condensed to headlines only
  why_interested: {
    type: 'push' | 'pull';
    headline: string;
    // detail REMOVED from client-facing render
    detail?: string;                 // kept in data for consultant view only
  }[];

  // Potential Concerns — REMOVED from default render
  potential_concerns?: {             // kept in type for backward compat
    concern: string;
    severity: string;
  }[];

  // Miscellaneous — NEW, consultant-written, not AI
  miscellaneous?: {
    text: string;
    display: 'SHOW' | 'HIDE';
  };

  // Our Take — defaults to HIDDEN from client
  our_take: {
    text: string;
    // recommendation REMOVED
    // discussion_points REMOVED from client render
    discussion_points?: string[];    // kept for consultant view only
    original_note?: string;          // NEVER client-visible
    ai_rationale?: string;           // NEVER client-visible
  };

  // Meta
  search_name: string;
  role_title: string;
  generated_date: string;
  consultant_name: string;

  // Display toggles
  match_score_display?: 'SHOW' | 'HIDE';   // default: HIDE
  // match_score_percentage removed from render

  // Candidate Status (landing page)
  status?: 'new' | 'active' | 'rejected' | 'hold';  // Manual, not from Invenias

  // Motivation (simplified)
  motivation_hook?: string;  // Single line, e.g. "Final transformation challenge before retirement"
                             // Displayed as "Motivation — {motivation_hook}" on the EDC
                             // Editable in edit mode

  // Extensible
  cv_url?: string;
  linkedin_url?: string;
}
```

### SearchContext (v2.0)

```typescript
interface SearchContext {
  search_id: string;
  role_title: string;
  client_company: string;
  client_logo_url?: string;
  location: string;
  search_lead: string;
  key_criteria_names: string[];
  job_summary_url?: string;          // NEW — link to JS PDF
  deck_logo_url?: string;          // Client company logo for this search
  job_summary_pdf_url?: string;    // Embedded PDF viewer, not a SharePoint link
  candidates: IntroCardData[];
  deck_settings: {
    match_score_display: 'SHOW' | 'HIDE';       // default: HIDE
    our_take_display: 'SHOW' | 'HIDE';           // default: HIDE (changed from SHOW)
    scope_narrative_display: 'SHOW' | 'HIDE';    // NEW — default: HIDE
    edit_mode: boolean;
  };
}
```

### IntroCardData (v2.0)

```typescript
interface IntroCardData {
  candidate_id: string;
  initials: string;
  name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;                // NEW
  summary_html: string;
  href: string;

  compensation_alignment: 'green' | 'amber' | 'not_set';
                                     // RED REMOVED — only green/amber in client view
  career_trajectory?: string;
  industry_shorthand?: string;
  // notice_period REMOVED from intro card (stays in comp section)

  edc_data: EDCData;
}
```

---

## Design Tokens

### Colors (v2.0 changes marked)

```css
/* === Core === */
--ss-dark:          #1a1a1a
--ss-dark-soft:     #2c2c2c
--ss-header-bg:     #2d2824

/* === Gold System === */
--ss-gold:          #c5a572
--ss-gold-light:    #d4ba8a
--ss-gold-pale:     #e8dbc7
--ss-gold-glow:     rgba(197, 165, 114, 0.15)
--ss-gold-deep:     #b08f5a

/* === Backgrounds === */
--ss-cream:         #faf8f5
--ss-warm-white:    #f7f4ef
--ss-warm-tint:     #fdfbf7
--ss-page-bg:       #f0ede8

/* === Text === */
--ss-gray:          #6b6b6b
--ss-gray-light:    #a0a0a0
--ss-gray-pale:     #d4d2ce

/* === Semantic === */
--ss-green:         #4a7c59          /* Strong alignment */
--ss-green-soft:    #5a9469
--ss-green-light:   rgba(74, 124, 89, 0.10)
--ss-green-badge:   rgba(74, 124, 89, 0.08)

--ss-yellow:        #c9953a          /* Partial + gap alignment (client view) */
--ss-yellow-light:  rgba(201, 149, 58, 0.10)

--ss-red:           #b85450          /* CONSULTANT VIEW ONLY — never client-facing */
--ss-red-light:     rgba(184, 84, 80, 0.08)

/* === Context Anchor === */
--ss-blue:          #4a6a8c
--ss-blue-light:    rgba(74, 106, 140, 0.10)

/* === Borders === */
--ss-border:        #f0ede8
--ss-border-light:  #f7f5f1
```

**Color usage rule update:** Red is NEVER used in client-facing rendering. In client view, `gap` alignment renders with `--ss-yellow` (same as `partial`). Red is reserved for consultant-only internal views.

### Typography (v2.0 — tighter)

```
Candidate Name:       Inter 700, 2.0rem (32px), letter-spacing: -0.5px   /* was 2.5rem */
Section Labels:       Inter 600, 0.65rem (~10px), uppercase, letter-spacing: 2.5px
Criteria Headings:    Inter 600, 0.88rem (~14px)                          /* was 0.92rem */
Body/Evidence Text:   Inter 400, 0.82rem (~13px), line-height: 1.55      /* was 0.87rem, 1.65 */
Meta Labels:          Inter 600, 0.65rem (~10px), uppercase
Meta Values:          Inter 400, 0.88rem (~14px)
Context Anchor Pills: Inter 600, 0.65rem (~10px), padding: 3px 9px       /* tighter */
Footer Text:          Inter 400, 0.7rem (~11px)
```

### Spacing (v2.0 — compressed)

```
Card max-width:       820px           /* unchanged */
Card border-radius:   16px            /* was 20px — slightly tighter */
Header padding:       24px 40px 20px  /* was 36px 48px 32px */
Section padding:      20px 40px       /* was 32px 48px */
Criteria item gap:    12px            /* was 18px */
Page background:      #f0ede8, padding: 24px 20px 40px
```

---

## Page Content Budgets

With the 13-inch screen constraint (~720px viewport), here's the pixel budget per page:

| Element | Height |
|---------|--------|
| DeckNavBar | ~48px |
| EDC Header (condensed) | ~110px |
| Page Navigation (dots + arrows) | ~36px |
| Footer | ~32px |
| **Overhead total** | **~226px** |
| **Available for content** | **~494px** |

### Page 1: Scope Match
- Section label: ~24px
- Scope table (5 rows × ~48px): ~240px
- Optional narrative (if shown): ~60px
- **Total: ~324px** ✅ fits with room

### Page 2: Key Criteria
- Section label: ~24px
- 5 criteria (bullet + pill × ~56px): ~280px
- **Total: ~304px** ✅ fits with room

### Page 3: Compensation & Interest
- Comp section label + 4 rows: ~160px
- Why Interested label + 3 items: ~120px
- Miscellaneous (if shown): ~80px
- **Total: ~360px** ✅ fits, tight but workable

---

## Component Changes — File by File

### `EDCCard.tsx` — Major refactor

**Current:** Renders all sections in a single scrollable column.

**New:** Renders sections inside a page container. Only the active page's content is visible.

```tsx
// Pseudocode structure
function EDCCard({ data, context, deckSettings }) {
  const [currentPage, setCurrentPage] = useState(1);
  
  return (
    <div className="edc-card">
      <EDCHeader data={data} context={context} />
      
      {currentPage === 1 && (
        <ScopeMatch 
          scopes={data.scope_match} 
          seasoning={data.scope_seasoning}
          showNarrative={deckSettings?.scope_narrative_display === 'SHOW'}
        />
      )}
      
      {currentPage === 2 && (
        <KeyCriteria criteria={data.key_criteria} />
      )}
      
      {currentPage === 3 && (
        <div>
          <Compensation data={data.compensation} noticePeriod={data.notice_period} />
          <WhyInterested items={data.why_interested} />
          {deckSettings?.our_take_display === 'SHOW' && data.our_take?.text && (
            <OurTake text={data.our_take.text} />
          )}
          {data.miscellaneous?.display === 'SHOW' && (
            <Miscellaneous text={data.miscellaneous.text} />
          )}
        </div>
      )}
      
      <PageNavigation 
        current={currentPage} 
        total={3} 
        onChange={setCurrentPage} 
      />
      <EDCFooter data={data} />
    </div>
  );
}
```

### `EDCHeader.tsx` — Condensed

- Remove `consultant_name` display (Search Lead removed from role overview)
- Reduce candidate name from 2.5rem to 2.0rem
- Tighten all padding (24px 40px 20px)
- Keep: logo, "Executive Decision Card" badge, name, flash line (title · company · location)
- Meta row: Role name only (when context is 'standalone')

### `ScopeMatch.tsx` — Rename + Toggle + Edit

- Rename all `dimension` references to `scope`
- Column headers: `SCOPE` | `CANDIDATE` | `ROLE REQUIREMENT`
- Alignment dots: green for strong, amber/gold for partial AND gap (no red)
- Scope seasoning: render only when `showNarrative` is true
- Edit mode: scope names are contenteditable, rows have × remove button
- Max 2 lines per cell (CSS line-clamp-2)

### `KeyCriteria.tsx` — Bullet Format

**Rewrite this component.** Current: numbered items with multi-line evidence paragraphs + stacked pill below.

**New:** Numbered items with single-line bullet evidence + inline pill.

```tsx
function KeyCriteria({ criteria }) {
  return (
    <section>
      <SectionLabel text="KEY CRITERIA" />
      <div className="space-y-3">
        {criteria.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="criteria-number">{i + 1}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{item.name}</h4>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <p className="text-sm text-gray line-clamp-2"
                   dangerouslySetInnerHTML={{ __html: item.evidence }} />
                <span className="context-pill shrink-0">{item.context_anchor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

### `Compensation.tsx` — Simplified Key-Value

**Rewrite.** Remove the 3-column card grid. Replace with clean key-value rows.

```tsx
function Compensation({ data, noticePeriod }) {
  return (
    <section>
      <SectionLabel text="COMPENSATION & TIMELINE" />
      <div className="comp-rows">
        <CompRow label="CURRENT PACKAGE" value={data.current_base || data.current_total || 'Not available'} />
        <CompRow label="EXPECTATION" value={data.expected_base || data.expected_total || 'Not available'} />
        <CompRow label="CLIENT BUDGET" value={data.budget_range || 'Not available'} />
        {noticePeriod && noticePeriod !== 'Not mentioned' && (
          <CompRow label="NOTICE PERIOD" value={noticePeriod} />
        )}
      </div>
      {data.flexibility && (
        <p className="comp-note">{data.flexibility}</p>
      )}
    </section>
  );
}
```

### `Motivation.tsx` → `WhyInterested.tsx` — Headlines Only

**Rename component.** Render headlines only, no detail paragraphs.

```tsx
function WhyInterested({ items }) {
  return (
    <section>
      <SectionLabel text="WHY ARE THEY INTERESTED?" />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>{item.type === 'pull' ? '↗' : '↙'}</span>
            <span>{item.headline}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

### `Concerns.tsx` — DELETE

Remove this component entirely. Replace with a minimal `Miscellaneous.tsx`:

```tsx
function Miscellaneous({ text }) {
  return (
    <section className="border-t pt-3 mt-3">
      <SectionLabel text="ADDITIONAL NOTES" />
      <p className="text-sm text-gray-500 italic">{text}</p>
    </section>
  );
}
```

### `OurTake.tsx` — Radical Simplification

**Current: 888 lines.** Target: ~60 lines for client-facing render.

Strip out:
- BADGE_STYLES, recommendation rendering
- Discussion Points section
- OurTakeSourcePanel import and toggle
- Progress messages and generation UI
- localStorage hide/show logic
- Complex state management

**What remains for client view:**

```tsx
function OurTake({ text }: { text: string }) {
  if (!text) return null;
  
  return (
    <section className="our-take-section">
      <SectionLabel text="OUR TAKE" icon="✦" />
      <div className="our-take-box">
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </section>
  );
}
```

The generation UI, source panel, and discussion points should move to a separate `OurTakeConsultant.tsx` component that only renders in consultant edit mode. This is a future concern — for this refactor, simplify the client-facing component.

### NEW: `PageNavigation.tsx`

```tsx
function PageNavigation({ current, total, onChange }) {
  return (
    <div className="page-nav">
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}>
        ←
      </button>
      <div className="dots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={`dot ${i + 1 === current ? 'active' : ''}`}
            onClick={() => onChange(i + 1)}
          />
        ))}
      </div>
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}>
        →
      </button>
    </div>
  );
}
```

Keyboard: ← → for page navigation. When viewing from deck context, need to distinguish from candidate prev/next — use `Alt + ←/→` for pages, plain `←/→` for candidates (or vice versa — test and decide).

### NEW: `WhatToExpect.tsx`

Simple intro screen component. Renders once per session before the deck.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/edc/PageNavigation.tsx` | Page dots + arrows + keyboard nav |
| `src/components/edc/WhyInterested.tsx` | Headlines-only motivation (replaces Motivation.tsx) |
| `src/components/edc/Miscellaneous.tsx` | Toggleable consultant notes (replaces Concerns.tsx) |
| `src/components/deck/WhatToExpect.tsx` | Intro/onboarding screen |

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/edc/Concerns.tsx` | Section removed per team decision |
| `src/components/edc/Motivation.tsx` | Replaced by WhyInterested.tsx |
| `src/components/edc/OurTakeSourcePanel.tsx` | Consultant-only, not for client render |

## Files to Heavily Modify

| File | Change |
|------|--------|
| `src/components/edc/EDCCard.tsx` | 3-page pagination, section routing |
| `src/components/edc/EDCHeader.tsx` | Condensed, remove Search Lead |
| `src/components/edc/ScopeMatch.tsx` | Rename dimension→scope, toggleable narrative, editable rows |
| `src/components/edc/KeyCriteria.tsx` | Bullet format, inline pills |
| `src/components/edc/Compensation.tsx` | Key-value rows, remove 3-col grid |
| `src/components/edc/OurTake.tsx` | Radical simplification (~888 → ~60 lines) |
| `src/lib/types.ts` | All data contract changes above |
| `data/decks/pbv-dcb.json` | Rename dimension→scope, update all candidates |

---

## Layout Architecture (v2.0)

### Full-width dark header
- SmartSearch logo (left, enlarged) — NO "Executive Decision™ Card" text
- Candidate name (large, warm white #f5f0ea)
- Flash line: title · company · location (separated by gold middots)
- Meta row: Role, Search Lead, Generated date
- **No Interview Date** — removed to support drip-feeding
- **No "Confidential" stamp** — removed from header. Small-print confidential disclaimer at page bottom instead.
- **No "Executive Decision Card" label** — removed. The SmartSearch logo is sufficient branding.

### Content pages (white card, rounded corners)
Page 1: **Scope Match** — Table with alignment dots (green/amber only) + optional narrative
Page 2: **Key Criteria** — Bullet-format evidence with inline context anchors
Page 3: **Compensation & Interest** — Key-value comp rows + headline-only motivation + optional Our Take + optional Miscellaneous

### Page navigation
Centered dots (● ○ ○) + arrow buttons. Fixed position relative to card.

### Footer (persistent)
Search name · Role title · Generated date — left. Small-print confidential disclaimer — right. SmartSearch branding.

---

## Landing Page (Deck View)

The landing page is the deck-level view showing all candidates for a search. It doubles as the index — there is NO separate comparison view.

### Design Principles
- All candidates must fit on one page without scrolling (on a 13" MacBook Air at 100% zoom)
- The landing page IS the index. Clients return here after reviewing individual EDCs.
- Cards are the entry point — click any card to open the full EDC.

### Card Contents (per candidate)
Each intro card shows ONLY:
- Candidate name
- Headshot photo
- Current title + company (company name in distinct styling — white, own font weight)
- Location
- Comp alignment indicator (green/amber/red dot — aligns to Target Range)
- One snippet sentence (the opening line from the EDC, ~25 words max)
- Status badge (top-right corner): `New` | `Active` | `Rejected` | `Hold`

### What Was Removed from Intro Cards
- Motivation tagline / hook (lives inside the EDC, not on the card)
- Key criteria bubbles / pills
- Notice period
- Teaser rows / expandable preview content
- "Click any candidate" instructional text (if kept, must be large and high-contrast)

### Candidate Status System
Statuses: `'new' | 'active' | 'rejected' | 'hold'`
- Manual update only — NOT pulled from Invenias
- Visible in client view (always shown)
- Editable only when edit mode is ON
- First presentation: no statuses shown (all candidates are implicitly new)
- Post-alignment call: consultant updates statuses
- Rejected candidates: shown with faded styling, "Rejected" label visible
- All candidates ever submitted remain in the deck (historical record)

### Logo
- Use the client company logo (e.g., Fertiberia), not the parent PE firm (e.g., Triton)
- Logo choice is per-search, configured in deck settings

### Navigation
- Clicking a card opens the full EDC for that candidate
- After viewing an EDC, user returns to this landing page
- Job Summary: accessible via a tap/button on the landing page — opens embedded PDF viewer (not a SharePoint link)

---

## Quality Rules (v2.0 — updated)

1. **Never infer.** Display only what's in the data. "Not available" for missing fields — never blank, never implied.
2. **Consultant voice.** "We believe" not "The candidate presents."
3. **No emojis.** Color-coding in Scope Match only (green/amber). No emoticons anywhere.
4. **No red in client view.** Zero red elements. Amber/gold is the maximum warning signal. Red is consultant-only.
5. **Key Criteria names are sacred.** From the Job Summary. Never rename, reorder, or reinterpret.
6. **Evidence vs judgment.** Key Criteria are factual evidence. Our Take (when shown) is the ONLY judgment. This separation is the core product principle.
7. **No scoring on criteria.** No numeric scores, no Strong/Moderate/Weak labels. The bullet IS the assessment.
8. **Context anchors are factual.** Company name, not evaluation.
9. **AI generates positives only.** No negative signals in AI-generated content. Consultants handle concerns manually.
10. **One screen per page.** Nothing scrolls within a page. If content doesn't fit, cut words.
11. **Pithy over comprehensive.** Phil's word. Every sentence earns its place. If it doesn't help the verbal pitch, remove it.
12. **Reset button visibility.** The "Reset to AI-generated text" button must be visible enough for consultants to find but unobtrusive. Larger than current implementation. Only visible in edit mode — never in client view.
13. **Font contrast.** Gold italic text on dark backgrounds has been flagged repeatedly as hard to read. Avoid italic Cormorant Garamond in gold on charcoal. Use regular weight and/or higher-contrast color combinations. All body text in sans-serif.
14. **Instructional text.** Any "click any candidate..." helper text must use large enough font size and sufficient contrast to be readable. Currently too faint on both dark and light themes.

---

## Deck View Updates

### Intro Cards — No Red Badges

Compensation alignment badges on intro cards use green and yellow only. Remove `'red'` from the `compensation_alignment` type. Any candidate previously tagged `'red'` renders as `'amber'`.

### Hero Section — Add Job Summary Link

Add "View Job Summary" button alongside "Compare All →" in the deck hero. Links to `job_summary_url` if available (opens in new tab). If not available, button doesn't render.

### Compare All → Index

Stripped back to essentials. See Step 12 above.

---

## Future Integration Points (Don't Build Yet, But Architect For)

1. **Google Sheets API** — Replace JSON fixtures with live EDS Text Store data
2. **Our Take regeneration** — "Generate Again" button calls Claude API with manual notes
3. **v1.1 context anchors** — Expand pills from "at Norican" to "VP Aftermarket, Norican · 2021–24"
4. ~~**Comparison View**~~ — **REMOVED (March 9 decision).** Landing page with status-tagged cards serves as the index. No separate compare route.
5. **Job Summary Embedding** — Embed Job Summary PDF within the portal as a clickable viewer. Near-term requirement (not future).
6. **PDF Export (deferred)** — Individual candidate export. Deferred until clients request it. Comp sensitivity concern raised by team.
7. **Match score toggle** — If reintroduced, allow show/hide via UI control

---

## Fixture Data Migration

Update `data/decks/pbv-dcb.json`:

1. Rename all `dimension` fields to `scope` in every candidate's scope_match array
2. Set `our_take_display: 'HIDE'` in deck_settings (changed from 'SHOW')
3. Add `scope_narrative_display: 'HIDE'` to deck_settings
4. Remove `'red'` from any `compensation_alignment` values (change to `'amber'`)
5. Remove `earliest_start_date` from all candidates
6. Condense `key_criteria[].evidence` to single sentences (current paragraphs are 3-5 lines)
7. Remove `detail` from `why_interested` items (keep for data but don't render)

---

## Git Discipline (v2.0)

```
git add . && git commit -m "feat: 3-page navigation shell with page dots and keyboard nav"
git add . && git commit -m "refactor: EDCHeader condensed, remove Search Lead"
git add . && git commit -m "refactor: ScopeMatch — dimension→scope rename, toggleable narrative"
git add . && git commit -m "refactor: KeyCriteria — bullet format, inline context pills"
git add . && git commit -m "refactor: Compensation — key-value rows replacing 3-col grid"
git add . && git commit -m "feat: WhyInterested — headline-only motivation replacing Motivation"
git add . && git commit -m "remove: Concerns section, add Miscellaneous toggle"
git add . && git commit -m "refactor: OurTake — 888→60 lines, strip badges and generation UI"
git add . && git commit -m "fix: no red in client view — gap dots render as amber"
git add . && git commit -m "feat: WhatToExpect intro screen"
git add . && git commit -m "refactor: Index view — stripped to name, location, first criterion"
git add . && git commit -m "chore: fixture data migration — scope rename, evidence condensation"
git add . && git commit -m "feat: remove password gate, direct URL access"
git add . && git commit -m "feat: Job Summary link in deck hero"
```

---

## Decisions That Changed from v1.0

| What | v1.0 (Feb) | v2.0 (March) | Why |
|------|-----------|-------------|-----|
| Layout | Single scrollable card | 3-page paginated | "We've made a six-page document" — Phil |
| Potential Concerns | Amber-tinted warning section | REMOVED (toggleable Miscellaneous) | "So few and far between, and very sensitive" — Phil |
| Our Take display | Default SHOW, toggleable | Default HIDE, toggleable | Consultant prep tool, not client-facing default |
| Red in client view | Gap dots = red | No red anywhere | "Red scares people" — Phil |
| Key Criteria format | Multi-line paragraphs | Single-line bullets | "People don't like paragraphs" — Phil |
| Scope narrative | Always shown | Toggleable, default hidden | Not every search needs it |
| Dimension → Scope | "Dimension" column header | "Scope" column header | Clarity for global clients |
| Comp layout | 3-column card grid | Key-value rows | Height reduction + clarity |
| Search Lead | In header meta row | Removed | Unnecessary clutter |
| Earliest Start Date | In comp section | Removed | Not relevant for most US searches |
| Motivation detail | Headline + paragraph | Headline only | Density reduction |
| Compare All | Full comparison table | Stripped "Index" view | Decision tool, not detail engine |
| CV Split | 50/50 panels | 60/40, CV dominant | CV must be readable |
| Password gate | Access code screen | Removed | "Makes you want to kill myself" — Phil |
| Intro card red badges | Green/amber/red | Green/amber only | No red in client view |

---

## Change Log

| Date | Change | Source |
|------|--------|--------|
| Feb 12 | Initial CLAUDE.md — Build Steps 1-10, design tokens, data contract | EDC design session |
| Feb 17 | Context anchor pills, removal of sentiment labels, Key Criteria spec | Team feedback synthesis |
| Feb 20 | Build Steps 11-14, deck view, card flip, CV split, comparison view | EDC Weekly — locked decisions |
| Feb 20 | Context-aware EDCCard header, pill layout locked, Our Take toggle | Team decisions |
| Feb 24 | IntroCardData fields, production trigger | Pre-live call decisions |
| **Mar 3** | **v2.0 — 3-page pagination, text density reduction, no red, Concerns removed, Our Take hidden by default, scope rename, comp simplification, index redesign, password gate removed** | **Full team review of live PBV pilot** |
| **Mar 9** | **Landing page redesign (cards = index, no compare view), candidate status system, header cleanup (remove EDC label + Confidential), motivation hook (static line, no carousel), comp three-layer architecture (Target Range column), CV split 55-60% CV dominant + full-page toggle, Key Criteria scroll indicator, quality rules (reset button, font contrast, instructional text), Future Integration Points, Job Summary PDF embedding** | **March 9 working session** |
