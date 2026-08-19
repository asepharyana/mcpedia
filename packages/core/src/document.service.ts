import { and, eq, sql } from "drizzle-orm";
import { db } from "@mcpedia/db";
import { documents } from "@mcpedia/db/schema";
import { CONTENT_ROOT } from "@mcpedia/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Document,
  DocumentMeta,
} from "@mcpedia/types";
import { readContentFile } from "./content.service";
import { toMeta } from "./row-map";

export async function listDocuments(opts: {
  section?: string;
  status?: string;
} = {}): Promise<DocumentMeta[]> {
  const status = opts.status ?? "published";
  const where = [eq(documents.status, status)];
  if (opts.section) where.push(eq(documents.section, opts.section));
  const rows = await db
    .select()
    .from(documents)
    .where(and(...where))
    .orderBy(documents.updatedAt);
  return rows.map(toMeta);
}

export async function getDocument(slug: string): Promise<Document | null> {
  const [row] = await db.select().from(documents).where(eq(documents.slug, slug));
  if (!row) return null;
  // Prefer the on-disk file (source of truth); fall back to stored body.
  const abs = join(CONTENT_ROOT, row.path);
  const body = existsSync(abs) ? readFileSync(abs, "utf8") : row.body;
  return { ...toMeta(row), body };
}

export async function getRelated(slug: string, limit = 5): Promise<DocumentMeta[]> {
  const [row] = await db
    .select({ tags: documents.tags })
    .from(documents)
    .where(eq(documents.slug, slug));
  if (!row || row.tags.length === 0) return [];
  // Build a text[] array literal for the && (overlap) operator, binding each
  // tag as a parameter to avoid SQL injection from frontmatter content.
  const arrLit = sql`ARRAY[${sql.join(
    row.tags.map((t) => sql.param(t)),
    sql`, `,
  )}]::text[]`;
  const related = await db
    .select()
    .from(documents)
    .where(and(eq(documents.status, "published"), sql`${documents.tags} && ${arrLit}`))
    .limit(limit + 1);
  return related.filter((d) => d.slug !== slug).map(toMeta).slice(0, limit);
}

export { readContentFile };
