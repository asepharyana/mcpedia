import matter from "gray-matter";
import { readFileSync } from "node:fs";
import type {
  DocSection,
  DocStatus,
  DocType,
  DocumentMeta,
} from "@mcpedia/types";

const SECTIONS: DocSection[] = ["docs", "writeups", "research", "notes"];

const VALID_TYPES: DocType[] = [
  "documentation",
  "writeup",
  "research",
  "note",
];

export interface ParsedFile {
  meta: DocumentMeta;
  body: string;
}

/**
 * Parse a content markdown file into metadata + body.
 * @param absPath absolute path on disk
 * @param relPath path relative to content root (e.g. "docs/websocket/contract.md")
 */
export function parseFile(absPath: string, relPath: string): ParsedFile {
  const raw = readFileSync(absPath, "utf8");
  const { data, content } = matter(raw);

  const section: DocSection =
    (SECTIONS.find((s) => relPath.startsWith(s + "/")) as DocSection | undefined) ??
    "docs";

  const slug = relPath.replace(/\.mdx?$/, "");

  const type = (VALID_TYPES.includes(data.type) ? data.type : "documentation") as DocType;
  const status = (data.status === "draft" ? "draft" : "published") as DocStatus;

  const tags: string[] = Array.isArray(data.tags)
    ? data.tags.map((t: unknown) => String(t))
    : [];

  const nowIso = new Date().toISOString();
  const createdAt = data.created_at ?? nowIso;
  const updatedAt = data.updated_at ?? data.created_at ?? nowIso;

  const meta: DocumentMeta = {
    id: slug,
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    type,
    section,
    status,
    author: typeof data.author === "string" ? data.author : "",
    tags,
    path: relPath,
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };

  return { meta, body: content };
}
