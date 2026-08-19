import { db } from "@mcpedia/db";
import { documents, documentRevisions, documentChunks } from "@mcpedia/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { toMeta } from "./row-map";
import type { DocumentMeta } from "@mcpedia/types";

export interface RevisionSummary {
  id: string;
  slug: string;
  revisionNo: number;
  title: string;
  reason: string;
  createdAt: string;
  bodyLength: number;
}

/** List revisions for a slug, newest first. */
export async function listRevisions(
  slug: string,
  limit = 20,
): Promise<RevisionSummary[]> {
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.slug, slug));
  if (!doc) return [];

  const rows = await db
    .select({
      id: documentRevisions.id,
      slug: documentRevisions.slug,
      revisionNo: documentRevisions.revisionNo,
      title: documentRevisions.title,
      reason: documentRevisions.reason,
      createdAt: documentRevisions.createdAt,
      bodyLength: sql<number>`length(${documentRevisions.body})`,
    })
    .from(documentRevisions)
    .where(eq(documentRevisions.documentId, doc.id))
    .orderBy(desc(documentRevisions.revisionNo))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    revisionNo: r.revisionNo,
    title: r.title,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
    bodyLength: r.bodyLength,
  }));
}

/** Fetch a single revision's full body. */
export async function getRevision(
  id: string,
): Promise<{ id: string; revisionNo: number; body: string; meta: unknown } | null> {
  const [row] = await db
    .select({
      id: documentRevisions.id,
      revisionNo: documentRevisions.revisionNo,
      body: documentRevisions.body,
      meta: documentRevisions.meta,
    })
    .from(documentRevisions)
    .where(eq(documentRevisions.id, id));
  if (!row) return null;
  return {
    id: row.id,
    revisionNo: row.revisionNo,
    body: row.body,
    meta: row.meta,
  };
}

/** Restore a revision: write its body+metadata back into the live `documents` row. */
export async function restoreRevision(
  id: string,
): Promise<{ slug: string; documentId: string } | null> {
  const [rev] = await db
    .select({
      id: documentRevisions.id,
      documentId: documentRevisions.documentId,
      slug: documentRevisions.slug,
      title: documentRevisions.title,
      body: documentRevisions.body,
      meta: documentRevisions.meta,
    })
    .from(documentRevisions)
    .where(eq(documentRevisions.id, id));
  if (!rev) return null;

  const m = rev.meta as {
    type?: string;
    section?: string;
    status?: string;
    author?: string;
    tags?: string[];
  };

  await db
    .update(documents)
    .set({
      title: rev.title,
      type: (m.type as any) ?? "documentation",
      section: (m.section as any) ?? "docs",
      status: (m.status as any) ?? "published",
      author: m.author ?? "",
      tags: m.tags ?? [],
      body: rev.body,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, rev.documentId));

  return { slug: rev.slug, documentId: rev.documentId };
}
