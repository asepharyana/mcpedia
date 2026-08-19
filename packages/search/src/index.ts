import { db } from "@mcpedia/db";
import { documents, type DocumentRow } from "@mcpedia/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type {
  DocSection,
  DocStatus,
  DocType,
  DocumentMeta,
  SearchHit,
} from "@mcpedia/types";

const VALID_SECTIONS: DocSection[] = ["docs", "writeups", "research", "notes"];
const VALID_TYPES: DocType[] = ["documentation", "writeup", "research", "note"];

/** Map a Drizzle row (text columns, Date timestamps) into the strict types. */
function toMeta(row: DocumentRow): DocumentMeta {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: (VALID_TYPES.includes(row.type as DocType) ? row.type : "documentation") as DocType,
    section: (VALID_SECTIONS.includes(row.section as DocSection)
      ? row.section
      : "docs") as DocSection,
    status: (row.status === "draft" ? "draft" : "published") as DocStatus,
    author: row.author,
    tags: row.tags,
    path: row.path,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Build a prefix tsquery from free text (AND of terms, each as prefix). */
export function toTsQuery(q: string): string {
  const terms = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[^a-zA-Z0-9_]/g, ""))
    .filter(Boolean);
  if (terms.length === 0) return "";
  return terms.map((t) => `${t}:*`).join(" & ");
}

/**
 * Postgres FTS keyword search over published documents.
 * Ranks by ts_rank and returns a headline snippet for display.
 */
export async function keywordSearch(q: string, limit = 20): Promise<SearchHit[]> {
  const query = toTsQuery(q);
  if (!query) return [];

  const rows = await db
    .select({
      doc: documents,
      rank: sql<number>`ts_rank(${documents.searchVector}, to_tsquery('simple', ${query}))`,
      snippet: sql<string>`ts_headline('simple', ${documents.body}, to_tsquery('simple', ${query}), 'MaxWords=25, MinWords=5, StartSel=<mark>, StopSel=</mark>')`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.status, "published"),
        sql`${documents.searchVector} @@ to_tsquery('simple', ${query})`,
      ),
    )
    .orderBy(
      sql`ts_rank(${documents.searchVector}, to_tsquery('simple', ${query})) desc`,
    )
    .limit(limit);

  return rows.map((r) => ({
    doc: toMeta(r.doc),
    rank: r.rank,
    snippet: r.snippet,
  }));
}

export { toMeta };
