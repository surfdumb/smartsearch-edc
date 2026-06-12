import { NextResponse } from "next/server";
import { SEARCHROOM_COOKIE, checkSearchRoomPassword, signSearchRoomToken } from "@/lib/searchroomAccess";

// POST /api/searchroom/auth — exchange the internal password for a signed,
// httpOnly session cookie that gates /searchroom + /api/searchroom/data.
// DELETE — sign out (clear the cookie).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* empty / malformed body → treat as wrong password */
  }

  if (!checkSearchRoomPassword(password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let token: string;
  try {
    token = await signSearchRoomToken();
  } catch {
    // EDC_COOKIE_SECRET not configured — can't issue a session.
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SEARCHROOM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h, matches the token expiry
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SEARCHROOM_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
