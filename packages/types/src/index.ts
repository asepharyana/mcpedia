export type DocSection = string;
export type DocType = string;
export type DocStatus = "published" | "draft" | string;

export interface SectionInfo {
  id: string;
  label: string;
  icon: string;
  desc: string;
  docCount: number;
  updatedAt?: string;
}

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
  [key: string]: unknown;
}

export interface Document extends DocumentMeta {
  body: string; // markdown body
}

export interface SearchHit {
  doc: DocumentMeta;
  rank: number;
  snippet: string;
}

