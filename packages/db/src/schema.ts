import { sql, SQL } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// tsvector isn't a first-class drizzle type; wrap the raw Postgres type.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(), // slug
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    section: text("section").notNull(),
    status: text("status").notNull().default("published"),
    author: text("author").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    path: text("path").notNull(),
    body: text("body").notNull().default(""),
    // Weighted search vector: title (A) + body (B), using the 'simple' config so
    // mixed ID/EN queries match literally without stemming. Lazy closure over
    // `documents` (must NOT reference the table eagerly — it is in TDZ here).
    searchVector: tsvector("search_vector")
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`setweight(to_tsvector('simple', coalesce(${documents.title}, '')), 'A') || setweight(to_tsvector('simple', coalesce(${documents.body}, '')), 'B')`,
      ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    searchIdx: index("documents_search_idx").using("gin", t.searchVector),
    sectionIdx: index("documents_section_idx").on(t.section),
  }),
);

// Phase 2: semantic search chunks. Each row is an embedded slice of a document
// body. `embedding` is a plain float array (real[]). We compute cosine
// similarity in the application layer — pgvector isn't available on the shared
// imrnes Postgres, and brute-force cosine is instant for a KB-sized corpus.
// (pgvector/HNSW is the Phase-4 scale-out path.)
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: real("embedding").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: index("document_chunks_slug_idx").on(t.slug),
  }),
);

export type DocumentChunkRow = typeof documentChunks.$inferSelect;
export type NewDocumentChunkRow = typeof documentChunks.$inferInsert;

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
