import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { searchId: string } }
): Promise<NextResponse> {
  try {
    const { order } = await request.json();
    const { searchId } = params;

    if (!searchId || !Array.isArray(order)) {
      return NextResponse.json({ error: "searchId and order array required" }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/i.test(searchId)) {
      return NextResponse.json({ error: "Invalid searchId" }, { status: 400 });
    }

    const pathname = `deck-config/${searchId}/card-order.json`;
    const blob = await put(pathname, JSON.stringify(order), {
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
