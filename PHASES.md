# MCPedia — Phase Status

Legend: ✅ built · 🟡 partial · ⬜ deferred

## Phase 1 — MVP (✅ DONE)

| Capability            | Status | Notes |
| --------------------- | ------ | ----- |
| Monorepo (bun + Turbo)| ✅    | apps/{web,mcp}, packages/{types,config,db,parser,search,core}, scripts |
| Content as Markdown   | ✅    | `content/{docs,writeups,research,notes}/`, Git-tracked |
| Frontmatter parsing   | ✅    | `@mcpedia/parser` (gray-matter) |
| Postgres metadata     | ✅    | `@mcpedia/db` Drizzle, `documents` table |
| Postgres FTS          | ✅    | weighted `tsvector` (title A / body B), GIN index, `ts_rank`+`ts_headline` |
| Core services         | ✅    | Document / Content / Search — single business-logic layer |
| Indexer              | ✅    | `scripts/indexer.ts` walks content/ → upserts |
| Web UI (Next 16)      | ✅    | home (list), doc view (SSG), search (dynamic). react-markdown render |
| MCP server (stdio)    | ✅    | 4 tools; in-memory smoke test passing |
| Hybrid/semantic search| ⬜    | Phase 2 |

## Phase 2 — Semantic + API

- [ ] `pgvector` + embedding column on `document_chunks`
- [ ] Chunking + embedding provider abstraction (`EmbeddingProvider`: OpenAI/Gemini/Ollama/local)
- [ ] Hybrid search (FTS score + cosine, reciprocal-rank fusion)
- [ ] tRPC + Hono API (`apps/api`) sharing `@mcpedia/core`
- [ ] Tags / Categories / References as first-class tables
- [ ] Auth (Auth.js / OIDC) — public/private/unlisted/admin/owner
- [ ] shadcn/ui components + Shiki syntax highlighting (replace minimal markdown render)

## Phase 3 — Async + Scale

- [ ] Redis + BullMQ background indexing / embedding workers
- [ ] Git synchronization hook (auto-reindex on push)
- [ ] Document revision system (`document_revisions`)
- [ ] MCP Resources (`mcpedia://docs/...`) in addition to tools

## Phase 4 — Scale-out (only if needed)

- [ ] Dedicated search engine (OpenSearch/Elasticsearch) — YAGNI until FTS is insufficient
- [ ] Object storage for assets
- [ ] Advanced ranking, distributed workers, observability, multi-tenant

## Decisions locked (from initial planning)

- **Tooling:** bun workspaces + Turborepo (repo already used bun; pnpm rejected to minimize churn).
- **DB:** imrnes Postgres `100.121.180.82:6432/mcpedia` for both dev and deploy; driver `prepare:false` (PgBouncer). Docker Compose reserved for future prod.
- **Phase 1 scope:** Core + Web + MCP only. tRPC/Hono API, pgvector, auth, BullMQ deferred (YAGNI).
