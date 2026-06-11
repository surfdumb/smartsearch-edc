import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";
import { timingSafeEqualString } from "@/lib/edcAccess";

// Remove a candidate card. Default is SOFT delete: set deleted_at/deleted_by,
// row and ai_generated_edc retained, recoverable by nulling deleted_at. All
// display/serving reads filter `deleted_at IS NULL`, so the card disappears
// from every surface (consultant + client + PDF + JSON) on the next load.
//
// ?hard=true is a true row delete and is gated behind an operator secret —
// the middleware cookie gate only applies when the search has a password, so
// the typed-confirm UI alone is not authentication. The x-operator-secret
// header must match EDC_OPERATOR_SECRET (same class as PIPELINE_SECRET);
// when the env var is unset, hard delete is disabled entirely.
//
// [searchId] = search_key slug (e.g. "cgn-bdd"); [slug] = candidate_slug.

const SEARCH_KEY_RE = /^[a-z0-9-]+$/i;
const SLUG_RE = /^[a-z0-9'-]+$/i;

async function resolveSearch(searchKey: string) {
  const { getServiceClient } = await import("@/lib/supabase");
  const { resolveSearchId } = await import("@/lib/supabase-data");
  const searchUUID = await resolveSearchId(searchKey);
  if (!searchUUID) return null;
  return { supabase: getServiceClient(), searchUUID };
}

export async function DELETE(
  request: Request,
  { params }: { params: { searchId: string; slug: string } }
): Promise<NextResponse> {
  try {
    const { searchId, slug } = params;

    if (!searchId || !slug) {
      return NextResponse.json({ error: "searchId and slug required" }, { status: 400 });
    }
    if (!SEARCH_KEY_RE.test(searchId) || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid searchId or slug" }, { status: 400 });
    }

    // Fixture/Sheets decks: no Supabase row to delete — no-op, not an error.
    if (!SUPABASE_ENABLED) {
      return NextResponse.json({ persisted: false, reason: "supabase-disabled" });
    }

    const hard = new URL(request.url).searchParams.get("hard") === "true";
    let deletedBy = "consultant";
    try {
      const body = await request.json();
      if (typeof body?.deleted_by === "string" && body.deleted_by.trim()) {
        deletedBy = body.deleted_by.trim();
      }
    } catch {
      /* empty body is fine for the soft path */
    }

    const resolved = await resolveSearch(searchId);
    if (!resolved) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }
    const { supabase, searchUUID } = resolved;

    const { data: target, error: lookupError } = await supabase
      .from("candidates")
      .select("id, candidate_name, deleted_at")
      .eq("search_id", searchUUID)
      .eq("candidate_slug", slug)
      .maybeSingle();

    if (lookupError) {
      console.error("[candidate-delete] lookup failed:", searchId, slug, lookupError);
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (hard) {
      // ─── HARD DELETE — operator gate ──────────────────────────────────────
      // Irreversible: drops the row AND its Engine-source ai_generated_edc.
      const operatorSecret = process.env.EDC_OPERATOR_SECRET;
      const providedKey = request.headers.get("x-operator-secret") ?? "";
      if (!operatorSecret) {
        return NextResponse.json({ error: "hard_delete_disabled" }, { status: 403 });
      }
      if (!timingSafeEqualString(providedKey, operatorSecret)) {
        return NextResponse.json({ error: "invalid_operator_key" }, { status: 403 });
      }

      // regeneration_jobs has no ON DELETE CASCADE (candidate_narratives and
      // edc_decks do) — clear it explicitly or the row delete fails on the FK.
      const { error: jobsError } = await supabase
        .from("regeneration_jobs")
        .delete()
        .eq("candidate_id", target.id);
      if (jobsError) {
        console.error("[candidate-delete] regeneration_jobs clear failed:", slug, jobsError);
        return NextResponse.json({ error: jobsError.message }, { status: 500 });
      }

      const { data: deleted, error: deleteError } = await supabase
        .from("candidates")
        .delete()
        .eq("id", target.id)
        .select("id, candidate_slug, candidate_name");

      if (deleteError) {
        console.error("[candidate-delete] hard delete failed:", searchId, slug, deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      await logDeletion(supabase, {
        searchUUID,
        searchKey: searchId,
        candidateName: target.candidate_name,
        deletedBy,
        hard: true,
      });

      console.log("[candidate-delete] hard-deleted:", searchId, slug);
      return NextResponse.json({ success: true, mode: "hard", deleted: deleted?.[0] ?? null });
    }

    // ─── SOFT DELETE (default) ──────────────────────────────────────────────
    // .is('deleted_at', null) makes a repeat call a no-op instead of bumping
    // the timestamp; ai_generated_edc is never touched.
    const { data: updated, error: updateError } = await supabase
      .from("candidates")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("search_id", searchUUID)
      .eq("candidate_slug", slug)
      .is("deleted_at", null)
      .select("id, candidate_slug, candidate_name, deleted_at, deleted_by");

    if (updateError) {
      console.error("[candidate-delete] soft delete failed:", searchId, slug, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // Row exists (lookup above) but deleted_at was already set.
      return NextResponse.json({ success: true, mode: "soft", already_deleted: true });
    }

    await logDeletion(supabase, {
      searchUUID,
      searchKey: searchId,
      candidateName: target.candidate_name,
      deletedBy,
      hard: false,
    });

    console.log("[candidate-delete] soft-deleted:", searchId, slug);
    return NextResponse.json({ success: true, mode: "soft", candidate: updated[0] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/** Best-effort pipeline_log audit row — never fails the request. */
async function logDeletion(
  supabase: { from: (table: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: {
    searchUUID: string;
    searchKey: string;
    candidateName: string | null;
    deletedBy: string;
    hard: boolean;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("pipeline_log").insert({
      note_type: "delete",
      granola_title: `Card removed via portal (${opts.deletedBy})`,
      matched_search_id: opts.searchUUID,
      matched_search_key: opts.searchKey,
      candidate_name_extracted: opts.candidateName,
      pipeline_status: opts.hard ? "hard-deleted" : "soft-deleted",
    });
    if (error) console.warn("[candidate-delete] pipeline_log warn:", error.message);
  } catch (e) {
    console.warn("[candidate-delete] pipeline_log warn:", (e as Error).message);
  }
}
