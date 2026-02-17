# CLAUDE.md — EDC v1.0 Build Spec (Updated Feb 17)

## What We're Building

A web application that renders **Executive Decision Cards (EDCs)** — one-page scannable candidate summaries for executive search clients. SmartSearch is a boutique executive search firm; their consultants interview C-suite candidates and need to present structured intelligence to clients in a format that takes 90 seconds to scan, not 30 minutes to read a 40-page PowerPoint.

The EDC is the client-facing output of an AI pipeline: interview → transcription → structured extraction → this card.

**This is a premium B2B product.** Clients are paying £100k+ per placement. The card must feel like it belongs in a boardroom, not a SaaS dashboard. Every pixel matters.

**Guiding principle: "Show evidence. Let humans judge."** The EDC presents structured evidence from real interviews. It does NOT score, rank, or recommend. The client makes the judgment call.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom design tokens (defined below)
- **Font:** Inter (Google Fonts) — weights 400, 500, 600, 700, 800
- **Data:** JSON fixtures in `/data/test_fixtures.json` → Google Sheets API or Supabase later
- **Deployment:** Vercel
- **PDF Export (future):** Puppeteer/Playwright server-side screenshot of the same web component

## Build Sequence

Build in this order. Each step is one Claude Code session. Commit after each.

1. **Scaffold** — Next.js 14 project, Tailwind config with all design tokens below, Inter font loaded, project structure created, `/data/test_fixtures.json` loading and rendering as plain text. Deploy to Vercel. Confirm it works.
2. **EDCHeader** — Dark header component: candidate name, title, company, location, meta row (Role, Search Lead, Generated date). Match the warm charcoal background, gold accents, typography from design tokens. **No Interview Date field** (removed per Feb 12 team decision — drip-feeding candidates makes interview dates counterproductive).
3. **ScopeMatch** — Table with Dimension / Candidate / Role Requirement columns. Color-coded alignment dots (green/amber/red). Scope seasoning callout below the table.
4. **KeyCriteria** — Numbered criteria list. Each item: number badge, criterion name, evidence paragraph with bold highlights and **inline company context** (e.g. "at Norican"), plus context anchor pill showing where the achievement happened. See "Key Criteria — Context Anchors" section below.
5. **Compensation** — Three-column grid: Current / Expectation / Budget. Notice period and timeline below. Gold highlight on budget column.
6. **Motivation** — Push/pull factors with directional indicators. Bold headline + supporting detail per factor.
7. **Concerns** — Warning items with ⚠ icon. Development area vs significant concern distinction. Amber-tinted.
8. **OurTake** — Green-bordered box. Editable consultant voice text. "Generate Our Take" button (future: calls AI to rewrite from manual notes). **No ADVANCE/HOLD/PASS badge** — this contradicts "show evidence, let humans judge." The Our Take is the consultant's professional voice, not a traffic light.
9. **Footer + Polish** — Footer bar, responsive breakpoints, card shadow/border-radius, section dividers.
10. **Contenteditable** — `EditableField` wrapper component. Gold outline on focus, subtle gold tint on hover. Apply to all text fields.

---

## Key Criteria — Context Anchors (Feb 12 Design Decision)

### The Problem (from team feedback)

The original prototype used abstract sentiment pills like "Track Record", "Retention Story", "Data-Led", "Untested", "Strategic Link". These describe what KIND of evidence exists but don't tell the client the one thing they actually want to know: **where, when, and in what capacity did the candidate do this?**

> "Built a $45M aftermarket operation. Where did they do that? Doing that within a $10 billion company is very different to doing it within a $200 million company." — Tara, Feb 12
> 

> "When was that... did they do that this year? 20 years ago?" — Carlie, Feb 12
> 

> "Their role at the time. It's one thing being part of building the $45 million aftermarket operation. But maybe at that point, the person was just a sales director. Or maybe they were the CEO." — Tara, Feb 12
> 

### The Solution: Context Anchor Pills

Replace abstract sentiment labels with **context anchors** — compact references that ground the achievement in reality. These answer: where did this happen, and (in v1.1) when and in what role?

**v1.0 (now):** Company name appears in TWO places:

1. **Inline in the evidence text** — e.g. "Built a $45M aftermarket operation from $28M **at Norican** in three years"
2. **Context anchor pill** — shows the company name as the pill text, e.g. `at Norican`

**v1.1 (planned):** Context anchor expands to include role and period:

- `VP Aftermarket, Norican · 2021–24`
- `CFO, Prenax Group · 2019–23`

### Pill Design (v1.0)

Context anchor pills use a **single neutral style** — they are informational, not evaluative. No green/red/amber color-coding on these pills. The whole point is to provide context and let the client judge.

```
Style: background: rgba(74, 106, 140, 0.10), color: #4a6a8c (blue/neutral)
Font:  Inter 600, 0.68rem (~11px), padding: 4px 11px, border-radius: 12px
```

All pills use the same blue/neutral tone. The pill is a reference anchor, not a score indicator.

### v1.0 Examples (from Norican VP Aftermarket prototype data)

| Criterion | Evidence (with inline company) | Context Anchor Pill |
| --- | --- | --- |
| Aftermarket Revenue Growth | **Built a $45M aftermarket operation from $28M at Norican in three years** through a combined parts-and-service strategy... | `at Norican` |
| Team Leadership & Development | Leads 120 across field service, inside sales, and technical support **at Norican Americas**. Notable retention: lost only 3 people in 2 years... | `at Norican` |
| Operational Excellence | Implemented Lean methodology across the service function **at Norican**. Reduced mean-time-to-repair by 22%... | `at Norican` |
| C-Suite / Board Engagement | Currently presents quarterly to the Americas leadership team **at Norican** but has not reported directly to a European board or Group CEO... | `at Norican` |
| Strategic Planning Capability | Authored the Americas aftermarket 3-year plan **at Norican**, currently in execution... | `at Norican` |

Note: When all achievements are from the same company, the pills will look repetitive. This is fine — it's factual. In practice, candidates with diverse career histories will show different companies per criterion, which is where context anchors become genuinely valuable.

### v1.1 Examples (future — richer context)

| Criterion | Context Anchor Pill |
| --- | --- |
| Aftermarket Revenue Growth | `VP Aftermarket, Norican · 2021–24` |
| Team Leadership & Development | `VP Aftermarket, Norican · 120 reports` |
| C-Suite / Board Engagement | `Americas leadership · no European board` |

### What This Replaces

The following elements from the original prototype are **removed or deprioritized**:

| Removed | Reason |
| --- | --- |
| Abstract sentiment pills ("Track Record", "Retention Story", "Data-Led", "Untested", "Strategic Link") | Don't answer the client's real question: where/when/what role? |
| Numeric scores (0-5 per criterion) | Contradicts "show evidence, let humans judge" — the evidence paragraph IS the assessment |
| Match score percentage badge | Deprioritized — keep in data model as `match_score_display: 'HIDE'` default, but do not render by default |
| Score-to-color mapping on criteria | Removed — no green/amber/red on individual criteria items |
| ADVANCE / HOLD / PASS recommendation badge | Removed from Our Take — consultant writes free-form judgment, no traffic-light system |

### What Stays

| Kept | Why |
| --- | --- |
| Scope Match alignment dots (green/amber/red) | These compare DIMENSIONS (P&L, headcount, geography) not criteria — binary fit assessment is useful here |
| Scope seasoning insight line | Valuable editorial context below the match table |
| Concerns section amber tinting | Appropriate — these ARE warnings, amber visual treatment is earned |
| Green border on Our Take | Distinguishes judgment section from evidence sections — core product principle |
| Criteria number badges (green circle) | Sequential numbering, not scoring — these are just ordinal markers |

---

## Design Tokens (from prototype — use these exact values)

### Colors

These come from `edc_prototype_v02.html`. The prototype uses a warmer palette than typical design systems — this is intentional and must be preserved.

```
/* === Core === */
--ss-dark:          #1a1a1a    /* Primary text */
--ss-dark-soft:     #2c2c2c    /* Secondary dark */
--ss-header-bg:     #2d2824    /* Header background — warm brown-charcoal, NOT pure black */

/* === Gold System === */
--ss-gold:          #c5a572    /* Primary accent — badges, edit icons */
--ss-gold-light:    #d4ba8a    /* Lighter gold for hover states */
--ss-gold-pale:     #e8dbc7    /* Very light gold */
--ss-gold-glow:     rgba(197, 165, 114, 0.15)  /* Gold background tint */
--ss-gold-deep:     #b08f5a    /* Darker gold for active states */

/* === Backgrounds === */
--ss-cream:         #faf8f5    /* Card section backgrounds */
--ss-warm-white:    #f7f4ef    /* Alternate warm white */
--ss-warm-tint:     #fdfbf7    /* Lightest warm background */
--ss-page-bg:       #f0ede8    /* Page background — warm stone, NOT cold gray */

/* === Text === */
--ss-gray:          #6b6b6b    /* Body text, secondary */
--ss-gray-light:    #a0a0a0    /* Labels, meta text */
--ss-gray-pale:     #d4d2ce    /* Lightest text */

/* === Semantic — Scope Match Only === */
--ss-green:         #4a7c59    /* Strong alignment / "Our Take" border / criteria number badge bg */
--ss-green-soft:    #5a9469    /* Softer green variant */
--ss-green-light:   rgba(74, 124, 89, 0.10)   /* Green badge background */
--ss-green-badge:   rgba(74, 124, 89, 0.08)   /* Criteria number badge bg */

--ss-yellow:        #c9953a    /* Partial alignment / amber concerns */
--ss-yellow-light:  rgba(201, 149, 58, 0.10)  /* Amber badge background */

--ss-red:           #b85450    /* Gap / significant concern — USED SPARINGLY */
--ss-red-light:     rgba(184, 84, 80, 0.08)   /* Red badge background */

/* === Context Anchor (Key Criteria pills) === */
--ss-blue:          #4a6a8c    /* Neutral informational — ALL context anchor pills use this */
--ss-blue-light:    rgba(74, 106, 140, 0.10)  /* Context anchor pill background */

/* === Borders === */
--ss-border:        #f0ede8    /* Section dividers */
--ss-border-light:  #f7f5f1    /* Row dividers within sections */
```

**Important color usage rule:** Green/amber/red semantic colors are used ONLY in Scope Match alignment dots, Concerns section (amber only), Our Take border (green only), and Criteria number badge background (green, as ordinal marker only). They are NOT used on Key Criteria evidence or pills. Context anchor pills are always blue/neutral.

### Typography

```
Candidate Name:       Inter 700, 2.5rem (40px), letter-spacing: -0.5px
Section Labels:       Inter 600, 0.65rem (~10px), uppercase, letter-spacing: 2.5px, color: --ss-gray-light
Criteria Headings:    Inter 600, 0.92rem (~15px), color: --ss-dark
Body Text:            Inter 400, 0.87rem (~14px), line-height: 1.65, color: --ss-gray
Evidence Bold:        Inter 600, same size, color: --ss-dark
Meta Labels:          Inter 600, 0.68rem (~11px), uppercase, letter-spacing: 1.5px, color: --ss-gray-light
Meta Values:          Inter 400, 0.92rem (~15px), color: rgba(255,255,255,0.78) [in header]
Context Anchor Pills: Inter 600, 0.68rem (~11px), padding: 4px 11px, border-radius: 12px
Footer Text:          Inter 400, 0.74rem (~12px)
```

### Spacing

```
Card max-width:       820px
Card border-radius:   20px
Card shadow:          0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.06), 0 30px 80px rgba(0,0,0,0.04)
Header padding:       36px 48px 32px
Section padding:      32px 48px
Section border:       1px solid #f0ede8 (bottom of each section)
Criteria item padding: 18px 0 (vertical), border-bottom: 1px solid #f7f5f1
Scope seasoning:      14px 20px padding, 10px border-radius, 3px gold left border
Page background:      #f0ede8, padding: 40px 20px 80px
```

### Header Details

The header has a warm brown-charcoal background (#2d2824), NOT pure black. It includes:

- Subtle radial gold glow: `radial-gradient(circle, rgba(197, 165, 114, 0.08) 0%, transparent 65%)` positioned top-right
- Bottom border: `linear-gradient(90deg, transparent, rgba(197, 165, 114, 0.35), transparent)` — 1px
- Meta row separated by: `1px solid rgba(255,255,255,0.07)` with 20px padding-top
- **No "Interview Date" field** — removed per Feb 12 decision. Only: Role, Search Lead, Generated date.

### Section Label Pattern

Every section uses this pattern:

```
Label text (uppercase, 0.65rem, letter-spacing 2.5px, --ss-gray-light)
+ decorative line extending to the right (1px solid #eeebe6, flex: 1)
```

Rendered as a flex row with `gap: 10px`.

### Match Dots (Scope Match only)

```
Strong:   9px circle, background: --ss-green, box-shadow: 0 0 0 3px --ss-green-light
Partial:  9px circle, background: --ss-yellow, box-shadow: 0 0 0 3px --ss-yellow-light
Gap:      9px circle, background: --ss-red, box-shadow: 0 0 0 3px --ss-red-light
```

These are used ONLY in the Scope Match table. Not on criteria.

---

## Layout Architecture

### Full-width dark header

- Top row: SmartSearch brand/logo (left) + "Executive Decision™ Card" badge (right)
- Candidate name (large, warm white #f5f0ea)
- Flash line: title · company · location (separated by gold middots)
- Meta row: Role, Search Lead, Generated date
- **No Interview Date** — removed to support drip-feeding candidates without exposing timeline

### Content sections (white card, rounded corners, shadow)

Sections render in this order, each separated by 1px border:

1. **Scope Match** — Comparison table + optional seasoning insight. Alignment dots here.
2. **Key Criteria Assessment** — Numbered list with evidence + context anchor pills. No scoring colors.
3. **Compensation & Timeline** — Three-column grid + notice/timeline
4. **Why Are They Interested?** — Push/pull motivation factors
5. **Potential Concerns** — Amber-tinted warning items

### Divider

A visual separator between evidence sections (above) and judgment section (below):

```css
height: 2px;
background: linear-gradient(90deg, transparent 10%, var(--ss-gold) 30%, var(--ss-gold) 70%, transparent 90%);
margin: 0 48px;
opacity: 0.25;
```

1. **Our Take** — Green-bordered judgment box (consultant voice). Editable. No recommendation badge.

### Footer

Light cream background (#faf9f6), search name left, SmartSearch branding right.

---

## Data Contract

The EDC renders from this TypeScript interface (maps to EDS Text Store):

```tsx
interface EDCData {
  // Header
  candidate_name: string;
  current_title: string;
  current_company: string;
  location: string;
  photo_url?: string;

  // Scope Match
  scope_match: {
    dimension: string;
    candidate_actual: string;
    role_requirement: string;
    alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
  }[];
  scope_seasoning?: string;

  // Key Criteria (parsed from key_criteria_assessment)
  key_criteria: {
    name: string;
    evidence: string;              // 1-2 sentences with <strong> for key phrases.
                                   // MUST include company name inline for v1.0.
    context_anchor?: string;       // Pill text — company name for v1.0.
                                   // v1.1: "VP Aftermarket, Norican · 2021–24"
  }[];

  // Compensation
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

  // Motivation
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];

  // Concerns
  potential_concerns: {
    concern: string;
    severity: 'development' | 'significant';
  }[];

  // Our Take
  our_take: {
    text: string;     // Free-form consultant judgment. Editable.
                      // Generated from manual notes by AI, then
                      // reviewed/edited by consultant.
                      // Original notes and AI rationale NEVER visible to client.
  };

  // Meta
  search_name: string;
  role_title: string;
  generated_date: string;   // No interview_date — removed per Feb 12 decision
  consultant_name: string;

  // Deprioritized — keep in type but hidden by default
  match_score_percentage?: number;
  match_score_display?: 'SHOW' | 'HIDE';  // Default: 'HIDE'

  // Extensible — not used in v1.0 but keep in type
  cv_url?: string;
  linkedin_url?: string;
  cv_highlights?: string[];
}
```

### What was removed from the data contract

| Removed field | Reason |
| --- | --- |
| `key_criteria[].score` (0-5) | "Show evidence, let humans judge" — no numeric scoring |
| `key_criteria[].focus_label` | Replaced by `context_anchor` |
| `key_criteria[].focus_color` | All context anchors use neutral blue — no color-coded judgment |
| `our_take.recommendation` (ADVANCE/HOLD/PASS) | Contradicts core principle — consultant writes free text |
| `our_take.verdict` / `case` / `recommendation_action` | Simplified to single `our_take.text` |
| `interview_date` | Removed from header per Feb 12 decision (drip-feeding) |

### What was added

| New field | Purpose |
| --- | --- |
| `key_criteria[].context_anchor` | Company where achievement happened (v1.0). Expands to role + period in v1.1. |

---

## Our Take — Design & Privacy Rules

### How it works

1. Consultant writes uninhibited manual notes during/after the interview
2. A separate AI (Claude) generates a professional, client-ready "Our Take" from those notes
3. Consultant reviews, edits (can shorten to two lines or expand for detail), and finalizes
4. "Generate Again" button regenerates a fresh version from the same notes

### Privacy (non-negotiable)

- **Original manual notes** are NEVER visible in the client-facing EDC
- **AI rationale** (why it worded the Our Take a certain way) is NEVER visible in the client-facing EDC
- Both exist only in the consultant's internal view for reference
- This separation is the core breakthrough that lets consultants "start writing freely again"

### Content

- Free-form text, typically 2-6 sentences
- Consultant voice ("We believe...", "Worth discussing with the client...")
- Can include: growth trajectory vs pedigree framing, "one to watch" signals, tension worth noting, recommended discussion points
- Fully editable — consultant can delete sections, rewrite, or reduce to a single sentence
- **No recommendation badges** — the text IS the recommendation

### Flexibility examples (from Feb 12 discussion)

- **Minimal:** "He's a builder, not an inheritor. Worth discussing with the client."
- **Detailed:** Full paragraph covering strengths, gaps, recommended discussion angles, and whether the candidate is a "one to watch"
- **Flagging:** "Tension worth noting: B2 level English" or "He's never reported to a European board"

---

## Quality Rules (Non-Negotiable)

1. **Never infer.** Display only what's in the data. If a field is empty or "Not mentioned," show "Not mentioned" — never fill with plausible guesses.
2. **Consultant voice.** All generated text uses "We believe" not "The candidate presents."
3. **No emojis.** Color-coding is welcome (in Scope Match and Concerns only). Emoticons/emoji are not.
4. **Single red element.** "Potential Concerns" is the ONLY red-adjacent element. Everything else uses gold/charcoal/green/blue.
5. **Key Criteria names are sacred.** They come from the Job Summary (consultant synthesis). Never rename, reorder, or reinterpret.
6. **Evidence sections vs judgment.** Sections 1-5 are evidence — clean, factual, no opinion. "Our Take" is the ONLY section that includes consultant judgment. This separation is the core product principle.
7. **No scoring on criteria.** No numeric scores, no Strong/Moderate/Weak labels, no color-coded criteria. The evidence paragraph IS the assessment. Context anchor pills provide WHERE, not HOW WELL.
8. **Context anchors are factual.** They state where/when/what role — never "impressive" or "concerning." They're reference points, not judgments.

---

## Test Data

Use the Prenax Group CTO search (identified as best-mix search in Feb 12 meeting — has completed interviews + existing Job Summaries + EDSs).

The test fixture file (`/data/test_fixtures.json`) should include:

- Full narrative fields with realistic prose matching SmartSearch's consultant voice
- Company names inline in all evidence text
- Context anchor values for each criterion
- At least one candidate with `match_score_display: "HIDE"` (default behavior)
- At least one criterion with "Not mentioned" to test empty states
- Our Take as free-form text (no structured verdict/case/recommendation)

---

## Project Structure

```
smartsearch-edc/
├── CLAUDE.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── search/
│   │       └── [searchId]/
│   │           ├── page.tsx
│   │           └── edc/
│   │               └── [candidateId]/
│   │                   └── page.tsx
│   ├── components/
│   │   ├── edc/
│   │   │   ├── EDCCard.tsx
│   │   │   ├── EDCHeader.tsx         # No interview date
│   │   │   ├── ScopeMatch.tsx        # Alignment dots here only
│   │   │   ├── KeyCriteria.tsx       # Context anchor pills, no scoring
│   │   │   ├── Compensation.tsx
│   │   │   ├── Motivation.tsx
│   │   │   ├── Concerns.tsx
│   │   │   ├── OurTake.tsx           # Free-form text, no badge
│   │   │   ├── EDCFooter.tsx
│   │   │   └── EditableField.tsx
│   │   └── ui/
│   │       ├── SectionLabel.tsx
│   │       ├── ContextAnchorPill.tsx  # Blue/neutral pill
│   │       └── AlignmentDot.tsx      # Scope Match only
│   ├── lib/
│   │   ├── types.ts
│   │   ├── data.ts
│   │   └── auth.ts
│   └── styles/
│       └── edc-print.css
├── data/
│   └── test_fixtures.json
└── public/
    └── fonts/
```

### Removed from structure

| Removed | Why |
| --- | --- |
| `MatchScoreBadge.tsx` | Match score hidden by default |
| `FocusPill.tsx` | Replaced by `ContextAnchorPill.tsx` |
| `Tooltip.tsx` | No score tooltips needed |
| `lib/scoring.ts` | No score-to-color mapping needed |

---

## Architecture Rules

**The Portal Rule:** Client portal is OUT OF SCOPE for v1.0 — but nothing we build should need rebuilding when the portal arrives.

- **Routes are portal-shaped.** `/search/[searchId]/edc/[candidateId]`
- **Data fetching is abstractable.** `lib/data.ts` exports `getCandidateData(searchId, candidateId)` — reads JSON now, API later.
- **Auth hook exists as a stub.** `lib/auth.ts` returns `{ authenticated: true, role: 'consultant' }`.
- **Components are context-agnostic.** `EDCCard` renders identically standalone, in a grid, or in a portal.

---

## Future Integration Points (Don't Build Yet, But Architect For)

1. **Google Sheets API** — Replace JSON fixtures with live EDS Text Store data
2. **Our Take regeneration** — "Generate Again" button calls Claude API with manual notes
3. **v1.1 context anchors** — Expand pills from "at Norican" to "VP Aftermarket, Norican · 2021–24" (role + company + period)
4. **Comparison View** — Route rendering multiple EDCs side-by-side
5. **CV / LinkedIn** — Split-screen route, keep `cv_url?: string` in the type
6. **PDF Export** — Server-side screenshot + download option (clients will want PDFs, per Feb 12 feedback)
7. **Match score toggle** — If reintroduced, allow show/hide via UI control

---

## HTML Prototype Reference

The file `edc_prototype_v02.html` is the visual reference. When building components, match its look and feel but apply the changes documented above:

- Replace sentiment pills with context anchor pills
- Remove numeric scores from criteria
- Remove interview date from header
- Remove ADVANCE/HOLD/PASS from Our Take
- All context anchor pills use blue/neutral color (not green/amber/red)

The prototype's layout, spacing, typography, colors, and overall visual hierarchy remain the north star. Only the scoring/judgment elements change.

---

## Git Discipline

Commit after every successful build step:

```
git add . && git commit -m "feat: EDCHeader — warm charcoal bg, no interview date"
git add . && git commit -m "feat: KeyCriteria — context anchor pills replacing sentiment labels"
```

---

## Commands

```bash
npm run dev          # Local development (http://localhost:3000)
npm run build        # Production build
npm run lint         # Lint check
```