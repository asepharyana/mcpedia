import { NextRequest, NextResponse } from "next/server";
import { updateDocument, deleteDocument } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { timingSafeEqual } from "node:crypto";

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

const STANDARD_FIELDS = new Set([
  "title", "body", "type", "status",
  "author", "tags", "createdAt", "updatedAt", "id", "path", "slug",
]);

function splitPayload(body: Record<string, unknown>): {
  standard: Record<string, unknown>;
  extraFields: Record<string, unknown>;
} {
  const standard: Record<string, unknown> = {};
  const extraFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (STANDARD_FIELDS.has(key)) {
      standard[key] = value;
    } else if (value !== undefined && value !== null) {
      extraFields[key] = value;
    }
  }
  return { standard, extraFields };
}

// PUT /api/docs/{slug...} — Update an existing document.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  if (!isAuthorized(req)) return unauthorized();
  const { slug } = await params;
  const fullSlug = (slug ?? []).join("/");
  if (!fullSlug) {
    return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { standard, extraFields } = splitPayload(body);
    const doc = await updateDocument(fullSlug, { ...standard, extraFields } as any);
    return NextResponse.json({ ok: true, slug: doc.slug, doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

// DELETE /api/docs/{slug...}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  if (!isAuthorized(req)) return unauthorized();
  const { slug } = await params;
  const fullSlug = (slug ?? []).join("/");
  if (!fullSlug) {
    return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });
  }

  const result = await deleteDocument(fullSlug);
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
