# MCPedia Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement task-by-task. Phase 1 tasks are bite-sized and ready to execute; Phases 2–4 are outlines to expand later.

**Goal:** Turn the fresh `create-next-app` Next.js 16 repo into the MCPedia knowledge base — Git/Markdown content, a Core business-logic layer shared by a Next.js Web UI and an MCP server for AI agents, with content metadata in Postgres (FTS search), and an architecture that can grow to semantic search, a tRPC API, auth, and async indexing without rewrites.

**Architecture:** Monorepo (bun workspaces + Turborepo). Content lives as Markdown in `content/` (Git-managed, human-readable). `packages/core` holds all business logic (Document/Content/Search services). Web (`apps/web`) and MCP (`apps/mcp`) both consume Core — no DB access outside Core. Postgres (imrnes `:6432`) stores document metadata + a `tsvector` for keyword search. Phase 1 ships keyword search only; pgvector/semantic, tRPC/Hono API, auth, and BullMQ are later phases behind clean seams already present in Core.

**Tech Stack (resolved forks):**
- Package manager / monorepo: **bun workspaces + Turborepo** (honor existing repo; NOT pnpm — user decision).
- DB: **imrnes Postgres `100.121.180.82:6432`** for both dev and deploy (PgBouncer transaction pool → set `prepare: false` on the driver).
- Phase 1 scope: **Core + Web + MCP + Postgres FTS only**. tRPC/Hono API, pgvector, auth, Redis/BullMQ deferred.

---

## Environment & preconditions (read first)

- Repo is currently a flat Next.js 16 app, **not git-initialized**, bun-managed (`packageManager: bun@1.3.14`, `bun.lock` present).
- `app/` has only `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`. Tailwind v4 (`@tailwindcss/postcss`).
- Next.js 16 is "NOT the Next.js you know" (see `AGENTS.md`): **before writing any `apps/web` code, read `node_modules/next/dist/docs/`** (app router, server components, route handlers) for breaking changes. Treat deprecation notices as authoritative.
- For every library API used (Next 16, Drizzle, `@modelcontextprotocol/sdk`, gray-matter) **resolve + query Context7** before coding — do not trust training data.
- Secrets: `DATABASE_URL` lives in **BWS project `orangevps`** (never committed). Local dev reads it from a gitignored `.env` at repo root.
- Seed DB creds: a dedicated `mcpedia` database/user on imrnes; create via `bws` secret or operator. `pgvector` extension is **NOT** required until Phase 2.

---

## Phase 0 — Repo restructure (monorepo scaffold)

### Task 0.1: Initialize git + baseline commit
- **Files:** `.gitignore` (already exists; ensure `.env`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `dist/` ignored).
- **Step:** `git init && git add -A && git commit -m "chore: baseline create-next-app scaffold"` (author = asepharyana, no Co-Authored-By).
- **Verify:** `git log --oneline -1` shows the commit.

### Task 0.2: Root workspace package.json + Turbo
- **Modify:** `package.json` (root) — strip app deps, add workspaces + turbo scripts.
- **Create:** `turbo.json`, `tsconfig.base.json`.
- Root `package.json` becomes:
```json
{
  "name": "mcpedia",
  "version": "0.1.0",
  "private": true,
  "packageManager": "bun@1.3.14",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "index": "bun run scripts/indexer.ts"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5",
    "prettier": "^3"
  }
}
```
- `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```
- **Verify:** `bun install` succeeds; `bunx turbo --version` prints a version.

### Task 0.3: Move Web app into `apps/web`
- **Move:** `app/`, `public/`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json` → `apps/web/` (rename root `app` → `apps/web/app`). Keep Tailwind v4. Add `apps/web/package.json`:
```json
{
  "name": "@mcpedia/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.3.1",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "@mcpedia/core": "workspace:*",
    "@mcpedia/config": "workspace:*"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```
- Add `apps/web/tsconfig.json` extending `../../tsconfig.base.json` with `@/*` → `./**/*` and `@mcpedia/*` workspace aliases.
- **Verify:** `cd apps/web && bun install && bun run build` compiles (may warn about empty content — fine).

### Task 0.4: `.env` (gitignored) for dev
- **Create:** `.env` (gitignored) with `DATABASE_URL=postgresql://<user>:<pass>@100.121.180.82:6432/mcpedia` (value from BWS; `prepare:false` enforced in db client). Add `.env.example` (committed, placeholder only).

---

## Phase 1 — MVP: Core + Web + MCP + Postgres FTS (detailed)

### Task 1.1: `packages/types`
- **Create:** `packages/types/package.json` (`@mcpedia/types`, exports `src/index.ts`), `packages/types/src/index.ts`:
```ts
export type DocSection = "docs" | "writeups" | "research" | "notes";
export type DocType = "documentation" | "writeup" | "research" | "note";
export type DocStatus = "published" | "draft";

export interface DocumentMeta {
  id: string;            // slug
  slug: string;
  title: string;
  type: DocType;
  section: DocSection;
  status: DocStatus;
  author: string;
  tags: string[];
  path: string;          // relative path under content/
  createdAt: string;
  updatedAt: string;
}

export interface Document extends DocumentMeta {
  body: string;          // raw markdown (read from disk or stored)
}

export interface SearchHit {
  doc: DocumentMeta;
  rank: number;
  snippet: string;
}
```
- **Verify:** `bunx tsc --noEmit` in package passes.

### Task 1.2: `packages/config`
- **Create:** `packages/config/package.json` (`@mcpedia/config`), `packages/config/src/index.ts`:
```ts
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const CONTENT_ROOT = process.env.CONTENT_ROOT
  ?? resolve(root, "content");
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
```
- **Verify:** import in a scratch `bun -e` prints a path.

### Task 1.3: `packages/db` (Drizzle + Postgres, FTS)
- **Create:** `packages/db/package.json` (`@mcpedia/db`, deps `drizzle-orm`, `postgres`; dev `drizzle-kit`), `packages/db/src/schema.ts`:
```ts
import { sql } from "drizzle-orm";
import { text, timestamp, integer, index, customType } from "drizzle-orm/pg-core";

// tsvector isn't a first-class drizzle type; wrap raw.
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),         // slug
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  section: text("section").notNull(),
  status: text("status").notNull().default("published"),
  author: text("author").notNull().default(""),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  path: text("path").notNull(),
  body: text("body").notNull().default(""),
  searchVector: customType<{ data: string }>({
    dataType() { return "tsvector"; },
  })("search_vector")
    .generatedAlwaysAs(sql`to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,''))`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => ({
  searchIdx: index("documents_search_idx").using("gin", t.searchVector),
}));
```
  NOTE: `document_chunks` + `embedding vector` are **Phase 2** — do NOT add now.
- **Create:** `packages/db/src/client.ts` — postgres-js with `prepare: false` (PgBouncer safe):
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "@mcpedia/config";
import * as schema from "./schema";

const client = postgres(DATABASE_URL, { prepare: false, max: 5 });
export const db = drizzle(client, { schema });
export { schema };
```
- **Create:** `packages/db/drizzle.config.ts` (dialect `postgresql`, schema `./src/schema.ts`, out `./drizzle`).
- **Verify:** `bunx drizzle-kit generate` produces a migration; `bunx drizzle-kit push` applies it to imrnes (operator supplies DATABASE_URL). `bunx drizzle-kit studio` optional.

### Task 1.4: `packages/parser` (frontmatter)
- **Create:** `packages/parser/package.json` (`@mcpedia/parser`, dep `gray-matter`), `packages/parser/src/index.ts`:
```ts
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import type { DocSection, DocType, DocStatus, DocumentMeta } from "@mcpedia/types";

const SECTIONS: DocSection[] = ["docs", "writeups", "research", "notes"];

export function parseFile(absPath: string, relPath: string): { meta: DocumentMeta; body: string } {
  const raw = readFileSync(absPath, "utf8");
  const { data, content } = matter(raw);
  const section = SECTIONS.find((s) => relPath.startsWith(s + "/")) ?? "docs";
  const slug = relPath.replace(/\.mdx?$/, "");
  const meta: DocumentMeta = {
    id: slug,
    slug,
    title: data.title ?? slug,
    type: (data.type ?? "documentation") as DocType,
    section,
    status: (data.status ?? "published") as DocStatus,
    author: data.author ?? "",
    tags: Array.isArray(data.tags) ? dataAtags : [],
    path: relPath,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? data.created_at ?? new Date().toISOString(),
  };
  return { meta, body: content };
}
```
  (fix the obvious `dataAtags` typo to `data.tags` when implementing.)
- **Verify:** unit test parsing a sample frontmatter → asserts `slug`, `section`, `tags`.

### Task 1.5: `packages/search` (FTS query)
- **Create:** `packages/search/package.json` (`@mcpedia/search`, dep `@mcpedia/db`, `@mcpedia/types`), `packages/search/src/index.ts`:
```ts
import { db } from "@mcpedia/db";
import { documents } from "@mcpedia/db/schema";
import { sql, and, eq } from "drizzle-orm";
import type { SearchHit } from "@mcpedia/types";

export function toTsQuery(q: string): string {
  // plainto_tsquery-style: AND the terms, escape punctuation.
  const terms = q.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""));
  return terms.map((t) => `${t}:*`).join(" & ");
}

export async function keywordSearch(q: string, limit = 20): Promise<SearchHit[]> {
  const query = toTsQuery(q);
  if (!query) return [];
  const rows = await db
    .select({
      doc: documents,
      rank: sql<number>`ts_rank(${documents.searchVector}, to_tsquery('simple', ${query}))`,
      snippet: sql<string>`ts_headline('simple', ${documents.body}, to_tsquery('simple', ${query}), 'MaxWords=20, MinWords=5')`,
    })
    .from(documents)
    .where(and(eq(documents.status, "published"), sql`${documents.searchVector} @@ to_tsquery('simple', ${query})`))
    .orderBy(sql`ts_rank(${documents.searchVector}, to_tsquery('simple', ${query})) desc`)
    .limit(limit);
  return rows.map((r) => ({ doc: r.doc, rank: r.rank, snippet: r.snippet }));
}
```
- **Verify:** after seeding, `keywordSearch("websocket")` returns hits.

### Task 1.6: `packages/core` (services)
- **Create:** `packages/core/package.json` (`@mcpedia/core`, deps `@mcpedia/db`, `@mcpedia/parser`, `@mcpedia/search`, `@mcpedia/config`, `@mcpedia/types`), `packages/core/src/`:
  - `content.service.ts` — read markdown from `CONTENT_ROOT` by slug/section; list files via `fast-glob`.
  - `document.service.ts` — `listDocuments(section?, type?, status?)`, `getDocument(slug)` (DB meta + disk body), `getRelated(slug)` (shared tags, later vector).
  - `search.service.ts` — wraps `keywordSearch`.
  - `index.ts` — re-export services + types.
```ts
// document.service.ts (sketch)
import { db } from "@mcpedia/db";
import { documents } from "@mcpedia/db/schema";
import { eq, and } from "drizzle-orm";
import { CONTENT_ROOT } from "@mcpedia/config";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Document, DocumentMeta } from "@mcpedia/types";

export async function listDocuments(opts: { section?: string; status?: string } = {}): Promise<DocumentMeta[]> {
  const where = [eq(documents.status, opts.status ?? "published")];
  if (opts.section) where.push(eq(documents.section, opts.section));
  return db.select().from(documents).where(and(...where));
}

export async function getDocument(slug: string): Promise<Document | null> {
  const [meta] = await db.select().from(documents).where(eq(documents.slug, slug));
  if (!meta) return null;
  const abs = resolve(CONTENT_ROOT, meta.path);
  const body = existsSync(abs) ? readFileSync(abs, "utf8") : meta.body;
  return { ...meta, body };
}
```
- **Verify:** `bunx tsc --noEmit` passes across packages.

### Task 1.7: `scripts/indexer.ts` (walk content → upsert)
- **Create:** `scripts/indexer.ts` — walk `CONTENT_ROOT` (`**/*.{md,mdx}`), `parseFile`, upsert into `documents` (slug PK; `onConflictDoUpdate` title/tags/body/updatedAt). Logs count.
```ts
import { db } from "@mcpedia/db";
import { documents } from "@mcpedia/db/schema";
import { parseFile } from "@mcpedia/parser";
import { CONTENT_ROOT } from "@mcpedia/config";
import { walk } from "fast-glob";
import { resolve } from "node:path";

const files = await glob("**/*.{md,mdx}", { cwd: CONTENT_ROOT, absolute: true });
let n = 0;
for (const abs of files) {
  const rel = resolve(CONTENT_ROOT, abs).replace(CONTENT_ROOT + "/", "");
  const { meta, body } = parseFile(abs, rel);
  await db.insert(documents).values({ ...meta, body })
    .onConflictDoUpdate({ target: documents.slug, set: { title: meta.title, tags: meta.tags, body, updatedAt: new Date().toISOString() } });
  n++;
}
console.log(`indexed ${n} documents`);
```
- **Verify:** `bun run index` prints `indexed N documents`; `psql`/`drizzle-kit studio` shows rows + non-empty `search_vector`.

### Task 1.8: Seed content
- **Create:** `content/docs/websocket/contract.md`, `content/writeups/debugging/websocket-timeout.md`, `content/research/mcp/architecture.md`, `content/notes/typescript/patterns.md` with the spec's frontmatter shape (id/title/type/tags/status/author/created_at/updated_at). Add 2–3 short paragraphs each so FTS has text.
- **Verify:** `bun run index` ingests them; `keywordSearch("websocket")` returns ≥2 hits.

### Task 1.9: `apps/web` — pages (Next 16, read `node_modules/next/dist/docs` first)
- **Read** Node_modules Next 16 docs (app router, server components, route handlers) — mandatory.
- **Create:**
  - `apps/web/app/page.tsx` — home: list sections + recent docs (server component calling `listDocuments`).
  - `apps/web/app/(docs)/[...slug]/page.tsx` — document view: `getDocument(slug)`, render markdown (Phase 1: simple `dangerouslySetInnerHTML` of a remark→HTML, or raw pre with Shiki later; keep minimal but legible).
  - `apps/web/app/search/page.tsx` — search box → `keywordSearch`, render hits + snippets.
  - Keep Tailwind v4 styling minimal but clean (no shadcn yet — Phase 2 polish).
- **Verify:** `bun run build` (apps/web) passes; `bun run dev` then `curl -s localhost:3000/` and `/search?q=websocket` return rendered HTML.

### Task 1.10: `apps/mcp` — MCP server
- **Create:** `apps/mcp/package.json` (`@mcpedia/mcp`, deps `@modelcontextprotocol/sdk`, `zod`, `@mcpedia/core`), `apps/mcp/src/index.ts`:
```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listDocuments, getDocument } from "@mcpedia/core";
import { keywordSearch } from "@mcpedia/search";

const server = new McpServer({ name: "mcpedia", version: "0.1.0" });

server.tool("search_documents", { query: z.string(), limit: z.number().optional() },
  async ({ query, limit }) => {
    const hits = await keywordSearch(query, limit ?? 20);
    return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
  });

server.tool("get_document", { slug: z.string() },
  async ({ slug }) => {
    const doc = await getDocument(slug);
    return doc ? { content: [{ type: "text", text: doc.body }] }
               : { content: [{ type: "text", text: "not found" }], isError: true };
  });

server.tool("list_documents", { section: z.string().optional() },
  async ({ section }) => {
    const docs = await listDocuments({ section });
    return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
  });

// Resource: mcpedia://<section>/<path>
server.resource("doc", "mcpedia://", async (uri) => {
  const slug = uri.path.replace(/^\//, "");
  const doc = await getDocument(slug);
  return { contents: [{ uri: uri.href, text: doc?.body ?? "" }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```
  (Exact SDK method names verified via Context7 before coding.)
- **Create:** `apps/mcp/bin` or `bun run` entry; add `"start": "bun run src/index.ts"` to its package.json.
- **Verify:** smoke test via `scripts/mcp-smoke.ts` that imports the tool handlers and calls `search_documents({query:"websocket"})` → asserts ≥1 hit. (Running a real stdio client in CI is optional; inspector `@modelcontextprotocol/inspector` for manual check.)

### Task 1.11: Cross-package verification
- **Run:** `bun install` (root) → `bunx turbo run lint` → `bunx turbo run build` → `bunx turbo run typecheck`. All green.
- **Run:** `bun run index` then `bun run scripts/mcp-smoke.ts`.
- **Verify:** no package imports `pg`/`drizzle` outside `@mcpedia/core` or `@mcpedia/db` (architecture guard). Search the tree: `search_files("from \"pg\"", path="apps")`.

### Task 1.12: README + phase markers
- **Modify:** `README.md` — replace create-next-app text with MCPedia overview, monorepo map, "Phase 1 status", how to dev (`bun install && bun run index && bun run dev`), how to run MCP (`bun run --cwd apps/mcp start`).
- **Verify:** `cat README.md` reads correctly.

---

## Phase 2 — Semantic search + tRPC/Hono API + auth (outline, expand later)

- Add `document_chunks` table + `embedding vector` (pgvector extension on imrnes — operator enables `CREATE EXTENSION vector`).
- `packages/search`: `EmbeddingProvider` abstraction (OpenAI/Gemini/Ollama/Local) behind an interface (spec principle 6). Chunking in `packages/parser` (by heading/section).
- Hybrid ranking: fuse FTS `ts_rank` + cosine distance (Reciprocal Rank Fusion).
- `apps/api`: Hono + tRPC router exposing `documents.*`, `search.*`; Web switches from direct Core calls to tRPC client; MCP may also call API or keep Core (decide: keep Core for colocated simplicity, API for external).
- `packages/auth`: Auth.js/OIDC adapter; `permissions` table; gate write/mutations. Phase 1 documents are public-read.
- Categories + tags linking tables (`categories`, `document_tags`, `references`).
- MDX rendering with Shiki + shadcn/ui polish on Web.

## Phase 3 — Async indexing + revisions (outline)

- Redis (imrnes or local) + BullMQ workers: parse/chunk/embed/reindex off the request path.
- `document_revisions` table + revision API; Git sync hook (content/ push → reindex).
- Indexer becomes a worker triggered by file watch / webhook, not a manual script.

## Phase 4 — Scale (outline, only if needed)

- Dedicated search engine (OpenSearch) behind the same `SearchService` seam — YAGNI until FTS+pgvector saturates.
- Object storage for assets, advanced ranking, distributed workers, observability, multi-tenant. Docker Compose for service orchestration pointing at imrnes Postgres.

---

## Risks / tradeoffs / open questions

- **Next 16 breaking changes** — biggest unknown; mitigated by reading `node_modules/next/dist/docs` before Web tasks. If app-router differs enough, adjust Task 1.9 accordingly.
- **PgBouncer + prepared statements** — handled via `prepare: false`; if imrnes uses session pool mode, can drop it.
- **FTS language** — using `'simple'` config (no stemming) so mixed ID/EN queries match literally; revisit if relevance is poor (could add `'english'` or a custom ID dict).
- **pgvector on imrnes** — extension may need operator enablement; Phase 2 blocker, not Phase 1.
- **MCP resource URI shape** — `mcpedia://<section>/<path>` is a sketch; finalize against MCP SDK spec in Task 1.10 (Context7).
- **Monorepo driver** — bun workspaces chosen over pnpm per user; Turborepo runs fine under bun. If `turbo` bin resolution misbehaves under bun, fall back to `bunx turbo`.

## Verification matrix (Phase 1)

| Check | Command | Expect |
| --- | --- | --- |
| Install | `bun install` | clean |
| Lint | `bunx turbo run lint` | 0 errors |
| Typecheck | `bunx turbo run typecheck` | 0 errors |
| Build | `bunx turbo run build` | web + mcp build |
| Index | `bun run index` | `indexed N documents` |
| Web | `bun run dev` (apps/web) + curl `/` and `/search?q=websocket` | rendered HTML, hits |
| MCP | `bun run scripts/mcp-smoke.ts` | ≥1 hit for "websocket" |
| Arch guard | search for `from "pg"` outside `packages/db`,`packages/core` | none |
