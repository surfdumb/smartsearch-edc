import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

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
