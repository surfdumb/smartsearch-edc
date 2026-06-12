# Handoff: wire The Search Room to live data

**For:** the next Claude Code (or human) session that makes `/searchroom` live.
**Author:** prior session, 2026-06-12. **Status:** investigation complete, decision made, ready to build.
**TL;DR:** Wire the board to **Supabase** (single read source). Do **not** read the Company Spreadsheet at runtime — it's unstructured. The only field that isn't in Supabase is the **priority band (`pri`)**; make it a maintained `searches.priority` column, seeded from the current snapshot. Keep the subtle SharePoint *link* (humans still use the sheet).

---

## 1. Current state (what exists today)

The Search Room shipped in two PRs:
- **#21** — the board itself at `/searchroom` (route, client component, scoped CSS, the design's static data snapshot).
- **#22** — a "synced N ago · Sync" strip + `GET /api/searchroom/data` + a subtle "Company Spreadsheet ↗" link.

Right now **nothing is live**. The board renders a frozen snapshot baked into the repo:
- Data file: [`src/app/searchroom/data.json`](../src/app/searchroom/data.json) — 67 searches / 25 decks, exported from the Company Spreadsheet on **2026-06-11**, plus a hardcoded `synced_at`.
- API: [`src/app/api/searchroom/data/route.ts`](../src/app/api/searchroom/data/route.ts) just re-serves that file. **This is the integration seam** — making the board live means changing *only this handler*; the client needs zero edits.
- Client: [`src/app/searchroom/SearchRoom.tsx`](../src/app/searchroom/SearchRoom.tsx) seeds state from the import, and `Sync` refetches the API.
- Shape contract (do not break): `{ synced_at: string, searches: RawSearch[], candidates: Record<searchKey, RawCandidate[]> }`. Types live in [`src/app/searchroom/lib.ts`](../src/app/searchroom/lib.ts).

The board's organising principle is **three priority modules** driven by `pri` (`purple|green|red|amber|hold`) and a per-search status `st` (`high|active|hold|closed`). If `pri` is wrong/missing, the whole board structure collapses — so `pri` is the critical field.

---

## 2. The decision: Supabase, not the spreadsheet

Verified against the canonical Supabase project **`nliftfmbsnplhrrdxqnx` ("SmartSearch EDC")** and the live Company Spreadsheet (`…/Shared Documents/Company Spreadsheet.xlsx`).

**Why Supabase wins:**
- It already holds ~95% of the board's fields, cleanly typed (mapping in §3).
- One integration, already in the app (`@supabase/supabase-js`), real-time, no new credentials.
- The candidate roster (for row expansion + pulse bars) only exists in Supabase, not the sheet.

**Why NOT the spreadsheet at runtime:**
- It's a wide, human-formatted workbook with multiple stacked tables (a candidate×IV grid, then a separate live-searches summary). Programmatic parsing is fragile (merged cells, free text, drifting columns).
- It would need a Microsoft Graph integration (Azure app registration + credentials) the deployed app doesn't have.
- Its live-searches `Status` column only carries `high|hold`; **it has no priority-band column** — `pri` was hand-derived from the free-text `Notes` (e.g. "Need to do cut" → purple, "1 offer" → green) + revenue. Not machine-readable.

**Keep:** the subtle "Company Spreadsheet ↗" link (humans still drive ops from the sheet). Just don't read it as data.

---

## 3. Field mapping (verified column-by-column)

### `searches` → board `RawSearch`
| Board field | Source | Notes |
|---|---|---|
| `k` (key) | `search_key` | join key to candidates |
| `co` (company) | `client_display_name ?? client` | |
| `r` (role) | `role_title ?? position` | |
| `st` (status) | `status` | **exact 1:1**: `high\|active\|hold\|closed` |
| `loc` | `location` | |
| `ind` (industry) | `industry` | |
| `kam` | `kam` | sparsely populated; board already handles null |
| `cg` | `candidate_generator` | |
| `cc` | `client_contact` | |
| `ev` (engine version) | `engine_version` | ⚠️ live value is `"v2"`, snapshot used `"v2.1"/"v2.0"` — see §4 |
| `pw` | `access_password IS NOT NULL` | |
| `brief` (role brief generated?) | **undefined** — see §4 | no clean column |
| `pri` (priority band) | **NOT IN DB** — see §4 | the blocker |

`status` value counts at time of writing: active 30, high 18, hold 11, closed 9 (= 68 searches; the snapshot had 67, drift is expected).

### `candidates` → board `RawCandidate` (join `candidates.search_id` → `searches.id`)
| Board field | Source | Notes |
|---|---|---|
| `n` (name) | `candidate_name` | |
| `t` (title) | `current_title` | |
| `c` (company) | `current_company` | |
| `loc` | `location` | |
| `ds` (deck status) | `deck_status` | **exact 1:1**: `new\|active\|hold\|rejected\|none` |
| `sl` (card slug) | `candidate_slug` | drives Copy-card-link; null → "No card link" (already handled) |
| `cons` (consultant) | `consultant` | |

`deck_status` counts: new 130, active 39, rejected 35, hold 11, none 3.

---

## 4. The gaps — decisions required before building

### 4.1 `pri` (priority band) — THE blocker
Not a column in Supabase, not a column in the spreadsheet. Drives the 3 modules. Options:

- **(Recommended) Add a maintained `searches.priority` column.** Enum `needs_cut|offer|high|medium|hold` (→ board `purple|green|red|amber|hold`). Seed it once from the current `data.json` snapshot (map `search_key` → `pri`). Let ops maintain it going forward (ideally surfaced wherever they already set `status`). Clean, honest, board reads one field.
- **(Fallback) Derive heuristically** from Supabase signals. Partially possible but lossy: `status='hold'`→hold; on-deck/active candidate counts can hint High/Medium. **But "offer in progress" and "needs a cut" are NOT derivable** — Supabase has no "offer" deck_status (max is `active`="on deck"), and "needs a cut" is a human judgment. A heuristic will mis-band exactly the two categories the board leads with. Document loudly if you go this way.
- **(Not recommended) Parse the spreadsheet Notes.** Fragile NLP over free text; rejected for the reasons in §2.

> Confirm with Phil/ops which they want. The recommended column also lets a future spreadsheet→Supabase sync write it without touching the board.

### 4.2 `brief` (role-brief-generated boolean)
The board shows the "Role brief" chip enabled/disabled on this. There's **no clean column** — every search has `key_criteria` and `scope_match_dimensions` populated, so those can't signal it. Decide one of: (a) check Blob for the brief PDF at `briefs/{searchId}/…`; (b) treat a dedicated field/flag; (c) just always-enable the chip (it links to `/{k}/brief` which the app can 404/handle). Lowest-effort honest default: **(c)**, or a Blob existence check if you want accuracy.

### 4.3 `ev` engine-version filter
Live `engine_version` is `"v2"`; the board's filter hardcodes `["v2.1","v2.0"]` (in `SearchRoom.tsx`, `evOptions`). Fix: derive the option list dynamically from the data, and decide display formatting (e.g. show `"v2"` as-is). Don't ship a filter whose options never match the data.

---

## 5. Implementation plan

1. **Migration** (if §4.1 = recommended): add `searches.priority` (enum or text). Backfill from `data.json`: for each `{k, pri}`, `update searches set priority = <map(pri)> where search_key = k`. Map `purple→needs_cut, green→offer, red→high, amber→medium, hold→hold`.
2. **Rewrite the API handler** `src/app/api/searchroom/data/route.ts`:
   - Use the app's existing Supabase server client (see `src/lib/` for the canonical factory — note the env discrepancy in §6).
   - Select the §3 columns from `searches`; select candidates and group by `search_id`→`search_key`.
   - Map DB rows → `RawSearch`/`RawCandidate` (a pure mapper, unit-testable).
   - Compute `synced_at` = `max(searches.updated_at, candidates.updated_at)` (honest "freshness"), or `now()` if you prefer "as of this read".
   - Keep the response shape **exactly** `{ synced_at, searches, candidates }`. Keep `Cache-Control: no-store` + `dynamic = "force-dynamic"`.
3. **Seed first paint from the API, not the static import.** Today `SearchRoom.tsx` imports `data.json` for instant render. Options: convert `page.tsx` to a server component that fetches the mapper and passes initial data as a prop (best — no flash, no client-side waterfall), or keep the static import as a fallback and refetch on mount. Either way the `Sync` button already does the right refetch.
4. **Retire `data.json`** as the live source once the mapper lands (keep it only if you want an offline fallback; if so, mark it clearly stale).
5. **Fix `ev` options** (§4.3) and **`brief`** (§4.2).
6. **Sync semantics:** "Sync" = re-hit the API (re-read Supabase). Toast already distinguishes changed vs unchanged via `synced_at`. No SharePoint round-trip.

## 6. Gotchas / risks
- **Supabase env discrepancy (known):** local `.env.local` points at an out-of-org project `ngtuhkdrkzxmwfjprfco`; canonical prod is **`nliftfmbsnplhrrdxqnx`**. Verify the app's server client targets the right project before trusting reads. (See memory `supabase_project_env_discrepancy`.)
- **Data sensitivity:** this board exposes real client + candidate PII to the browser behind only a **client-side** gate (`edc2026`). Before a live, indexable URL, decide whether to put `/searchroom` behind the app's real JWT gate / SSO. The API route will serve PII too — gate it server-side.
- **Counts drift** vs the frozen snapshot are expected (live is ~68 searches vs 67).
- **`status` vs `pri` are independent** — don't conflate. `st` is the search lifecycle state; `pri` is the triage band. A search can be `status='high'` and `pri='purple'`.
- Don't reintroduce a global CSS leak — board styling is scoped under `.sr-root`; keep it.

## 7. Acceptance
- `/searchroom` renders from Supabase; toggling a `deck_status`/`status`/`priority` in the DB and clicking **Sync** reflects within one refetch.
- "Synced N ago" reflects real `updated_at` freshness.
- Three modules populate correctly (validates the `pri` source).
- Row expansion shows the real candidate roster; Copy-card-link works where `candidate_slug` exists.
- `next lint` + `npm run build` green; API route gated for PII.
