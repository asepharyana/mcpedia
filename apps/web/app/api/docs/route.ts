import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
} from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { createHmac, timingSafeEqual } from "node:crypto";

// POST /api/docs
// Create a new document.
// Body: { slug, title, section, body, type?, status?, author?, tags? }
// Auth: x-webhook-secret header matching WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET not configured" }, { status: 500 });
  }
  const provided = req.headers.get("x-webhook-secret");
  if (!provided || !timingSafeEqual(Buffer.from(provided), Buffer.from(WEBHOOK_SECRET))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const doc = await createDocument(body);
    return NextResponse.json({ ok: true, slug: doc.slug, doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

// PUT /api/docs/{slug}
// Update an existing document.
// Body: { title?, body?, type?, status?, tags?, author? }
export async function PUT(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET not configured" }, { status: 500 });
  }
  const provided = req.headers.get("x-webhook-secret");
  if (!provided || !timingSafeEqual(Buffer.from(provided), Buffer.from(WEBHOOK_SECRET))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Extract slug from URL path: /api/docs/{slug}
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = parts[2]; // ["api", "docs", "...slugParts"]
  if (!slug || slug === "docs") {
    return NextResponse.json({ ok: false, error: "slug required in path" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Reconstruct the full slug from path segments
    const fullSlug = parts.slice(2).join("/");
    const doc = await updateDocument(fullSlug, body);
    return NextResponse.json({ ok: true, slug: doc.slug, doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

// DELETE /api/docs/{slug}
export async function DELETE(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_SECRET not configured" }, { status: 500 });
  }
  const provided = req.headers.get("x-webhook-secret");
  if (!provided || !timingSafeEqual(Buffer.from(provided), Buffer.from(WEBHOOK_SECRET))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = parts.slice(2).join("/");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug required in path" }, { status: 400 });
  }

  const result = await deleteDocument(slug);
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
