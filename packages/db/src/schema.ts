import { sql, SQL } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
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

// Phase 2 (semantic search) — defined here for reference, NOT created yet:
// export const documentChunks = pgTable("document_chunks", {
//   id: text("id").primaryKey(),
//   documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
//   content: text("content").notNull(),
//   position: integer("position").notNull(),
//   embedding: customType<{ data: number[] }>({ dataType: () => "vector(1536)" })("embedding"),
// });

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
