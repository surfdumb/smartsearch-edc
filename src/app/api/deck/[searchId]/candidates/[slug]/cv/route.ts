import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/supabase";

// Persist the candidate's CV blob URL into candidates.cv_url so the database is
// the source of truth for whether a candidate has a CV. PUT on upload/replace,
// DELETE to clear. Keyed on (search_id UUID resolved from search_key,
// candidate_slug) — the same convention as the sibling criteria-visibility
// route. Fixture/Sheets decks have no candidates row, so the write is a no-op.
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

export async function PUT(
  request: Request,
  { params }: { params: { searchId: string; slug: string } }
): Promise<NextResponse> {
  try {
    const { searchId, slug } = params;
    const { url } = await request.json();

    if (!searchId || !slug) {
      return NextResponse.json({ error: "searchId and slug required" }, { status: 400 });
    }
    if (!SEARCH_KEY_RE.test(searchId) || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid searchId or slug" }, { status: 400 });
    }
    if (typeof url !== "string" || !url.startsWith("https://")) {
      return NextResponse.json({ error: "Valid url required" }, { status: 400 });
    }

    // Fixture/Sheets decks: no Supabase row to persist to — no-op, not an error.
    if (!SUPABASE_ENABLED) {
      return NextResponse.json({ persisted: false, reason: "supabase-disabled" });
    }

    const resolved = await resolveSearch(searchId);
    if (!resolved) {
      return NextResponse.json({ persisted: false, reason: "search-not-in-supabase" });
    }

    const { error } = await resolved.supabase
      .from("candidates")
      .update({ cv_url: url, updated_at: new Date().toISOString() })
      .eq("search_id", resolved.searchUUID)
      .eq("candidate_slug", slug);

    if (error) {
      console.error("[cv] persist failed:", searchId, slug, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[cv] persisted cv_url:", searchId, slug);
    return NextResponse.json({ persisted: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

    if (!SUPABASE_ENABLED) {
      return NextResponse.json({ persisted: false, reason: "supabase-disabled" });
    }

    const resolved = await resolveSearch(searchId);
    if (!resolved) {
      return NextResponse.json({ persisted: false, reason: "search-not-in-supabase" });
    }

    const { error } = await resolved.supabase
      .from("candidates")
      .update({ cv_url: null, updated_at: new Date().toISOString() })
      .eq("search_id", resolved.searchUUID)
      .eq("candidate_slug", slug);

    if (error) {
      console.error("[cv] clear failed:", searchId, slug, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[cv] cleared cv_url:", searchId, slug);
    return NextResponse.json({ persisted: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
