import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";
import { mergeKeyCriteria } from "@/lib/merge-criteria";
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
    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9-]+$/i.test(candidateId)) {
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
            const engineName0 = engineCriteria[0]?.name || '';
            const incomingName0 = incomingCriteria[0]?.name || '';

            // Block if: different criteria count, or first criterion name doesn't match Engine
            const countMismatch = incomingCriteria.length !== engineCriteria.length;
            const nameMismatch = engineName0 && incomingName0 && incomingName0 !== engineName0;

            if (countMismatch || nameMismatch) {
              console.log(
                `[edits] Stale criteria structure for ${candidateId}: ` +
                `Engine has ${engineCriteria.length} criteria "${engineName0.slice(0, 40)}" ` +
                `vs incoming ${incomingCriteria.length} criteria "${incomingName0.slice(0, 40)}". ` +
                `Using Engine structure with merged consultant edits.`
              );
              // Use Engine structure but preserve consultant-edited evidence/anchors
              edcData.key_criteria = mergeKeyCriteria(engineCriteria, incomingCriteria);
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
