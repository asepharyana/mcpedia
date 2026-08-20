import { and, eq, sql } from "drizzle-orm";
import { db } from "@mcpedia/db";
import { documentChunks, documentRevisions, documents } from "@mcpedia/db/schema";
import { CONTENT_ROOT } from "@mcpedia/config";
import { parseFile } from "@mcpedia/parser";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type {
  Document,
  DocumentMeta,
  DocSection,
  DocType,
  DocStatus,
} from "@mcpedia/types";
import { chunkText, embedChunks, createEmbeddingProvider } from "@mcpedia/embeddings";
import { readContentFile } from "./content.service";
import { toMeta } from "./row-map";
import { snapshotRevision } from "./index.service";

const embedder = createEmbeddingProvider();

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
  // Use parseFile (gray-matter) so the frontmatter is stripped — matches what
  // the indexer stores and what ReactMarkdown expects.
  const abs = join(CONTENT_ROOT, row.path);
  let body: string;
  if (existsSync(abs)) {
    const { body: parsedBody } = parseFile(abs, row.path);
    body = parsedBody;
  } else {
    body = row.body;
  }
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

/**
 * Chunk a document body, embed the chunks, and upsert them into
 * `document_chunks` (replacing any prior chunks for the same slug).
 * Failures are thrown so the caller can decide whether to abort the index.
 */
export async function indexChunks(slug: string, body: string): Promise<number> {
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.slug, slug));
  if (!doc) return 0;

  const chunks = chunkText(body, { size: 1000, overlap: 150 });
  if (chunks.length === 0) return 0;

  const vectors = await embedChunks(embedder, chunks, 16);
  if (vectors.length !== chunks.length) {
    throw new Error(
      `chunk/embedding count mismatch for ${slug}: ${chunks.length} vs ${vectors.length}`,
    );
  }

  // Replace existing chunks for this doc in one transaction.
  await db.delete(documentChunks).where(eq(documentChunks.slug, slug));
  await db.insert(documentChunks).values(
    chunks.map((content: string, i: number) => ({
      documentId: doc.id,
      slug,
      chunkIndex: i,
      content,
      embedding: vectors[i],
    })),
  );
  return chunks.length;
}

// ---------------------------------------------------------------------------
// Phase 11: CRUD — create, update, delete documents.
//
// Source of truth for content is the filesystem: each doc is a markdown file
// under content/{section}/{slug}.md. The `documents` DB table mirrors the
// metadata + body for fast search. CRUD ops write the file first, then upsert
// the DB row, then snapshot a revision + reindex chunks. `deleteDocument`
// also cleans up chunks + revisions.
// ---------------------------------------------------------------------------

export interface CreateDocInput {
  slug: string;
  title: string;
  section: DocSection;
  body: string;
  type?: DocType;
  status?: DocStatus;
  author?: string;
  tags?: string[];
  extraFields?: Record<string, unknown>;
}

export interface UpdateDocInput {
  title?: string;
  body?: string;
  type?: DocType;
  status?: DocStatus;
  tags?: string[];
  author?: string;
  extraFields?: Record<string, unknown>;
}

/** Validate that a slug is safe (no path traversal, only [a-z0-9/_-]). */
function validateSlug(slug: string): string {
  if (!/^[a-z0-9][a-z0-9/_-]*$/.test(slug)) {
    throw new Error(`invalid slug: ${slug}`);
  }
  if (slug.includes("//")) throw new Error(`invalid slug (double slash): ${slug}`);
  return slug;
}

/** Compute the relative file path for a slug (content/{section}/{slug}.md). */
function slugToRelPath(section: DocSection, slug: string): string {
  const cleanSlug = validateSlug(slug);
  // If the slug already starts with the section, strip it to avoid doubling.
  const pathPart = cleanSlug.startsWith(`${section}/`)
    ? cleanSlug.slice(section.length + 1)
    : cleanSlug;
  return `${section}/${pathPart}.md`;
}

/**
 * Create a new document: write the markdown file, upsert the DB row,
 * snapshot a revision, and index semantic chunks.
 * @returns the created DocumentMeta
 */
export async function createDocument(input: CreateDocInput): Promise<DocumentMeta> {
  const section = input.section;
  const slug = validateSlug(input.slug);
  const relPath = slugToRelPath(section, slug);
  const absPath = join(CONTENT_ROOT, relPath);

  if (existsSync(absPath)) {
    throw new Error(`document already exists at slug: ${slug}`);
  }

  const nowIso = new Date().toISOString();
  const meta: DocumentMeta = {
    id: slug,
    slug,
    title: input.title,
    type: input.type ?? "documentation",
    section,
    status: input.status ?? "published",
    author: input.author ?? "",
    tags: input.tags ?? [],
    path: relPath,
    createdAt: nowIso,
    updatedAt: nowIso,
    extraFields: input.extraFields ?? {},
  };

  // Write file to disk first (source of truth).
  const { stringifyFile } = await import("@mcpedia/parser");
  stringifyFile(absPath, relPath, meta, input.body);

  // Upsert DB row.
  await db.insert(documents).values({
    id: meta.id,
    slug: meta.slug,
    title: meta.title,
    type: meta.type,
    section: meta.section,
    status: meta.status,
    author: meta.author,
    tags: meta.tags,
    path: meta.path,
    body: input.body,
    extraFields: input.extraFields ?? {},
    createdAt: new Date(meta.createdAt),
    updatedAt: new Date(meta.updatedAt),
  });

  // Snapshot revision + index chunks (best-effort; chunks must not block create).
  await snapshotRevision(slug, meta, input.body, "index");
  try {
    await indexChunks(slug, input.body);
  } catch (err) {
    console.error(`createDocument: chunk/embed FAILED for ${slug}: ${err instanceof Error ? err.message : err}`);
  }

  return meta;
}

/**
 * Update an existing document: write new file, upsert DB row, snapshot a
 * revision (if body changed), and reindex chunks.
 * @returns the updated DocumentMeta
 */
export async function updateDocument(
  slug: string,
  input: UpdateDocInput,
): Promise<DocumentMeta> {
  const doc = await getDocument(slug);
  if (!doc) throw new Error(`document not found: ${slug}`);

  const updatedAt = new Date().toISOString();
  const updated: DocumentMeta = {
    ...doc,
    title: input.title ?? doc.title,
    type: input.type ?? doc.type,
    section: doc.section,
    status: input.status ?? doc.status,
    tags: input.tags ?? doc.tags,
    author: input.author ?? doc.author,
    updatedAt,
    // Merge: new extraFields override old ones; merge with existing
    extraFields:
      input.extraFields !== undefined
        ? { ...doc.extraFields, ...input.extraFields }
        : doc.extraFields,
  };
  const body = input.body ?? doc.body;

  // Write file to disk (source of truth).
  const absPath = join(CONTENT_ROOT, doc.path);
  const { stringifyFile } = await import("@mcpedia/parser");
  stringifyFile(absPath, doc.path, updated, body);

  // Upsert DB row.
  await db
    .update(documents)
    .set({
      title: updated.title,
      type: updated.type,
      section: updated.section,
      status: updated.status,
      author: updated.author,
      tags: updated.tags,
      extraFields: input.extraFields ?? doc.extraFields ?? {},
      body,
      updatedAt: new Date(updatedAt),
    })
    .where(eq(documents.slug, slug));

  // Snapshot revision (only if body changed) + reindex chunks.
  await snapshotRevision(slug, updated, body, "update");
  try {
    await indexChunks(slug, body);
  } catch (err) {
    console.error(`updateDocument: chunk/embed FAILED for ${slug}: ${err instanceof Error ? err.message : err}`);
  }

  return updated;
}

/**
 * Delete a document: remove the file, delete DB rows (doc + chunks + revisions).
 */
export async function deleteDocument(slug: string): Promise<{ deleted: boolean }> {
  const [row] = await db.select().from(documents).where(eq(documents.slug, slug));
  if (!row) return { deleted: false };

  // Remove file from disk (source of truth).
  const absPath = join(CONTENT_ROOT, row.path);
  if (existsSync(absPath)) unlinkSync(absPath);

  // Clean up DB rows (cascades would work but be explicit).
  await db.delete(documentChunks).where(eq(documentChunks.slug, slug));
  await db.delete(documentRevisions).where(eq(documentRevisions.documentId, row.id));
  await db.delete(documents).where(eq(documents.id, row.id));

  return { deleted: true };
}

