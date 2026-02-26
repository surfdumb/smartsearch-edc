# SmartSearch EDC — Codebase Context for claude.ai

Paste this file into claude.ai to give Claude full context about this codebase.

---

## What This Is

A Next.js 14 web app that renders **Executive Decision Cards (EDCs)** — one-page scannable candidate summaries for executive search clients. SmartSearch is a boutique executive search firm. Consultants interview C-suite candidates and present structured intelligence to clients.

**Core principle: "Show evidence. Let humans judge."** No scoring, no ranking, no traffic lights on criteria. The evidence paragraph IS the assessment.

**This is a premium B2B product** — clients pay £100k+ per placement.

---

## Tech Stack

- **Framework:** Next.js 14, App Router
- **Styling:** Tailwind CSS + CSS custom properties (design tokens in `globals.css`)
- **Fonts:** Inter (body), Cormorant Garamond (display/serif), Sorts Mill Goudy (EDC badge)
- **Data:** JSON fixtures at `/data/test_fixtures.json` (3 candidates for STADA pharma search)
- **AI:** Anthropic Claude API (EDS→EDC transform, Our Take generation)
- **Routes:** Portal-shaped — `/search/[searchId]/edc/[candidateId]`, `/deck/[searchId]`, `/transform`

---

## Project Structure

```
src/
├── app/
│   ├── globals.css              ← CSS custom properties (design tokens)
│   ├── layout.tsx               ← Font loading (Inter + Cormorant + Sorts Mill Goudy)
│   ├── page.tsx                 ← Home
│   ├── search/[searchId]/edc/[candidateId]/
│   │   ├── page.tsx             ← Server component, loads data
│   │   └── EDCClient.tsx        ← Client wrapper for EDCCard
│   ├── deck/[searchId]/
│   │   ├── page.tsx             ← Deck overview (candidate grid)
│   │   └── DeckClient.tsx
│   └── transform/
│       └── page.tsx             ← EDS→EDC transformer UI (dark theme)
│   app/api/
│   ├── transform/route.ts       ← POST: raw EDS text → EDCData JSON
│   └── generate-our-take/route.ts ← POST: candidateContext + notes → Our Take
├── components/
│   ├── edc/
│   │   ├── EDCCard.tsx          ← Main card assembler — renders all sections
│   │   ├── EDCHeader.tsx        ← Dark header, warm charcoal bg, gold accents
│   │   ├── ScopeMatch.tsx       ← Table with alignment dots + seasoning callout
│   │   ├── KeyCriteria.tsx      ← Numbered list + context anchor pills
│   │   ├── Compensation.tsx     ← 3-column card grid + notice/start
│   │   ├── Motivation.tsx       ← Pull/push factors with directional icons
│   │   ├── Concerns.tsx         ← Warning cards with severity (development/significant)
│   │   ├── OurTake.tsx          ← Green-bordered judgment box + Generate button + private notes
│   │   ├── EDCFooter.tsx        ← Footer bar
│   │   └── EditableField.tsx    ← contentEditable wrapper (gold focus ring)
│   ├── ui/
│   │   ├── SectionLabel.tsx     ← Uppercase label + decorative line
│   │   ├── ContextAnchorPill.tsx ← Blue/neutral pill (always same color)
│   │   └── AlignmentDot.tsx     ← Green/amber/red dot (Scope Match only)
│   ├── deck/                    ← CandidateGrid, IntroCard, SearchContextHeader
│   ├── split/                   ← SplitViewContainer, CVPanel, SplitToggle
│   └── transform/               ← EDSInput (paste/upload tabs), TransformButton
├── lib/
│   ├── types.ts                 ← EDCData interface + buildCandidateContext() + IntroCardData
│   ├── data.ts                  ← getCandidateData(), getSearchCandidates(), getDeckData()
│   ├── auth.ts                  ← Stub: returns { authenticated: true, role: 'consultant' }
│   ├── transform.ts             ← transformEDStoEDC() — calls Claude API
│   ├── transform-prompt.ts      ← System prompt for EDS→EDC extraction
│   └── generate-our-take-prompt.ts ← System prompt for Our Take generation
data/
└── test_fixtures.json           ← 3 candidates: rama-kataria, peter-borden, julien-genovino
```

---

## Design Tokens (CSS Custom Properties)

All defined in `src/app/globals.css` and mirrored in `tailwind.config.ts`:

```css
--ss-dark: #1a1a1a;
--ss-dark-soft: #2c2c2c;
--ss-header-bg: #2d2824;        /* Warm brown-charcoal, NOT pure black */

--ss-gold: #c5a572;             /* Primary accent */
--ss-gold-light: #d4ba8a;
--ss-gold-pale: #e8dbc7;
--ss-gold-glow: rgba(197, 165, 114, 0.15);
--ss-gold-deep: #b08f5a;

--ss-cream: #faf8f5;
--ss-warm-white: #f7f4ef;
--ss-warm-tint: #fdfbf7;
--ss-page-bg: #f0ede8;          /* Page bg — warm stone */

--ss-gray: #6b6b6b;
--ss-gray-light: #a0a0a0;
--ss-gray-pale: #d4d2ce;

/* Semantic — Scope Match ONLY (plus Concerns amber, OurTake green border) */
--ss-green: #4a7c59;
--ss-green-light: rgba(74, 124, 89, 0.10);
--ss-green-badge: rgba(74, 124, 89, 0.08);
--ss-yellow: #c9953a;
--ss-yellow-light: rgba(201, 149, 58, 0.10);
--ss-red: #b85450;
--ss-red-light: rgba(184, 84, 80, 0.08);

/* Context anchor pills — always blue/neutral */
--ss-blue: #4a6a8c;
--ss-blue-light: rgba(74, 106, 140, 0.10);

--ss-border: #f0ede8;
--ss-border-light: #f7f5f1;
```

**Color usage rules:**
- Green/amber/red ONLY in: Scope Match dots, Concerns section, Our Take border (green), Criteria number badge (green — ordinal only)
- Context anchor pills are ALWAYS blue/neutral — never color-coded
- No green/amber/red on Key Criteria

---

## Core Data Type

```typescript
interface EDCData {
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;

  scope_match: {
    dimension: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;       // Italic callout ABOVE the table

  key_criteria: {
    name: string;
    evidence: string;             // HTML with <strong> tags
    context_anchor?: string;      // e.g. "at Norican" — pill text
  }[];

  compensation: {
    current_base: string;
    current_total: string;
    expected_base: string;
    expected_total: string;
    flexibility: string;
    budget_range?: string;
  };
  notice_period: string;
  earliest_start_date: string;

  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];

  potential_concerns: {
    concern: string;
    severity: 'development' | 'significant';
  }[];

  our_take: {
    text: string;
    recommendation?: 'ADVANCE' | 'HOLD' | 'PASS';  // kept in type, hidden by default
    discussion_points?: string[];
    original_note?: string;       // consultant notes — NEVER shown to clients
    ai_rationale?: string;        // AI reasoning — NEVER shown to clients
  };

  search_name: string;
  role_title: string;
  generated_date: string;
  consultant_name: string;
  match_score_display?: 'SHOW' | 'HIDE';  // Default: 'HIDE'
  cv_url?: string;
  linkedin_url?: string;
}
```

---

## Key Design Decisions

1. **No interview date in header** — removed to support drip-feeding candidates without exposing timeline
2. **No ADVANCE/HOLD/PASS badge on Our Take** — contradicts "show evidence, let humans judge". Our Take is free-form consultant text.
3. **No numeric scores on Key Criteria** — evidence paragraph IS the assessment
4. **Context anchor pills are always blue/neutral** — they state WHERE (not HOW WELL)
5. **Scope seasoning sits ABOVE the table** — it's the editorial lens through which you read the table
6. **OurTake has consultant-only sections** — original notes + AI rationale collapsed/hidden from client view
7. **EditableField wraps all text** — contentEditable, gold ring on focus, subtle gold tint on hover

---

## Section Architecture

```
EDCCard
├── EDCHeader (dark, warm charcoal)
└── white card
    ├── ScopeMatch
    │   ├── Scope seasoning callout (italic, gold left border) ← ABOVE table
    │   └── Table (dimension | candidate | requirement | AlignmentDot)
    ├── KeyCriteria
    │   └── [badge | name + evidence | ContextAnchorPill] per criterion
    ├── Compensation
    │   ├── 3-column CompCard grid (current | expectation | budget)
    │   └── Notice period + earliest start
    ├── Motivation
    │   └── [↑/↓ icon | headline — detail] per factor
    ├── Concerns
    │   └── [⚠ icon | concern text] with amber/red tinted cards
    ├── Gold gradient divider ✦
    └── OurTake
        ├── Green-bordered card with assessment text
        ├── Discussion points (optional)
        └── [consultant view only] Notes input + Generate button + Original Note + AI Rationale
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/search/[searchId]/edc/[candidateId]` | Single EDC view |
| `/deck/[searchId]` | Candidate deck overview (grid) |
| `/transform` | EDS → EDC AI transformer (dark theme) |

**Test URLs** (with fixture data):
- `/search/stada-us-bd/edc/rama-kataria`
- `/search/stada-us-bd/edc/peter-borden`
- `/search/stada-us-bd/edc/julien-genovino`

---

## AI Integration

**EDS → EDC Transform** (`/api/transform`):
- POST `{ rawText, manualNotes? }` → returns `EDCData` JSON
- Uses `claude-sonnet-4-20250514`
- Prompt in `src/lib/transform-prompt.ts`

**Generate Our Take** (`/api/generate-our-take`):
- POST `{ candidateContext, manualNotes }` → returns `{ text, recommendation, discussion_points, ai_rationale }`
- `candidateContext` built from `buildCandidateContext(data)` in `types.ts`
- Prompt in `src/lib/generate-our-take-prompt.ts`

---

## Current State (as of Feb 25, 2026)

**Built and working:**
- Full EDC card with all sections
- EDS → EDC transformer page (dark theme) with paste/docx upload
- Generate Our Take with consultant notes input
- Split view (CV panel alongside EDC)
- Deck view (candidate grid)
- EditableField on all text
- Cormorant Garamond for candidate name, Sorts Mill Goudy for EDC badge
- 3 real STADA pharma search candidates in fixture data

**Recent commits:**
- feat: add EDS transformer, client deck, CV split view, Generate Our Take, and real candidate data
- feat: v0.2 visual fidelity pass — matching prototype warmth and typography
- feat: EditableField — gold outline on focus, applied to all sections

**Known issues / next priorities** (from Feb 17 design review):
- Header needs SmartSearch logo (white PNG already in /public/logos/)
- Scope Match rows can be tightened further on 13" screens
- Compensation section: display font for big numbers (Cormorant) needs checking
- Pill content enhancement: consider richer context (company + metric)
- PDF export not yet built

---

## Non-Negotiable Quality Rules

1. Never infer — display only what's in data. If empty, show "Not mentioned"
2. Consultant voice — "We believe", not "The candidate presents"
3. No emojis in the card UI
4. Single red element — Concerns is the ONLY red-adjacent section
5. Key Criteria names are sacred — never rename or reorder
6. Evidence sections (1-5) are factual. Our Take is the ONLY judgment section
7. No scoring on criteria — no numbers, no Strong/Moderate/Weak labels
8. Context anchors are factual reference points — never evaluative
