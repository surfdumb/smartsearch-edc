# Tara Recovery Report — cvw-ops-dir Our Take incident
**Date:** 2026-04-21
**Audit window:** 18:05–19:40 UTC (Tara's editing session, Rob Payne / Michael Noah / Marla Brown on cvw-ops-dir)
**Status after hotfix:** Our Take editor bug shipped (`bedb515`, deploy `dpl_AaEGxvtZ8shEMAsFCbo2KPkREBv1`, READY in production at 21:51 UTC). New edits persist correctly (verified with Michael/David test edits at 21:05–21:07 UTC).

---

## TL;DR

**The "zero edits survived" assessment was incomplete.** It was accurate for `our_take.text` but not for the rest of the payload. The vast majority of Tara's non-Our-Take edits are intact in Blob. Only `our_take.text` (all three candidates) and `our_take_fragments` (Rob and Michael; Marla's fragments survived) were clobbered to baseline.

| Candidate | `our_take.text` | `our_take_fragments` | Other fields (scope_match / key_criteria / compensation / motivation_hook / headline / photo / comp_alignment / linkedin_url) |
|---|---|---|---|
| Rob Payne      | **LOST** (baseline) | **LOST** (empty) | **INTACT** in Blob |
| Michael Noah   | **LOST** (baseline) | **LOST** (empty) | **INTACT** in Blob |
| Marla Brown    | **LOST** (baseline) | **INTACT** in Blob (4 bullets) | **INTACT** in Blob |

What Tara needs to re-type: **only the `our_take.text` on each of the three, plus `our_take_fragments` on Rob and Michael.** Everything else is already there.

---

## Methodology and constraints

- **Blob is the only persistence channel for this deck** (`cvw-ops-dir` has a fixture file at [data/decks/cvw-ops-dir.json](data/decks/cvw-ops-dir.json); per [app/api/edits/save/route.ts:34-38](src/app/api/edits/save/route.ts#L34-L38), fixture-based searches write Blob only, skipping Supabase).
- **Blob uses fixed-path overwrites** (`addRandomSuffix: false, allowOverwrite: true` at [app/api/edits/save/route.ts:246-249](src/app/api/edits/save/route.ts#L246-L249)). No version history. Each save overwrites the previous at `edits/cvw-ops-dir/{candidate}.json`. The brief's requested "show all DIVERGENT versions" is not possible from this channel — only the current (most-recent) state exists.
- **Vercel runtime logs contain no POST bodies.** Only the truncated `[edits] Saved edit overlay: ...` console.log. ~40 save timestamps logged in the 19:32–19:40 window; no payload content.
- **Supabase was never written for Tara's saves.** Rob/Michael rows in `nliftfmbsnplhrrdxqnx.candidates` last touched 16:42–16:43 UTC (pre-session creation of the stubs via commit 2797adc). Marla has no row in Supabase at all. Confirms the save path took Blob-only.
- **Blob upload timestamps:**
  - `rob-payne.json`: 2026-04-21 **19:40:19 UTC** — matches the last POST in the logs at 19:40:18
  - `marla-brown.json`: 2026-04-21 **18:35:38 UTC** — inside Tara's session
  - `michael-noah.json`: 2026-04-21 **21:07:58 UTC** — this overlay was written by you (Bharath) during post-hotfix testing with a "very minor" edit; the payload carries Tara's prior state plus your small test change

## One caveat to calibrate against

Some of the non-Our-Take field diffs may predate Tara's session. I have no way to know whether a given diff was from Tara tonight, or from a prior consultant session (cvw-ops-dir has been worked by Kalum / Carlie / Blair on prior dates). The fixed-path Blob overwrites mean the current content represents the cumulative end-state, not just tonight. Tara will be able to tell at a glance which lines are hers vs. which are from earlier.

The smoking gun that something tonight DID clobber is: `our_take.text` is byte-identical to `ai_generated_edc` on all three candidates, and Marla's `our_take_fragments` is populated (so she WAS in the Our Take editor tonight and wrote bullets there), yet her `our_take.text` still matches baseline. That's the signature of the hydration race the hotfix addresses.

---

## Rob Payne

**Blob overlay timestamp:** 2026-04-21 19:40:19 UTC
**Blob URL:** `https://mjsoik6stukmpfz9.public.blob.vercel-storage.com/edits/cvw-ops-dir/rob-payne.json`

### `our_take.text` — **LOST (clobbered to baseline)**
> We believe Rob is a credible operations leader with the right technical foundation and local machining credibility, though his limited aerospace exposure and very recent start at Deutsche Precision require careful handling with the client, particularly given his prior Kemco tenure.

↑ This is byte-identical to both `ai_generated_edc.our_take.text` (Supabase) and the fixture. If Tara typed anything into Our Take text, it's gone.

### `our_take_fragments` — **LOST**
> `[]` (empty array; matches baseline)

If Tara added bullets, they're gone.

### Other fields — **INTACT in Blob** (35 fields differ from fixture; treat these as-currently-deployed)
Key deltas that plausibly represent Tara's session work:
- `motivation_hook`: "Extremely passive, but interested in operations focus of this opportunity." *(fixture: "Open to a lateral move; prioritises fit and team quality over compensation.")*
- `scope_match` rows 0–3: different scope names, candidate_actual, role_requirement, alignment values. Row 4 exists in Blob, not in fixture.
- `key_criteria[0..4].evidence` and `context_anchor`: substantive rewrites (including one raw `<span style="color: ...">` leak at index 3 — an editor artifact Tara should be aware of).
- `compensation`: `current_total`, `expected_base`, `expected_total`, `flexibility`, `budget_range`, `current_lti` — all differ from fixture.
- `headline`: "Ranken-trained machinist running a 100-person, $27M precision CNC site after six years on the same shop floor."
- `photo_url`, `linkedin_url`, `compensation_alignment: "amber"`: present in Blob.
- `search_name: "Crestview Aerospace"` and `role_title: "Operations Director"` — these look like **stale** values (current fixture correctly says Kemco / Director of Operations per commit 2797adc). Worth Tara confirming these aren't her edits she wants to keep.

---

## Michael Noah

**Blob overlay timestamp:** 2026-04-21 21:07:58 UTC *(overwritten by Bharath's post-hotfix test edit; Tara's last pre-hotfix save was earlier in the 19:32–19:40 window)*
**Blob URL:** `https://mjsoik6stukmpfz9.public.blob.vercel-storage.com/edits/cvw-ops-dir/michael-noah.json`

### `our_take.text` — **LOST (clobbered to baseline)**
> We believe Michael presents strong technical credibility and continuous improvement capability, but his current engineering-focused role and measured, softly spoken presentation style may not fully align with Kemco's need for an outgoing, operations-led leader to serve as the customer-facing 'face of St. Louis.' Worth exploring further, particularly given his Danfoss operations leadership experience and his ability to establish CI infrastructure from scratch, but personality fit and compensation expectations warrant careful handling.

↑ Byte-identical to `ai_generated_edc.our_take.text` (Supabase) and fixture. Tara's edits gone.

### `our_take_fragments` — **LOST**
> `[]`

### Other fields — **INTACT in Blob** (38 fields differ from fixture)
Same pattern as Rob. Substantive deltas on `motivation_hook`, all `scope_match` rows, `key_criteria` evidence/anchors (minor wording and HTML differences), full compensation rewrite (different `current_base` wording, different `expected_base` = empty, different `expected_total`, `flexibility`, `budget_range`, `notice_period`), `headline`, `photo_url`, `linkedin_url`, `compensation_alignment: "amber"`.
Same stale `search_name: "Crestview Aerospace"` / `role_title: "Operations Director"` concern — worth confirming.

---

## Marla Brown

**Blob overlay timestamp:** 2026-04-21 18:35:38 UTC (inside Tara's session)
**Blob URL:** `https://mjsoik6stukmpfz9.public.blob.vercel-storage.com/edits/cvw-ops-dir/marla-brown.json`
**Not in Supabase** — `candidates` table has no row for `marla-brown`.

### `our_take.text` — **LOST (clobbered to baseline)**
> We believe Marla is a genuinely warm, inclusive leader with strong cultural fit for Kemco's tenure-driven environment and solid continuous improvement credentials. However, the transition from Boeing's high-volume operations to low-volume high-mix manufacturing and the depth of her technical credibility to challenge engineers require careful validation in next interviews.

↑ Byte-identical to fixture. Tara's text edits gone.

### `our_take_fragments` — **INTACT in Blob** ✅
```
1. Strong cultural fit: warm, inclusive leadership matches Kemco's tenure-driven environment
2. 14+ years Boeing aerospace, primarily high-volume assembly, but exposed to precision CNC machining throughout
3. Transition from Boeing scale to low-volume high-mix requires validation
4. Only candidate with direct DCMA interaction experience and 8-year quality inspection foundation
```
These are Tara's. Nothing to re-type for Marla's fragments.

### Other fields — **INTACT in Blob** (43 fields differ from fixture)
Extensive deltas on `current_title`, `current_company`, `location`, full `scope_match`, all `key_criteria` (substantive aerospace content — clearly Tara/consultant written), `compensation` (all sub-fields), `notice_period`, `potential_concerns`, `motivation_hook`, `photo_url`, `compensation_alignment: "green"`, `headline`.

---

## What to ask Tara to do *before* anything else

**She is the one channel we can still recover the lost `our_take.text` from.** If her browser tab is still open on any of the three candidates (not hard-refreshed, not closed), her `edc_edit_{candidateId}_ourtake` localStorage key will hold her last-typed text.

Steps to forward to Tara (time-sensitive — before she closes the tab or hard-refreshes):
1. Open each of the three candidate pages she edited tonight, one at a time.
2. DevTools → Application (Firefox: Storage) → Local Storage → filter for `edc_edit_`.
3. For each of `edc_edit_rob-payne_ourtake`, `edc_edit_michael-noah_ourtake`, `edc_edit_marla-brown_ourtake` — copy the value (JSON with `text`, `fragments`, `name`, `showName` keys). Paste into an email back.
4. Do NOT hard-refresh until those values have been copied.

If the values are there, they're authoritative and trivially recoverable. If her tab is already closed / refreshed, that channel is gone.

---

## What is *not* possible

- Recovery of historical Blob versions (fixed-path overwrites, no retention).
- Recovery from Vercel runtime logs (no POST body capture).
- Recovery from Supabase (never written for fixture decks; Marla not even in Supabase).

---

## Follow-ups for tomorrow (not tonight)

1. **WRITE_VERIFY_FAILED guard** on `/api/edits/save` — belt-and-suspenders for any future silent-drop class of bug. Deferred from the hotfix for deploy-risk reasons.
2. **Audit the other contentEditable fields** (compensation, motivation_hook, scope narrative, headline, etc.) against the canonical KeyCriteria/OurTake post-fix pattern. The fact that Rob/Michael non-Our-Take fields survived suggests those components already have correct wiring, but this is worth a systematic pass.
3. **Consider addRandomSuffix: true** for Blob writes so future drops are recoverable via version history — at the cost of one extra `list + pick-latest` hop on reads. Not urgent unless another incident class emerges.
