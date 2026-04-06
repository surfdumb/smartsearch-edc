import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";

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

    // Write to Supabase when enabled (primary store)
    if (SUPABASE_ENABLED) {
      const { getServiceClient } = await import("@/lib/supabase");
      const { resolveSearchId } = await import("@/lib/supabase-data");
      const searchUUID = await resolveSearchId(searchId);

      if (searchUUID) {
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
        const mergedFields = [...new Set([...existingFields, ...newFields])];

        const { error } = await supabase
          .from('candidates')
          .update({
            edc_data: edcData,
            manually_edited_fields: mergedFields,
            updated_at: new Date().toISOString(),
          })
          .eq('search_id', searchUUID)
          .eq('candidate_slug', candidateId);

        if (error) {
          console.error("[edits] Supabase write failed:", error);
        } else {
          console.log("[edits] Saved to Supabase:", searchId, candidateId);
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
