import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

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
    const { blobs } = await list({ prefix });
    return NextResponse.json({
      blobs: blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
