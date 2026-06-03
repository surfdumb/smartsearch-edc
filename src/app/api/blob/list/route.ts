import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix");

  if (!prefix) {
    return NextResponse.json({ error: "prefix is required" }, { status: 400 });
  }

  if (!prefix.startsWith("cv/") && !prefix.startsWith("job-summary/") && !prefix.startsWith("photos/")) {
    return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
  }

  try {
    // Paginate via cursor so a prefix with more entries than one page
    // (1000) isn't silently truncated — a truncated list would make a CV
    // appear to not exist (the silent-vanish bug class this guards against).
    const all: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
    let cursor: string | undefined;
    do {
      const res = await list({ prefix, cursor });
      for (const b of res.blobs) {
        all.push({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt });
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);

    return NextResponse.json({ blobs: all });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
