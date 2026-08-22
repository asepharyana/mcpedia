import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
} from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { timingSafeEqual } from "node:crypto";

// Web CRUD auth: either the x-webhook-secret header (API/MCP style) OR the
// mcpedia_admin cookie (web login). One of the two must be valid.
function isAuthorized(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return false;
  const headerSecret = req.headers.get("x-webhook-secret") ?? "";
  if (headerSecret) {
    const bufA = Buffer.from(headerSecret);
    const bufB = Buffer.from(WEBHOOK_SECRET);
    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      return true;
    }
  }
  const cookie = req.cookies.get("mcpedia_admin")?.value ?? "";
  return cookie.startsWith("admin.");
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

// Standard DocumentMeta field names — NOT custom fields.
const STANDARD_FIELDS = new Set([
  "slug", "title", "body", "section", "type", "status",
  "author", "tags", "createdAt", "updatedAt", "id", "path",
]);

function parseCustomValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed) && !(trimmed.startsWith("0") && trimmed.length > 1 && !trimmed.startsWith("0."))) {
      const num = Number(trimmed);
      if (!isNaN(num)) return num;
    }
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }
  return value;
}

/**
 * Separate a flat payload into standard CRUD fields + extraFields (custom metadata).
 * The DocForm sends all fields flat — any key not in STANDARD_FIELDS becomes an
 * entry in extraFields, which is stored as JSONB in the documents table.
 */
function splitPayload(body: Record<string, unknown>): {
  standard: Record<string, unknown>;
  extraFields: Record<string, unknown>;
} {
  const standard: Record<string, unknown> = {};
  const extraFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "extraFields" && typeof value === "object" && value !== null) {
      Object.assign(extraFields, value);
    } else if (STANDARD_FIELDS.has(key)) {
      standard[key] = value;
    } else if (value !== undefined && value !== null) {
      extraFields[key] = parseCustomValue(value);
    }
  }
  return { standard, extraFields };
}

// GET /api/docs — list all documents (for sidebar navigation).
export async function GET() {
  const docs = await listDocuments();
  return NextResponse.json(docs);
}

// POST /api/docs — Create a new document.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { standard, extraFields } = splitPayload(body);
    const doc = await createDocument({ ...standard, extraFields } as any);
    return NextResponse.json({ ok: true, slug: doc.slug, doc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
