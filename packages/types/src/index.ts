export type DocSection = "docs" | "writeups" | "research" | "notes";
export type DocType = "documentation" | "writeup" | "research" | "note";
export type DocStatus = "published" | "draft";

export interface DocumentMeta {
  id: string; // slug
  slug: string;
  title: string;
  type: DocType;
  section: DocSection;
  status: DocStatus;
  author: string;
  tags: string[];
  path: string; // relative path under content/
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // Dynamic custom frontmatter fields (e.g. CTF: event, challenge, category,
  // difficulty, points). Content creators add arbitrary key-value pairs.
  // Values can be strings, numbers, booleans, arrays, or objects.
  extraFields?: Record<string, unknown>;
}

export interface Document extends DocumentMeta {
  body: string; // raw markdown (read from disk or stored)
}

export interface SearchHit {
  doc: DocumentMeta;
  rank: number;
  snippet: string;
}
