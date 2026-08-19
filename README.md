# MCPedia

> A content-first knowledge base — readable as Markdown/MDX in Git, queryable by
> humans via a Web UI and by AI agents via the Model Context Protocol (MCP).

MCPedia keeps content as plain Markdown files under `content/`. A Git-tracked
source of truth, indexed into PostgreSQL (metadata + a `tsvector` full-text
column) and served through a single **Core** layer that every interface
(Web, MCP) shares — no business logic duplicated per surface.

## Monorepo layout

```
mcpedia/
├── apps/
│   ├── web/      # Next.js 16 (Turbopack) — human-facing docs UI + search
│   ├── mcp/      # MCP server (stdio) — AI-agent interface (tools + resources)
│   └── api/      # Hono + tRPC v11 API on :4020 (+ /hooks/* git-sync webhooks)
├── packages/
│   ├── types/    # shared domain types (DocSection, Document, SearchHit, ...)
│   ├── config/   # loads .env (repo root) as authoritative dev config
│   ├── db/       # Drizzle ORM schema + client + drizzle-kit config
│   ├── parser/   # frontmatter (gray-matter) parsing
│   ├── search/   # Postgres FTS query (ts_rank + ts_headline)
│   ├── embeddings/ # embedding provider + chunker
│   ├── queue/    # Redis (ioredis) + BullMQ worker/queue (Phase 3)
│   └── core/     # Document/Content/Search/Index/Revision — the only business logic
├── content/      # docs/ writeups/ research/ notes/ (the knowledge base)
└── scripts/      # indexer.ts (full reindex), enqueue.ts (one-shot job enqueue)
```

## Architecture principle

```
Web ─┐
     ├──► Core ──► Repository (@mcpedia/db) ──► PostgreSQL
MCP ─┘
```

All interfaces go through `@mcpedia/core`. Nothing outside `packages/db` and
`packages/core` touches the database directly.

## Quick start

```bash
bun install                       # install workspace deps
cp .env.example .env             # set DATABASE_URL (dev uses imrnes Postgres :6432)
bunx turbo run build             # typecheck + build every package

bun run index                    # walk content/ -> upsert into Postgres
bun --cwd apps/web run dev       # Web UI on :3000
bun run mcp                       # MCP server on stdio (pipe to an MCP client)
```

### Database

Schema is defined in `packages/db/src/schema.ts` (`documents` with a weighted
`search_vector` tsvector + GIN index, and `document_chunks` with an `embedding real[]`).
The `pgvector` extension is **not available** on the shared imrnes Postgres, so
semantic search stores vectors as `real[]` and ranks by in-app cosine similarity.

Migrations live in `packages/db/drizzle/`. They were applied manually via `psql`
(`drizzle-kit push` is unreliable under PgBouncer transaction pooling); to
re-apply on a fresh DB:

```bash
psql $DATABASE_URL -f packages/db/drizzle/0000_grey_toro.sql
psql $DATABASE_URL -f packages/db/drizzle/0001_document_chunks.sql
```

> Note: on imrnes (PgBouncer `:6432`) a leaked `DATABASE_URL` shell var can
> shadow `.env`. `@mcpedia/config` loads `.env` **last** so the repo config
> always wins for local/dev.

## Content

Each Markdown file carries YAML frontmatter:

```yaml
---
id: websocket-contract
title: WebSocket Contract
type: documentation
tags: [typescript, websocket, rpc]
status: published
author: asep
created_at: 2026-08-19
updated_at: 2026-08-19
---
```

`slug` = relative path under `content/` (e.g. `docs/websocket/contract`). The
`body` shown in the UI is always read from the on-disk file (source of truth);
the DB stores metadata + the search vector.

## MCP tools

| Tool                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `search_documents`    | Postgres FTS over the corpus (ranked + snippet)  |
| `semantic_search`     | Embedding/cosine search over chunked content     |
| `hybrid_search`       | FTS + semantic fused via RRF                      |
| `get_document`        | Full markdown body by slug                       |
| `list_documents`      | List, optionally filtered by section             |
| `get_related_documents` | Docs sharing tags with a given slug            |

### MCP Resources

| URI                              | Purpose                                  |
| -------------------------------- | ---------------------------------------- |
| `mcpedia://docs`                 | List all published documents             |
| `mcpedia://docs/{+slug}`         | Full markdown body (read from disk)      |
| `mcpedia://docs/{+slug}/chunks`  | Preview of embedded semantic chunks      |
| `mcpedia://docs/{+slug}/revisions` | Revision history summary              |

(`{+slug}` uses RFC 6570 reserved expansion so a slug like
`docs/websocket/contract` matches the template.)

Smoke test (in-memory transport, real JSON-RPC):

```bash
bun --cwd apps/mcp run smoke
```

## API (Phase 2 + Phase 3)

A tRPC v11 API is exposed via Hono on **:4020** (all procedures mirror the
MCP tools). Phase 3 adds async job + revision procedures and git-sync webhooks:

```bash
bun run api            # http://localhost:4020 (GET /health, POST/GET /trpc/*)
```

tRPC procedures: `search`, `semanticSearch`, `hybridSearch`, `getDocument`,
`listDocuments`, `related` (Phase 2); plus `revisions`, `getRevision`,
`restoreRevision`, `jobStatus`, `queueStatus` (Phase 3).

Git-sync webhooks (enqueue BullMQ jobs; the worker processes them):
- `POST /hooks/reindex` — full-corpus reindex (point your Git provider's
  push webhook here to auto-reindex on push).
- `POST /hooks/index?slug=<slug>` — reindex a single document.

`bun run index` now also chunks + embeds (Phase 2 indexer) and snapshots a
revision whenever the body changes (Phase 3). See `.env.example` for
`EMBED_*` / `REDIS_*` / `QUEUE_PREFIX` vars.

## Status

**Phase 1 — MVP (DONE):** monorepo, Core, Web UI (home/doc/search), MCP server,
Postgres FTS keyword search, content indexing.

**Phase 2 — Semantic + API (DONE):** embeddings provider (OpenRouter via 9router),
chunked `document_chunks`, `semanticSearch` + `hybridSearch` (RRF), tRPC/Hono API
(`apps/api`, :4020), MCP `semantic_search`/`hybrid_search` tools, web hybrid toggle.

**Phase 3 — Async + Scale (DONE):** Redis + BullMQ background indexing/embedding
workers (`packages/queue`, `apps/worker`), git-sync webhooks (`POST /hooks/*`),
document revision system (`document_revisions` + restore), and MCP Resources
(`mcpedia://docs/...`). See `PHASES.md`.

> pgvector is **not installed** on the shared imrnes Postgres, so vector storage is
> a `real[]` column with in-app cosine similarity (instant at KB scale). pgvector is
> the Phase-4 scale-out path. See `PHASES.md`.

See `PHASES.md` for Phase 3–4 (Redis/BullMQ, auth, revisions, scale-out).
