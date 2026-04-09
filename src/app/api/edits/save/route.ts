import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";
import fs from "fs";
import path from "path";

function fixtureExists(searchId: string): boolean {
  const fixturePath = path.join(process.cwd(), "data", "decks", `${searchId}.json`);
  return fs.existsSync(fixturePath);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { searchId, candidateId, edcData } = body;

    if (!searchId || !candidateId || !edcData) {
      return NextResponse.json({ error: "searchId, candidateId, and edcData are required" }, { status: 400 });
    }

    // Validate path segments (alphanumeric + hyphens only)
    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9-]+$/i.test(candidateId)) {
      return NextResponse.json({ error: "Invalid searchId or candidateId" }, { status: 400 });
    }

    const hasFixture = fixtureExists(searchId);

    // Write to Supabase only for non-fixture searches (e.g., ktj-cor-ctl)
    if (SUPABASE_ENABLED && !hasFixture) {
      const { getServiceClient } = await import("@/lib/supabase");
      const { resolveSearchId } = await import("@/lib/supabase-data");
      const searchUUID = await resolveSearchId(searchId);

      if (searchUUID) {
        // Guard: if edc_data was constructed from raw EDS fields (fallback),
        // do NOT write it to Supabase — it would overwrite Engine-generated data.
        const isFallbackData = edcData._fromFallback === true;

        if (isFallbackData) {
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

          // Fetch current manually_edited_fields to merge
          const { data: existing } = await supabase
            .from('candidates')
            .select('manually_edited_fields')
            .eq('search_id', searchUUID)
            .eq('candidate_slug', candidateId)
            .single();

          const existingFields: string[] = existing?.manually_edited_fields || [];
          const newFields = Object.keys(edcData);
          const mergedFields = Array.from(new Set([...existingFields, ...newFields]));

          // Strip internal flags before writing to Supabase
          const cleanEdcData = { ...edcData };
          delete cleanEdcData._fromFallback;

          // Build update payload — always write edc_data + tracking fields
          const updatePayload: Record<string, unknown> = {
            edc_data: cleanEdcData,
            manually_edited_fields: mergedFields,
            updated_at: new Date().toISOString(),
          };

          // Sync deck_status when status is present in edcData
          if (edcData.status) {
            updatePayload.deck_status = edcData.status;
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

    // Always write to Blob as well (fallback / backward compat)
    const pathname = `edits/${searchId}/${candidateId}.json`;
    const blob = await put(pathname, JSON.stringify(edcData), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    console.log("[edits] Saved edit overlay:", pathname, blob.url);
    return NextResponse.json({ url: blob.url, pathname });
  } catch (error) {
    console.error("[edits] Save failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
