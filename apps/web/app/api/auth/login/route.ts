import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSWORD } from "@mcpedia/config";
import { createHmac, timingSafeEqual } from "node:crypto";

// POST /api/auth/login — verify admin password, set a signed cookie.
// Uses a simple HMAC cookie (no JWT library) — sufficient for a single-admin KB.
const COOKIE_NAME = "mcpedia_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function signCookie(value: string): string {
  const secret = ADMIN_PASSWORD || "fallback";
  const sig = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${sig}`;
}

function verifyCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [value, sig] = cookieValue.split(".");
  if (!value || !sig) return false;
  const expected = signCookie(value);
  return timingSafeEqual(
    Buffer.from(cookieValue),
    Buffer.from(expected),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (!ADMIN_PASSWORD || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ok = timingSafeEqual(
    Buffer.from(password),
    Buffer.from(ADMIN_PASSWORD),
  );

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cookie = signCookie("admin");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookie, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// GET /api/auth/login — returns 200 if currently authenticated, 401 otherwise.
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (verifyCookie(cookie)) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 401 });
}

// DELETE /api/auth/login — clear the cookie (logout).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: COOKIE_NAME, path: "/" });
  return res;
}

// Exported for server components to call directly.
export function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return verifyCookie(cookie);
}
