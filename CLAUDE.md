# CLAUDE.md — SmartSearch EDC v1.0

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
11. **Deck Landing Page** — Dark-themed intro page showing all candidates for a search as compact intro cards in a responsive grid. Route: `/deck/[searchId]`. Search context card at top (role, client, key criteria, search lead). Grid of clickable candidate intro cards below. Each card: initials avatar, name, title, company, location, 2-line summary, "View EDC" nav bar. Dark background (#0a0a0a), gold accent system. Editable fields in consultant mode. Lock/unlock toggle. Data loads from `/data/decks/[searchId].json`. Reference: `edc-deck-landing-v3.html`.
12. **Card Flip → Full EDC View** — The signature interaction. Clicking an intro card triggers a 3D flip animation and reveals the full EDC. Replace the current loading overlay (`navigateToEDC` function) with: Phase 1 (0–200ms) card lifts, clone created at exact position, original fades; Phase 2 (200–700ms) clone flies to center, scales up, rotateY(180deg); Phase 3 (700ms+) overlay removed, full EDCCard component rendered. Navigation: "← Back to Deck" (gold, top-left), Prev/Next arrows, keyboard shortcuts (← → Esc S). Full EDC rendered on #0a0a0a background, max-width 900px, centered, scrollable. **The EDCCard component must be identical to the one used on standalone routes** — one component, many contexts.
13. **CV Split View** — Toggle mode within full EDC view. Screen splits 50/50: CV/PDF left, EDC card right. Both panels scroll independently. Three CV states: upload zone (dashed border, drag-and-drop), pre-attached URL (iframe), client-uploaded (createObjectURL). Minimum viewport 900px. Toggle via nav bar button or 'S' key. Default: OFF for client view.
14. **Index / Comparison View** — Compact tabular summary of all candidates in a search, designed for alignment calls and final selection decisions. NOT the same as the intro deck — this is a decision-support tool, not a teaser. Minimum fields: name, current title, company, location. Optional toggleable columns: notice period, compensation alignment (green/amber/red badge), career trajectory. Sortable by column. Printable / exportable as single-page PDF. Accessible from deck landing page via "Compare All" button in hero section. Route: `/deck/[searchId]/compare`. Blair specifically requested this — it maps to how clients already work during shortlist calls.

---

## Key Criteria — Context Anchors (Feb 12 Design Decision)

### The Problem (from team feedback)

The original prototype used abstract sentiment pills like "Track Record", "Retention Story", "Data-Led", "Untested", "Strategic Link". These describe what KIND of evidence exists but don't tell the client the one thing they actually want to know: **where, when, and in what capacity did the candidate do this?**

> "Built a $45M aftermarket operation. Where did they do that? Doing that within a $10 billion company is very different to doing it within a $200 million company." — Tara, Feb 12
>
> "When was that... did they do that this year? 20 years ago?" — Carlie, Feb 12
>
> "Their role at the time. It's one thing being part of building the $45 million aftermarket operation. But maybe at that point, the person was just a sales director. Or maybe they were the CEO." — Tara, Feb 12

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

### Pill Position (Feb 20 Decision — LOCKED)

Context anchor pills render **below** the evidence text, not inline or right-aligned:

```
┌─ ① ──────────────────────────────────────────────────────────┐
│  Aftermarket Revenue Growth                                   │
│                                                               │
│  Built a $45M aftermarket operation from $28M at Norican      │
│  in three years through a combined parts-and-service          │
│  strategy targeting installed-base conversion...              │
│                                                               │
│  ┌──────────────┐                                             │
│  │  at Norican  │  ← pill stacked below, left-aligned        │
│  └──────────────┘                                             │
└───────────────────────────────────────────────────────────────┘
```

This replaces the previous "right-aligned pills in criteria grid" direction from the v0.2 design review. The team decided right-alignment constrained evidence text width and created awkward wrapping on narrow viewports. Stacking below gives evidence the full width and keeps pills visually connected to the text they anchor.

**v1.1 expansion:** When pills include role + period (`VP Aftermarket, Norican · 2021–24`), they'll be wider — stacking below accommodates this gracefully.

### v1.0 Examples (from Norican VP Aftermarket prototype data)

| Criterion | Evidence (with inline company) | Context Anchor Pill |
|---|---|---|
| Aftermarket Revenue Growth | **Built a $45M aftermarket operation from $28M at Norican in three years** through a combined parts-and-service strategy... | `at Norican` |
| Team Leadership & Development | Leads 120 across field service, inside sales, and technical support **at Norican Americas**. Notable retention: lost only 3 people in 2 years... | `at Norican` |
| Operational Excellence | Implemented Lean methodology across the service function **at Norican**. Reduced mean-time-to-repair by 22%... | `at Norican` |
| C-Suite / Board Engagement | Currently presents quarterly to the Americas leadership team **at Norican** but has not reported directly to a European board or Group CEO... | `at Norican` |
| Strategic Planning Capability | Authored the Americas aftermarket 3-year plan **at Norican**, currently in execution... | `at Norican` |

Note: When all achievements are from the same company, the pills will look repetitive. This is fine — it's factual. In practice, candidates with diverse career histories will show different companies per criterion, which is where context anchors become genuinely valuable (e.g. one criterion from their current role, another from a previous company).

### v1.1 Examples (future — richer context)

| Criterion | Context Anchor Pill |
|---|---|
| Aftermarket Revenue Growth | `VP Aftermarket, Norican · 2021–24` |
| Team Leadership & Development | `VP Aftermarket, Norican · 120 reports` |
| C-Suite / Board Engagement | `Americas leadership · no European board` |

### What This Replaces

The following elements from the original prototype are **removed or deprioritized**:

| Removed | Reason |
|---|---|
| Abstract sentiment pills ("Track Record", "Retention Story", "Data-Led", "Untested", "Strategic Link") | Don't answer the client's real question: where/when/what role? |
| Numeric scores (0-5 per criterion) | Contradicts "show evidence, let humans judge" — the evidence paragraph IS the assessment |
| Match score percentage badge | Deprioritized — keep in data model as `match_score_display: 'HIDE'` default, but do not render by default |
| Score-to-color mapping on criteria | Removed — no green/amber/red on individual criteria items |
| ADVANCE / HOLD / PASS recommendation badge | Removed from Our Take — consultant writes free-form judgment, no traffic-light system |

### What Stays

| Kept | Why |
|---|---|
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

**Important color usage rule:** Green/amber/red semantic colors are used ONLY in:
- Scope Match alignment dots
- Concerns section (amber only)
- Our Take border (green only)
- Criteria number badge background (green, as ordinal marker only)

They are NOT used on Key Criteria evidence or pills. Context anchor pills are always blue/neutral.

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
2. **Key Criteria Assessment** — Numbered list with evidence + context anchor pills (stacked below evidence text). No scoring colors.
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

6. **Our Take** — Green-bordered judgment box (consultant voice). Editable. No recommendation badge.

### Footer
Light cream background (#faf9f6), search name left, SmartSearch branding right.

---

## Deck View — Intro Landing Page (Build Steps 11-14)

### What This Is

The client's entry point. When a SmartSearch consultant shares a search link, the client sees a dark, cinematic landing page showing all their candidates at a glance. Clicking any candidate triggers a 3D flip animation that reveals the full EDC.

This is the **"new era" moment** — the moment a hiring director realises they're not reading a document, they're using an intelligence platform.

### Route

```
/deck/[searchId]
```

Example: `edc.smartsearchexec.com/deck/stada-head-bd`

This is the shareable URL. Clients bookmark this. It's the entry point to all candidate intelligence for a given search.

### Page Structure

```
┌──────────────────────────────────────────────────────────┐
│  SmartSearch logo                          🔒 Private     │  ← sticky header
│  "Head of Business Development · STADA"                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Hero ────────────────────────────────────────────┐   │
│  │  [Client Logo]  Client Company Name               │   │
│  │  Role Title                                       │   │
│  │  ── gold divider ──                               │   │
│  │  "N candidates presented for your review."        │   │
│  │  [Compare All →]                                  │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │         │  │         │  │         │                  │
│  │  Card 1 │  │  Card 2 │  │  Card 3 │  ← intro cards  │
│  │  (front)│  │  (front)│  │  (front)│                  │
│  │         │  │         │  │         │                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                          │
│  "Show Evidence. Let Humans Judge." + SmartSearch brand   │
└──────────────────────────────────────────────────────────┘
```

### Page Theme (Dark Mode)

- Page background: `#0a0a0a`
- All cards float on dark surface with gold-tinged shadow system
- SmartSearch logo: white variant, top-left
- Footer: "Show Evidence. Let Humans Judge." + SmartSearch branding, gold text on dark

### Intro Card Structure

Each candidate intro card shows:
- **Initials avatar** — gold circle (#c5a572), Cormorant Garamond or Inter 600
- **Candidate name** — Inter 600, ~0.95rem, white
- **Current title** — Inter 400, ~0.8rem, muted
- **Current company** — Inter 400, ~0.78rem, gold-muted
- **Location** — pin icon + city, ~0.75rem
- **Compensation alignment badge** — small dot (green/amber/red) beside location or in card corner. Same dot component as Scope Match `AlignmentDot`. No exact figures — just signal.
- **Career trajectory** — if populated, shown as subtle line below company: e.g. "Big 4 → Corp → CFO", ~0.72rem, muted
- **Industry shorthand** — if populated, shown as tag/pill: e.g. "FMCG / Beverages", ~0.68rem
- **Summary** — 2-line max, with `<strong>` for key phrases, ~0.82rem, muted text
- **Nav bar** — "Executive Decision Card" label left, "View →" right, gold accent on hover

Card styling:
```css
.candidate-card {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(197, 165, 114, 0.12);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.candidate-card:hover {
  border-color: rgba(197, 165, 114, 0.35);
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(197, 165, 114, 0.06);
}
```

### Card Grid

```css
.candidates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  perspective: 1200px;   /* enables 3D flip transforms */
}
```

- 1 card → centered, max-width 400px
- 2 cards → two columns
- 3 cards → three columns
- 4+ → wraps to second row

### Consultant Edit Mode

Deck landing page supports inline editing for consultants:
- Lock/Unlock toggle in header
- When unlocked: all `[data-editable]` fields become contenteditable
- Gold outline on focus, subtle format bar for bold/italic/underline
- Reset button per field (reverts to `data-original` value)
- Lock button locks all fields and hides editing UI
- **Edit mode is consultant-side only** — controlled by consultant in settings, default OFF for clients.

---

## Card Flip Animation — The Signature Interaction (Build Step 12)

When a client clicks an intro card, the card lifts off the grid, flies to screen center, flips over in 3D, and reveals the full EDC. This is the transition from "glance" to "deep dive."

### Phase 1 — Lift (0–200ms)
- Clone the clicked card as a "flying card" positioned absolutely at the card's exact screen coordinates
- Original card fades to `opacity: 0`
- Flying card gets enhanced shadow: `0 30px 100px rgba(0,0,0,0.5)`

### Phase 2 — Fly + Flip (200–700ms)
- Flying card smoothly translates to screen center
- Simultaneously scales up to full EDC size: `width: min(900px, 100vw - 80px)`, `height: min(700px, 100vh - 160px)`
- 3D Y-axis rotation: `transform: rotateY(180deg)` — the card literally turns over
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` — fast start, smooth landing

### Phase 3 — Reveal (700ms+)
- Flying card overlay removed
- Full EDC view fades in at centered position (the `EDCCard` component)
- "← Back to Deck" appears top-left in gold
- Candidate navigation arrows appear (prev/next)
- CV Split View toggle appears in nav bar

### CSS for Flip Animation

```css
.card-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
  perspective: 1200px;
}

.flying-card {
  position: absolute;
  background: var(--ss-white);
  border-radius: 20px;
  transform-style: preserve-3d;
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
}

.flying-card.flipping {
  transform: rotateY(180deg);
}
```

### What This Replaces

The current `navigateToEDC()` function (lines ~1029-1058 in the HTML prototype) shows a loading spinner overlay and then resets. **Replace this entirely** with the flip animation logic. The function should:

1. Get the card's bounding rect via `getBoundingClientRect()`
2. Create a fixed-position overlay div (`.card-transition-overlay`)
3. Clone the card's visual appearance into a `.flying-card` element at exact screen position
4. Fade original card to `opacity: 0`
5. After 50ms (next frame), add target position + `.flipping` class
6. After 700ms, remove overlay and render full EDC view
7. Scroll to top of EDC

---

## Full EDC View — Post-Flip (Build Step 12 continued)

After the flip completes, the client sees the **complete `EDCCard` component** — the identical component used on standalone routes (`/search/[searchId]/edc/[candidateId]`). One component, many contexts.

### Context-Aware Header Rendering

The EDCCard component accepts a `context` prop that controls header field visibility:

```tsx
type EDCContext = 'standalone' | 'deck' | 'comparison' | 'print';

// In EDCHeader.tsx:
interface EDCHeaderProps {
  data: EDCData;
  context: EDCContext;  // default: 'standalone'
}
```

| Header Field       | `standalone` | `deck`  | `comparison` | `print` |
|--------------------|-------------|---------|-------------|---------|
| Candidate name     | ✅          | ✅      | ✅          | ✅      |
| Current title      | ✅          | ✅      | ✅          | ✅      |
| Current company    | ✅          | ✅      | ✅          | ✅      |
| Location           | ✅          | ✅      | ✅          | ✅      |
| Role name          | ✅          | ❌      | ❌          | ✅      |
| Consultant name    | ✅          | ❌      | ❌          | ✅      |
| Generated date     | ✅          | ❌      | ❌          | ❌      |
| Submission date    | footer only | footer  | ❌          | footer  |

**Rationale (Feb 20 team decision):** When viewing from the deck, the client already sees role context in the hero section. Repeating it in every EDC header is redundant clutter. The card should focus entirely on the candidate.

This is NOT a separate component — it's the same `EDCCard` with conditional rendering based on context. One component, many contexts.

`FullEDCView` renders `<EDCCard data={candidate.edc_data} context="deck" />` — never 'standalone' when accessed from the deck route.

### Layout

Rendered on `#0a0a0a` background with:
- Max-width 900px, centered
- Enhanced floating shadow
- Navigation bar at top
- Scrollable content: Scope Match → Key Criteria → Compensation → Motivation → Concerns → Our Take

### Navigation Bar

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Deck       📄 CV Split View    1 / 3    │
│                           ← Prev   Next →          │
└─────────────────────────────────────────────────────┘
```

- **← Back to Deck:** Returns to the intro grid. Simple fade-transition back (reverse flip animation optional for v1.1).
- **CV Split View:** Toggles the split panel. See CV Split View section.
- **1 / 3:** Current candidate position in deck.
- **Prev / Next:** Cycles through candidates without returning to deck.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous candidate |
| `→` | Next candidate |
| `Esc` | Back to deck |
| `S` | Toggle CV Split View |

### State Management

Track the following state for the deck view:

```typescript
interface DeckViewState {
  searchId: string;
  candidates: IntroCardData[];    // all candidates in this deck
  currentIndex: number | null;    // null = grid view, number = viewing that candidate's EDC
  splitViewActive: boolean;
  editMode: boolean;              // consultant edit mode (lock/unlock)
}
```

When `currentIndex` is `null`, show the intro grid. When it's a number, show the full EDC for that candidate with navigation controls.

---

## CV Split View (Build Step 13)

### What This Is

A toggle mode within the full EDC view. When activated, the screen splits: CV/PDF document on the left, EDC card on the right. The client cross-references the candidate's CV against the structured intelligence.

### Activation

Available from:
1. **Nav bar** — "📄 CV Split View" button
2. **Keyboard** — `S` key toggles on/off
3. **Works in both deck context** (`/deck/[searchId]`) **and standalone** (`/search/[searchId]/edc/[candidateId]`)

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Deck    ● Split View Active    ✕ Close Split │
├──────────────────────┬───────────────────────────────────┤
│                      │                                   │
│   CV / PDF Viewer    │       Full EDC Card               │
│   (scrollable)       │       (scrollable)                │
│                      │                                   │
│   ┌──────────────┐   │   ┌───────────────────────────┐   │
│   │              │   │   │  EDCHeader                │   │
│   │  PDF iframe  │   │   │  Scope Match              │   │
│   │  or          │   │   │  Key Criteria             │   │
│   │  Upload zone │   │   │  Compensation             │   │
│   │              │   │   │  Motivation               │   │
│   │              │   │   │  Concerns                 │   │
│   │              │   │   │  Our Take                 │   │
│   └──────────────┘   │   └───────────────────────────┘   │
│                      │                                   │
├──────────────────────┴───────────────────────────────────┤
│              ← Prev        2 / 3        Next →           │
└──────────────────────────────────────────────────────────┘
```

### Split Proportions

- Left (CV): `50%`
- Right (EDC): `50%`
- Both scroll independently
- Minimum panel width: 400px
- Below 900px viewport: split view button hidden — shows tooltip "Requires wider screen"
- v1.1 enhancement: draggable divider

### CV Panel — Three States

**State 1 — No CV (Upload Zone):**
- Dashed border: `2px dashed rgba(197,165,114,0.2)`, hover brightens to `0.5`
- Background: `#111111`
- Accepts `.pdf` only
- Drag-and-drop supported
- Text: "Upload CV — Click or drag & drop (.pdf only)"

**State 2 — CV Pre-Attached (URL):**
When `edc_data.cv_url` is populated → PDF renders in `<iframe>` filling the panel. Fallback: "Download CV" button if iframe fails.

**State 3 — CV Uploaded (Client-Side):**
After upload → `URL.createObjectURL(file)` → iframe renders it. "Replace CV" button at bottom. Client-side only, no server upload in v1.0.

---

## Index / Comparison View — Decision Support Table (Build Step 14)

### What This Is

A compact table showing all candidates side-by-side. Used during alignment calls when the client and consultant are narrowing from longlist to shortlist. Blair requested this — clients consistently ask for it at call close.

**This is NOT the intro deck.** The intro deck is a visual "menu" for browsing. The comparison view is a structured table for deciding.

### Route

```
/deck/[searchId]/compare
```

Accessible from the deck landing page via a "Compare All →" button in the hero section, and from the DeckNavBar when viewing an individual EDC.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to Deck                              Compare All Candidates  │
├──────┬──────────────┬─────────────┬───────────┬────────┬────────────┤
│  #   │  Name        │  Title      │  Company  │  Loc   │  Notice    │
├──────┼──────────────┼─────────────┼───────────┼────────┼────────────┤
│  1   │  K. Lawson   │  Sr Dir TR  │  Coca-Cola│  NC    │  3 months  │
│  2   │  J. Mitchell │  VP C&B     │  Keurig   │  MA    │  60 days   │
│  3   │  A. Perez    │  Dir Comp   │  Reyes    │  GA    │  30 days   │
│  4   │  R. Garcia   │  Head TR    │  PepsiCo  │  NY    │  90 days   │
└──────┴──────────────┴─────────────┴───────────┴────────┴────────────┘
```

### Required Columns (always visible)
- Name (clickable → navigates to full EDC)
- Current title
- Current company
- Location

### Optional Columns (toggleable via column picker)
- Notice period
- Compensation alignment badge (green/amber/red dot — same dot component as Scope Match)
- Career trajectory (e.g. "Big 4 → Corp → CFO")
- Industry shorthand

### Behaviour
- Sortable by any column (click header)
- Row click navigates to full EDC view (same as clicking intro card, but without flip animation — instant navigation)
- Dark theme consistent with deck landing (#0a0a0a background)
- Rows use subtle gold border on hover: `border-color: rgba(197,165,114,0.25)`
- Printable: `@media print` stylesheet renders clean table on single page

### Data

All data comes from the same `SearchContext` payload — no additional data fetch needed. Comparison fields are extracted from each candidate's `edc_data`.

---

## Data Loading — Deck Context

For v1.0: all candidate data for a deck is loaded from a single JSON fixture file per search.

```typescript
// lib/data.ts — add this function alongside existing getCandidateData
export async function getDeckData(searchId: string): Promise<SearchContext> {
  // v1.0: read from /data/decks/[searchId].json
  // Future: API call with auth token
}
```

Data file location: `/data/decks/[searchId].json`

**Important:** The full EDCData for each candidate should be loaded eagerly (all in the initial payload). The deck will only ever have 3-6 candidates — small enough to load upfront. This avoids loading delays on card flip.

### Production Data Path (Post v1.0)

The production trigger for EDC generation is the **Invenias progress status change to "To Send"** (Feb 20 team decision). When a consultant moves a candidate to "To Send" in Invenias:

1. Invenias webhook (or polling) detects status change
2. EDS Text Store data for that candidate is pulled
3. EDC is generated and written to the candidate's deck JSON (or database record)
4. Deck landing page auto-refreshes or shows new candidate

**Current status (Feb 24):** API field exposure for progress status not yet confirmed. Fallback: email button trigger in EDS notification email. Must be resolved before production pilots.

**Data flow:**
```
Invenias "To Send" → Zapier webhook → Pull EDS Text Store → Generate EDC fields → Write to deck data → Deck page renders new candidate
```

For v1.0, the JSON fixture (`/data/decks/[searchId].json`) simulates this end state. The `getDeckData()` function signature stays the same — only the implementation changes when the pipeline connects.

---

## Authentication — Deck Routes (Stub for Now)

In v1.0, deck URLs are accessible without auth. For v1.1:
- **Magic links:** `/deck/[searchId]?token=[uuid]` — time-limited, single-search access
- **Token validation** in middleware before rendering
- **Watermarking:** client company name rendered as very faint diagonal text across each EDC (deters screenshots)

For now, `lib/auth.ts` returns `{ authenticated: true, role: 'client' }` when accessing deck routes.

---

## Data Contract

The EDC renders from this TypeScript interface (maps to EDS Text Store):

```typescript
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
                                   // e.g. "Built a $45M aftermarket operation at <strong>Norican</strong>..."
    context_anchor?: string;       // Pill text — company name for v1.0.
                                   // e.g. "at Norican"
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
    text: string;                  // Free-form consultant judgment. Editable.
                                   // Generated from manual notes by AI, then
                                   // reviewed/edited by consultant.
                                   // Original manual notes and AI rationale are
                                   // NEVER visible in client-facing version.
  };

  // Meta
  search_name: string;
  role_title: string;
  generated_date: string;          // No interview_date — removed per Feb 12 decision
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

### Deck-Level Data Types

```tsx
interface SearchContext {
  search_id: string;
  role_title: string;
  client_company: string;
  client_logo_url?: string;
  location: string;
  search_lead: string;
  key_criteria_names: string[];          // from Job Summary
  candidates: IntroCardData[];
  deck_settings: {
    match_score_display: 'SHOW' | 'HIDE';  // default: HIDE
    our_take_display: 'SHOW' | 'HIDE';     // default: SHOW — toggleable per search
    edit_mode: boolean;                      // consultant toggle
  };
}

interface IntroCardData {
  candidate_id: string;
  initials: string;
  name: string;
  current_title: string;
  current_company: string;
  location: string;
  summary_html: string;               // 2 lines max, supports <strong>
  href: string;                        // relative link e.g. "./pbv-dcb/k7m2x9"

  // Jackie's confirmed fields (Feb 5 design session)
  compensation_alignment: 'green' | 'amber' | 'red' | 'not_set';
                                       // Badge on intro card. Green = within budget,
                                       // Amber = stretch, Red = significantly above.
                                       // Exact figures only on full EDC (Feb 5 decision).
  career_trajectory?: string;          // e.g. "Big 4 → Corp → CFO"
  industry_shorthand?: string;         // e.g. "FMCG / Beverages"

  edc_data: EDCData;                   // full EDC data — loaded eagerly
}
```

**Our Take toggle (Feb 20 decision):** Team was split on value — Phil/Blair concerned about editing overhead, Tara/Jackie see it as a consultant voice differentiator. Consensus: keep as toggleable option. When `our_take_display: 'HIDE'`, the Our Take section does not render on the EDC at all — not collapsed, not greyed out, fully absent. Adoption depends on generation quality; if it requires heavy editing, consultants will toggle off in practice.

### What was removed from the data contract

| Removed field | Reason |
|---|---|
| `key_criteria[].score` (0-5) | "Show evidence, let humans judge" — no numeric scoring |
| `key_criteria[].focus_label` | Replaced by `context_anchor` |
| `key_criteria[].focus_color` | All context anchors use neutral blue — no color-coded judgment |
| `our_take.recommendation` ('ADVANCE'/'HOLD'/'PASS') | Contradicts core principle — consultant writes free text |
| `our_take.verdict` / `our_take.case` / `our_take.recommendation_action` | Simplified to single `our_take.text` — consultant controls structure |
| `interview_date` | Removed from header per Feb 12 decision (drip-feeding) |

### What was added

| New field | Purpose |
|---|---|
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
4. **Single red element.** "Potential Concerns" is the ONLY red-adjacent element. Everything else uses gold/charcoal/green/blue. Deliberate design decision — avoid alarming clients.
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

### Deck Fixture

Create `/data/decks/pbv-dcb.json` using the 4 candidates from the prototype HTML:

| # | Name | Title | Company | Location | ID |
|---|------|-------|---------|----------|----|
| 1 | Katherine Lawson | Senior Director, Total Rewards | Coca-Cola Consolidated | Charlotte, NC | k7m2x9 |
| 2 | James Mitchell | VP Compensation & Benefits | Keurig Dr Pepper | Burlington, MA | p4n8v3 |
| 3 | Alicia Perez | Director of Compensation | Reyes Beverage Group | Atlanta, GA | r2t5w8 |
| 4 | Robert Garcia | Head of Total Rewards — Americas | PepsiCo (Corporate) | Purchase, NY | n6j3q1 |

Each candidate's `edc_data` object should contain full realistic EDC data matching the Pepsi Bottling Ventures Director of Compensation & Benefits search. Use the existing `EDCData` interface. For v1.0, generate plausible fixture data — this will be replaced by live EDS Text Store data when the pipeline is connected.

---

## Project Structure

```
smartsearch-edc/
├── CLAUDE.md                 # This file
├── package.json
├── next.config.js
├── tailwind.config.ts        # Custom design tokens from above
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── deck/                          # Deck landing pages
│   │   │   └── [searchId]/
│   │   │       ├── page.tsx               # Intro grid + flip → full EDC
│   │   │       └── compare/
│   │   │           └── page.tsx           # Comparison table view
│   │   └── search/
│   │       └── [searchId]/
│   │           ├── page.tsx
│   │           └── edc/
│   │               └── [candidateId]/
│   │                   └── page.tsx       # Standalone EDC (existing)
│   ├── components/
│   │   ├── edc/
│   │   │   ├── EDCCard.tsx                # Reusable — deck view, standalone, transform
│   │   │   ├── EDCHeader.tsx              # Context-aware: standalone/deck/comparison/print
│   │   │   ├── ScopeMatch.tsx
│   │   │   ├── KeyCriteria.tsx            # Pills stacked below evidence text
│   │   │   ├── Compensation.tsx
│   │   │   ├── Motivation.tsx
│   │   │   ├── Concerns.tsx
│   │   │   ├── OurTake.tsx
│   │   │   ├── EDCFooter.tsx
│   │   │   └── EditableField.tsx
│   │   ├── deck/                          # Deck-specific components
│   │   │   ├── DeckLanding.tsx            # Grid + hero + search context
│   │   │   ├── IntroCard.tsx              # Single candidate intro card
│   │   │   ├── CardFlipTransition.tsx     # Flip animation controller
│   │   │   ├── FullEDCView.tsx            # Post-flip wrapper: nav bar + EDCCard + prev/next
│   │   │   ├── CVSplitView.tsx            # Split panel: CV left, EDC right
│   │   │   ├── DeckNavBar.tsx             # Back to Deck + CV Split + Prev/Next
│   │   │   └── ComparisonView.tsx         # Index/comparison table for alignment calls
│   │   └── ui/
│   │       ├── SectionLabel.tsx
│   │       ├── ContextAnchorPill.tsx
│   │       └── AlignmentDot.tsx           # Used in Scope Match + intro card comp badge
│   ├── lib/
│   │   ├── types.ts                       # EDCData, SearchContext, IntroCardData, EDCContext
│   │   ├── data.ts                        # getCandidateData() + getDeckData()
│   │   └── auth.ts
│   └── styles/
│       └── edc-print.css
├── data/
│   ├── test_fixtures.json                 # Existing — standalone EDC test data
│   └── decks/                             # Deck fixture files
│       └── pbv-dcb.json                   # Pepsi Bottling Ventures test deck
└── public/
    └── fonts/
```

### Removed from structure

| Removed | Why |
|---|---|
| `MatchScoreBadge.tsx` | Match score hidden by default — not a v1.0 component |
| `FocusPill.tsx` | Replaced by `ContextAnchorPill.tsx` |
| `Tooltip.tsx` | No score tooltips needed without numeric scoring |
| `lib/scoring.ts` | No score-to-color mapping needed |

---

## Architecture Rules

**The Portal Rule:** Client portal is OUT OF SCOPE for v1.0 — but nothing we build should need rebuilding when the portal arrives.

- **Routes are portal-shaped.** `/search/[searchId]/edc/[candidateId]` and `/deck/[searchId]`
- **Data fetching is abstractable.** `lib/data.ts` exports `getCandidateData(searchId, candidateId)` and `getDeckData(searchId)` — reads JSON now, API later.
- **Auth hook exists as a stub.** `lib/auth.ts` returns `{ authenticated: true, role: 'consultant' }`.
- **Components are context-agnostic.** `EDCCard` renders identically standalone, in a deck, in a comparison view, or in print — controlled by the `context` prop, not separate components.

---

## Future Integration Points (Don't Build Yet, But Architect For)

1. **Google Sheets API** — Replace JSON fixtures with live EDS Text Store data
2. **Our Take regeneration** — "Generate Again" button calls Claude API with manual notes
3. **v1.1 context anchors** — Expand pills from "at Norican" to "VP Aftermarket, Norican · 2021–24" (role + company + period)
4. **PDF Export** — Server-side screenshot + download option (clients will want PDFs, per Feb 12 feedback)
5. **Match score toggle** — If reintroduced, allow show/hide via UI control
6. **Magic link auth** — Time-limited tokens for deck URLs + watermarking
7. **Draggable CV split** — Adjustable divider for CV Split View panel widths

---

## Git Discipline

Commit after every successful build step:
```
git add . && git commit -m "feat: EDCHeader — warm charcoal bg, no interview date"
git add . && git commit -m "feat: KeyCriteria — context anchor pills replacing sentiment labels"
git add . && git commit -m "feat: DeckLanding — dark intro grid with 4 PBV candidates"
git add . && git commit -m "feat: CardFlip — 3D flip animation from intro card to full EDC"
git add . && git commit -m "feat: FullEDCView — post-flip navigation with prev/next and keyboard"
git add . && git commit -m "feat: CVSplitView — toggle 50/50 split with upload zone"
git add . && git commit -m "feat: ComparisonView — sortable candidate table for alignment calls"
```

---

## HTML Prototype Reference

The file `edc_prototype_v02.html` is the visual reference. When building components, match its look and feel but apply the changes documented above:
- Replace sentiment pills with context anchor pills (stacked below evidence text)
- Remove numeric scores from criteria
- Remove interview date from header
- Remove ADVANCE/HOLD/PASS from Our Take
- All context anchor pills use blue/neutral color (not green/amber/red)

The prototype's layout, spacing, typography, colors, and overall visual hierarchy remain the north star. Only the scoring/judgment elements change.

---

## Commands

```bash
npm run dev          # Local development (http://localhost:3000)
npm run build        # Production build
npm run lint         # Lint check
```

---

## Change Log

| Date | Change | Source |
|------|--------|--------|
| Feb 12 | Initial CLAUDE.md — Build Steps 1-10, design tokens, data contract | EDC design session |
| Feb 17 | Context anchor pills, removal of sentiment labels, Key Criteria spec | Team feedback synthesis |
| Feb 20 | Build Steps 11-14, deck view, card flip, CV split, comparison view | EDC Weekly — locked decisions |
| Feb 20 | Context-aware EDCCard header (`context` prop) | Team decision — deck header cleanup |
| Feb 20 | Pill layout: stacked below evidence (replaces right-alignment) | Layout decision — LOCKED |
| Feb 20 | Our Take toggle in deck_settings | Team consensus — toggleable per search |
| Feb 24 | IntroCardData fields: compensation_alignment, career_trajectory, industry_shorthand | Jackie's confirmed spec (Feb 5) |
| Feb 24 | Production trigger: Invenias "To Send" status → EDC generation | Pre-live call decision |
