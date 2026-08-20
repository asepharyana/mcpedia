import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
} from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { timingSafeEqual } from "node:crypto";

// Web CRUD auth: either the `x-webhook-secret` header (API/MCP style) OR the
// `mcpedia_admin` cookie (web login). One of the two must be present + valid.
function isAuthorized(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return false;
  const headerSecret = req.headers.get("x-webhook-secret") ?? "";
  if (headerSecret && timingSafeEqual(Buffer.from(headerSecret), Buffer.from(WEBHOOK_SECRET))) {
    return true;
  }
  const cookie = req.cookies.get("mcpedia_admin")?.value ?? "";
  return cookie.startsWith("admin.");
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

// POST /api/docs — Create a new document.
// Body: { slug, title, section, body, type?, status?, author?, tags? }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status:400 });
  }

  try {
    const doc = await createDocument(body);
    return NextResponse.json({ ok: true, slug: doc.slug, doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
