# MCPedia Phase 2 — Semantic Search + tRPC/Hono API

> **For Hermes:** implement task-by-task. Spec-first (user rule 2026-08-19).

**Goal:** Add semantic + hybrid search (pgvector) and a typed tRPC/Hono API so
MCPedia is queryable by embeddings, not just keyword FTS — and expose the
corpus over a programmatic HTTP API.

**Architecture:** Content (Markdown) → chunk → embed (OpenRouter) → store
`document_chunks` with `vector(N)` in Postgres → `semanticSearch` (cosine) and
`hybridSearch` (FTS + cosine, reciprocal-rank fusion) in `@mcpedia/search` →
exposed via Core, the MCP server (new tools), and a new `apps/api` (Hono +
tRPC v11).

**Embedding provider:** OpenRouter (`openrouter/llama-nemotron-embed-vl-1b-v2:free`)
via `9router_ai_llm_api_key` + `9router_ai_llm_base_url` (BWS). Dimension is
discovered at first live call (see Step 1.3) and pinned in schema/migration.

**Tech stack:** drizzle-orm `vector` column + pgvector extension, HNSW index,
`@trpc/server` v11 (fetch adapter), `hono` + `@hono/node-server`.

---

## Task P2.1 — `packages/embeddings` (provider + abstraction)

**Files:** `packages/embeddings/package.json`, `src/index.ts`, `src/provider.ts`,
`src/openrouter.ts`

- `EmbeddingProvider` interface: `embed(texts: string[]): Promise<number[][]>`, `readonly model`, `readonly dimensions`.
- `OpenRouterEmbeddingProvider`: POST `${baseUrl}/embeddings` with `{ model, input }`,
  `Authorization: Bearer ${key}`. Returns `data[].embedding`. Validate length === dimensions.
- Read `EMBED_BASE_URL`, `EMBED_API_KEY`, `EMBED_MODEL` from `@mcpedia/config`
  (with `.env` fallback). Dimensions discovered live (Step 1.3) → export `EMBED_DIM`.
- Chunk helper `chunkText(text, { size=1000, overlap=150 })` in `src/chunk.ts`.

**Step 1.3 (discover dim):** live call `embed(["test"])`, read `embedding.length`,
pin `EMBED_DIM`, assert mismatch throws.

**Verify:** `bun run` a temp script: `embed(["hello world"])` prints a vector of
length N (e.g. 1024). Confirm no key is logged.

---

## Task P2.2 — Schema: `document_chunks` + vector extension

**Files:** `packages/db/src/schema.ts` (add), `packages/db/drizzle.config.ts`
(unchanged), new migration.

- `CREATE EXTENSION IF NOT EXISTS vector;` (idempotent; run once via psql).
- `document_chunks` table:
  - `id` uuid pk default gen_random_uuid()
  - `document_id` text → `documents.id` on delete cascade
  - `slug` text (denormalized for convenience)
  - `chunk_index` integer
  - `content` text
  - `embedding` vector(EMBED_DIM)
  - `created_at` timestamp default now()
  - index `chunk_embedding_idx` using hnsw (`embedding` op `vector_cosine_ops`)
- Generate migration with `drizzle-kit generate`, apply via `psql` (drizzle-kit
  push is unreliable here — known).

**Verify:** `\d document_chunks` shows `embedding vector(N)` + HNSW index;
`select count(*) from document_chunks` = 0.

---

## Task P2.3 — Indexer: chunk + embed + upsert

**Files:** `scripts/indexer.ts` (extend), `packages/core/src/document.service.ts`
(add `indexChunks`).

- For each published doc: read body (already on disk), `chunkText`, `embed` in
  batches (≤ 16), delete existing chunks for slug, insert new rows.
- Guard: if embedding provider fails, log + skip (don't crash the whole index).
- Add `bun run index:embed` (or extend `bun run index` to also embed).

**Verify:** after running, `select count(*) from document_chunks` > 0; a sample
row has non-null `embedding`.

---

## Task P2.4 — `packages/search`: semantic + hybrid

**Files:** `packages/search/src/index.ts` (add `semanticSearch`, `hybridSearch`).

- `semanticSearch(vec, limit)`: order by `embedding <=> ${vec}` asc, filter published.
- `hybridSearch(q, limit)`: run FTS (`ts_rank`) + semantic (cosine) in parallel;
  fuse with reciprocal-rank (RRF: score = 1/(k+rank), k=60); return merged hits.
- Keep `keywordSearch` unchanged (Phase 1).

**Verify:** unit-ish script: embed a query, `semanticSearch` returns relevant
chunks; `hybridSearch("websocket")` returns ≥ keyword results.

---

## Task P2.5 — `packages/core` expose semantic/hybrid

**Files:** `packages/core/src/search.service.ts`, `index.ts`.

- Re-export `semanticSearch`, `hybridSearch` from Core.

---

## Task P2.6 — `apps/api` (Hono + tRPC v11)

**Files:** `apps/api/package.json`, `tsconfig.json`, `src/index.ts`,
`src/router.ts`, `src/trpc.ts`.

- `initTRPC.create()` router with procedures: `search`, `semanticSearch`,
  `hybridSearch`, `getDocument`, `listDocuments` (mirrors MCP tools).
- Mount `fetchRequestHandler` on a Hono app at `/trpc/*`; serve via
  `@hono/node-server` `serve({ fetch: app.fetch, port: 4020 })`.
- `createContext` returns `{ db }`.

**Verify:** `bun run dev` → `curl -X POST localhost:4020/trpc/search`
with JSON body returns hits.

---

## Task P2.7 — MCP server: semantic + hybrid tools

**Files:** `apps/mcp/src/index.ts` (add `semantic_search`, `hybrid_search`),
extend `smoke.test.ts`.

- `semantic_search`: embed query → `semanticSearch`.
- `hybrid_search`: embed query → `hybridSearch`.
- Smoke: assert both return ≥1 hit for "websocket".

---

## Task P2.8 — Web: semantic toggle on search

**Files:** `apps/web/app/search/page.tsx`.

- Add `mode=keyword|hybrid` query param; server component calls Core
  `hybridSearch` when `mode=hybrid`. Minimal UI toggle (link/buttons).
- Keep keyword as default.

**Verify:** `bun run build`; `curl '/search?q=websocket&mode=hybrid'` returns hits.

---

## Task P2.9 — Verify all + commit

- `bunx turbo run build` (web + api + mcp), `bun run apps/mcp smoke`,
  live API curl, live web hybrid search.
- Update `README.md` + `PHASES.md` (mark Phase 2 ✅).
- `git add -A` (exclude `.env`), commit as asepharyana (no Co-Authored-By).

---

## Risks / decisions
- **Dimension unknown until live call** → P2.1.3 discovers it; pinned EMBED_DIM=2048.
- **pgvector NOT available on shared imrnes Postgres** (extension not installed;
  installing needs host-level apt on a managed/shared DB — deferred). PIVOT:
  store `embedding` as `real[]` and compute cosine similarity in the app layer.
  Brute-force cosine is instant for a KB-sized corpus (dozens of docs / hundreds
  of chunks). pgvector+HNSW is the Phase-4 scale-out path.
- **PgBouncer + real[]**: fine; simple queries, no extension needed.
- **API port 4020** (host 4000s range is 4000–4015; 4020 is free for dev). Deploy later.
- **YAGNI**: no auth/revisions this phase (Phase 3).
