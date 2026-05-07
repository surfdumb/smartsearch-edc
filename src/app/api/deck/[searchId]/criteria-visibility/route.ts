import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  try {
    const { candidate_id, hidden_names } = await request.json();
    const { searchId } = params;

    if (!searchId || !candidate_id || !Array.isArray(hidden_names)) {
      return NextResponse.json(
        { error: "searchId, candidate_id, and hidden_names array required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(candidate_id)) {
      return NextResponse.json({ error: "Invalid searchId or candidate_id" }, { status: 400 });
    }

    if (SUPABASE_ENABLED) {
      const { getServiceClient } = await import("@/lib/supabase");
      const supabase = getServiceClient();

      const { data: row, error: readErr } = await supabase
        .from('searches')
        .select('hidden_criteria_per_candidate')
        .eq('search_key', searchId)
        .single();

      if (readErr) {
        console.error("[criteria-visibility] Supabase read failed:", readErr);
      } else {
        const current =
          (row?.hidden_criteria_per_candidate as Record<string, string[]> | null) || {};
        const next = { ...current };
        if (hidden_names.length === 0) {
          delete next[candidate_id];
        } else {
          next[candidate_id] = hidden_names;
        }

        const { error: writeErr } = await supabase
          .from('searches')
          .update({ hidden_criteria_per_candidate: next })
          .eq('search_key', searchId);

        if (writeErr) console.error("[criteria-visibility] Supabase write failed:", writeErr);
        else console.log("[criteria-visibility] Saved:", searchId, candidate_id, hidden_names);
      }
    }

    const pathname = `deck-config/${searchId}/criteria-visibility/${candidate_id}.json`;
    const blob = await put(pathname, JSON.stringify({ hidden_names }), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    return NextResponse.json({ url: blob.url, pathname });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const candidate_id = url.searchParams.get('candidateId');
    const { searchId } = params;

    if (!searchId || !candidate_id) {
      return NextResponse.json(
        { error: "searchId and candidateId required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/i.test(searchId) || !/^[a-z0-9'-]+$/i.test(candidate_id)) {
      return NextResponse.json({ error: "Invalid searchId or candidateId" }, { status: 400 });
    }

    if (SUPABASE_ENABLED) {
      const { getServiceClient } = await import("@/lib/supabase");
      const supabase = getServiceClient();

      const { data: row } = await supabase
        .from('searches')
        .select('hidden_criteria_per_candidate')
        .eq('search_key', searchId)
        .single();

      const current =
        (row?.hidden_criteria_per_candidate as Record<string, string[]> | null) || {};
      if (candidate_id in current) {
        const next = { ...current };
        delete next[candidate_id];
        await supabase
          .from('searches')
          .update({ hidden_criteria_per_candidate: next })
          .eq('search_key', searchId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
