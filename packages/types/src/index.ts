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
  // CTF writeup metadata (optional — only set for writeups)
  event?: string;
  challenge?: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
  // Dynamic custom frontmatter fields (serialized as-is to YAML frontmatter).
  // Allows content creators to add arbitrary metadata keys without code changes.
  extraFields?: Record<string, string>;
}

export interface Document extends DocumentMeta {
  body: string; // raw markdown (read from disk or stored)
}

export interface SearchHit {
  doc: DocumentMeta;
  rank: number;
  snippet: string;
}
