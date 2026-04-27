import { put, list, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";
import { mergeKeyCriteria } from "@/lib/merge-criteria";
import { canonicalText, keyCriteriaCanonicallyEqual } from "@/lib/criteria-canonical";
import { stripArtifactsDeep } from "@/lib/sanitize";
import fs from "fs";
import path from "path";

function fixtureExists(searchId: string): boolean {
  const fixturePath = path.join(process.cwd(), "data", "decks", `${searchId}.json`);
  return fs.existsSync(fixturePath);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { searchId, candidateId, edcData: rawEdcData } = body;

    if (!searchId || !candidateId || !rawEdcData) {
      return NextResponse.json({ error: "searchId, candidateId, and edcData are required" }, { status: 400 });
    }

    // Strip browser-extension artifacts (e.g., "Say more" from grammar assistants)
    // from every string value before any processing. Belt-and-suspenders: components
    // already strip on blur, but a stale in-memory state could still POST one.
    const edcData = stripArtifactsDeep(rawEdcData);

    // Validate path segments (alphanumeric + hyphens only)
    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(candidateId)) {
      return NextResponse.json({ error: "Invalid searchId or candidateId" }, { status: 400 });
    }

    const hasFixture = fixtureExists(searchId);
    // For Supabase-native searches, Supabase is the canonical store — never write
    // to Blob (overlays would mask future Supabase updates from the Engine).
    // Fixture-based searches always write to Blob (it's their only persistence).
    let skipBlobWrite = SUPABASE_ENABLED && !hasFixture;

    // Write to Supabase only for non-fixture searches (e.g., ktj-cor-ctl)
    if (SUPABASE_ENABLED && !hasFixture) {
      const { getServiceClient } = await import("@/lib/supabase");
      const { resolveSearchId } = await import("@/lib/supabase-data");
      const searchUUID = await resolveSearchId(searchId);

      if (!searchUUID) {
        console.error(`[edits] resolveSearchId returned null for "${searchId}" — edits will not persist`);
        return NextResponse.json(
          { error: `Search "${searchId}" not found in Supabase` },
          { status: 404 }
        );
      }

      const skipSupabaseEdcWrite = false;

        // Guard: if edc_data was constructed from raw EDS fields (fallback),
        // do NOT write it to Supabase — it would overwrite Engine-generated data.
        const isFallbackData = edcData._fromFallback === true;

        if (isFallbackData) {
          skipBlobWrite = true;
          console.log("[edits] Skipping Supabase edc_data write — fallback-constructed data:", searchId, candidateId);

          // Still sync non-edc_data fields (deck_status, etc.)
          if (edcData.status) {
            const supabase = getServiceClient();
            await supabase
              .from('candidates')
              .update({ deck_status: edcData.status, updated_at: new Date().toISOString() })
              .eq('search_id', searchUUID)
              .eq('candidate_slug', candidateId);
          }
        } else {
          const supabase = getServiceClient();

          // Guard 2: Don't overwrite Engine-generated edc_data with stale client state.
          // When the Engine populates edc_data, it also writes ai_generated_edc as a pristine copy.
          // Compare incoming key_criteria against the Engine's — if names or count differ,
          // the client is sending stale data (e.g. "name: flash" format, EDS assessment text).
          const { data: aiCheck } = await supabase
            .from('candidates')
            .select('ai_generated_edc')
            .eq('search_id', searchUUID)
            .eq('candidate_slug', candidateId)
            .single();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const aiEdc = (aiCheck as any)?.ai_generated_edc;
          if (aiEdc?.key_criteria?.length > 0) {
            const engineCriteria = aiEdc.key_criteria;
            const incomingCriteria = edcData?.key_criteria || [];

            // Canonical comparison — stripArtifactsDeep has trimmed the
            // incoming payload but aiEdc came raw from the Engine. Without
            // canonicalText here, any whitespace/Unicode asymmetry in names
            // flagged "stale" and fired the merge, which then lost consultant
            // edits because edcMap keys/lookups were asymmetric too.
            const countMismatch = incomingCriteria.length !== engineCriteria.length;

            const nameMismatchIndices: number[] = [];
            if (!countMismatch) {
              for (let i = 0; i < engineCriteria.length; i++) {
                const engN = canonicalText(engineCriteria[i]?.name);
                const incN = canonicalText(incomingCriteria[i]?.name);
                if (engN && incN && engN !== incN) nameMismatchIndices.push(i);
              }
            }
            const nameMismatch = nameMismatchIndices.length > 0;

            if (countMismatch || nameMismatch) {
              const reason = countMismatch ? 'count' : 'name-mismatch';
              console.log(
                `[edits] Stale criteria structure for ${candidateId}: ` +
                `engine=${engineCriteria.length}, incoming=${incomingCriteria.length}, ` +
                `name-mismatch-indices=[${nameMismatchIndices.join(',')}]. ` +
                `Using Engine structure with merged consultant edits.`
              );
              // Use Engine structure but preserve consultant-edited evidence/anchors
              edcData.key_criteria = mergeKeyCriteria(engineCriteria, incomingCriteria, {
                candidateId,
                reason,
              });
            }
          }

          if (!skipSupabaseEdcWrite) {
            // Fetch current manually_edited_fields to merge
            const { data: existing } = await supabase
              .from('candidates')
              .select('manually_edited_fields')
              .eq('search_id', searchUUID)
              .eq('candidate_slug', candidateId)
              .single();

            const existingFields: string[] = existing?.manually_edited_fields || [];

            // Fields that are always client-owned (not from Engine)
            const CLIENT_OWNED = new Set([
              'status', 'photo_url', 'headline', 'compensation_alignment',
              'motivation_hook', 'our_take_fragments', 'our_take', 'linkedin_url',
            ]);

            // Diff incoming edcData against AI base to find real edits
            const realEditedFieldNames: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleanEdcData: Record<string, any> = aiEdc ? { ...aiEdc } : {};

            for (const field of Object.keys(edcData)) {
              if (field === '_fromFallback') continue;

              const value = edcData[field];
              if (value === undefined) continue;

              if (CLIENT_OWNED.has(field)) {
                // Always accept client-owned fields
                cleanEdcData[field] = value;
                if (JSON.stringify(value) !== JSON.stringify(aiEdc?.[field])) {
                  realEditedFieldNames.push(field);
                }
                continue;
              }

              // key_criteria: canonical comparison. JSON.stringify diff would
              // flag `&nbsp;` / doubled-space round-trip noise as "edited"
              // (Bruno criterion 3 evidence) and both write it back AND push
              // to manually_edited_fields. Canonical form treats whitespace
              // noise as non-edit so it neither writes nor flags — raw
              // consultant content still lands as typed when it's a real edit.
              if (field === 'key_criteria' && Array.isArray(value) && Array.isArray(aiEdc?.[field])) {
                if (!keyCriteriaCanonicallyEqual(value, aiEdc[field])) {
                  cleanEdcData[field] = value;
                  realEditedFieldNames.push(field);
                }
                continue;
              }

              // Standard diff: only write if different from AI base
              if (!aiEdc || JSON.stringify(value) !== JSON.stringify(aiEdc[field])) {
                cleanEdcData[field] = value;
                realEditedFieldNames.push(field);
              }
            }

            const mergedFields = Array.from(new Set([...existingFields, ...realEditedFieldNames]));

            // Build update payload — always write edc_data + tracking fields
            const updatePayload: Record<string, unknown> = {
              edc_data: cleanEdcData,
              manually_edited_fields: mergedFields,
              updated_at: new Date().toISOString(),
            };

            // Sync deck_status when status is present in edcData
            // Note: use !== undefined so 'none' (legitimate clear value) also syncs.
            if (edcData.status !== undefined) {
              updatePayload.deck_status = edcData.status;
            }

            // Mirror compensation_alignment to top-level column — loader reads from
            // the top-level `candidates.compensation_alignment`, not edc_data.
            // Without this mirror, edits to the comp indicator write to jsonb
            // and silently fail to surface on reload.
            // No server-side enum gate: current tokens are color values
            // ('green' | 'amber' | 'not_set'), not aligned/below/stretch.
            if (edcData.compensation_alignment !== undefined) {
              updatePayload.compensation_alignment = edcData.compensation_alignment;
            }

            // Mirror our_take.text to top-level candidates.our_take column.
            // Same class of bug as compensation_alignment: DB evidence showed 53
            // candidates with top-level populated but edc_data.our_take null, and
            // 11 with divergent top-level vs jsonb text — load paths that read the
            // top-level column surface stale AI text instead of the consultant's
            // edit. Accept both shapes defensively (some older paths may send
            // our_take as a plain string).
            if (edcData.our_take !== undefined) {
              const ourTakeText = typeof edcData.our_take === 'string'
                ? edcData.our_take
                : (edcData.our_take?.text ?? null);
              if (ourTakeText !== null) {
                updatePayload.our_take = ourTakeText;
              }
            }

            const { error } = await supabase
              .from('candidates')
              .update(updatePayload)
              .eq('search_id', searchUUID)
              .eq('candidate_slug', candidateId);

            if (error) {
              console.error("[edits] Supabase write failed:", error);
            } else {
              console.log("[edits] Saved to Supabase:", searchId, candidateId);
            }
          }
        }
    }

    // Write to Blob as fallback / backward compat — but skip when Supabase guards
    // blocked the write (sparse data would create a self-perpetuating overlay loop)
    if (!skipBlobWrite) {
      const pathname = `edits/${searchId}/${candidateId}.json`;
      const blob = await put(pathname, JSON.stringify(edcData), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });

      console.log("[edits] Saved edit overlay:", pathname, blob.url);
      return NextResponse.json({ url: blob.url, pathname });
    }

    console.log("[edits] Supabase-native search — Blob write skipped:", searchId, candidateId);
    return NextResponse.json({ saved: "supabase", searchId, candidateId });
  } catch (error) {
    console.error("[edits] Save failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get("searchId");
    const candidateId = searchParams.get("candidateId");

    if (!searchId || !candidateId) {
      return NextResponse.json(
        { error: "searchId and candidateId are required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(candidateId)) {
      return NextResponse.json({ error: "Invalid searchId or candidateId" }, { status: 400 });
    }

    const hasFixture = fixtureExists(searchId);

    if (!hasFixture && SUPABASE_ENABLED) {
      console.log("[edits] DELETE skipped for Supabase-native search:", searchId, candidateId);
      return NextResponse.json({ skipped: "supabase-native", searchId, candidateId });
    }

    const prefix = `edits/${searchId}/${candidateId}.json`;
    const { blobs } = await list({ prefix });

    if (blobs.length === 0) {
      console.log("[edits] No overlay to delete:", prefix);
      return NextResponse.json({ deleted: 0, prefix });
    }

    let deleted = 0;
    for (const blob of blobs) {
      console.log("[edits] Deleting overlay:", blob.pathname, blob.url);
      await del(blob.url);
      console.log("[edits] Deleted overlay:", blob.pathname);
      deleted++;
    }

    return NextResponse.json({ deleted, prefix });
  } catch (error) {
    console.error("[edits] Delete failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
