import matter from "gray-matter";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
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

/**
 * Serialize document metadata + body back to a markdown file with YAML
 * frontmatter. The file is written to `absPath`, creating parent dirs as needed.
 * The `relPath` is stored in frontmatter as `path` so the file is round-trip
 * stable (parseFile → stringifyFile → parseFile yields the same meta+body).
 *
 * @param absPath absolute path on disk
 * @param relPath path relative to content root (e.g. "docs/my/doc.md")
 * @param meta    document metadata
 * @param body    markdown body (frontmatter stripped — same as parseFile.body)
 */
export function stringifyFile(
  absPath: string,
  relPath: string,
  meta: DocumentMeta,
  body: string,
): void {
  const data: Record<string, unknown> = {
    title: meta.title,
    type: meta.type,
    section: meta.section,
    status: meta.status,
    author: meta.author,
    tags: meta.tags,
    path: relPath,
    created_at: meta.createdAt,
    updated_at: meta.updatedAt,
  };
  const yaml = "---\n" +
    Object.entries(data)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
        }
        if (typeof v === "string") {
          return `${k}: ${JSON.stringify(v)}`;
        }
        return `${k}: ${v}`;
      })
      .join("\n") +
    "\n---\n";
  const content = yaml + body;
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
}
