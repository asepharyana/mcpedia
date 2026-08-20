import { and, eq, sql } from "drizzle-orm";
import { db } from "@mcpedia/db";
import { documentChunks, documents } from "@mcpedia/db/schema";
import { CONTENT_ROOT } from "@mcpedia/config";
import { parseFile } from "@mcpedia/parser";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  Document,
  DocumentMeta,
} from "@mcpedia/types";
import { chunkText, embedChunks, createEmbeddingProvider } from "@mcpedia/embeddings";
import { readContentFile } from "./content.service";
import { toMeta } from "./row-map";

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

