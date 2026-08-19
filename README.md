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
│   └── mcp/      # MCP server (stdio) — AI-agent interface
├── packages/
│   ├── types/    # shared domain types (DocSection, Document, SearchHit, ...)
│   ├── config/   # loads .env (repo root) as authoritative dev config
│   ├── db/       # Drizzle ORM schema + client + drizzle-kit config
│   ├── parser/   # frontmatter (gray-matter) parsing
│   ├── search/   # Postgres FTS query (ts_rank + ts_headline)
│   └── core/     # Document/Content/Search services — the only business logic
├── content/      # docs/ writeups/ research/ notes/ (the knowledge base)
└── scripts/      # indexer.ts (walks content/ -> upserts into Postgres)
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

Phase 1 uses Postgres FTS only. Schema is defined in `packages/db/src/schema.ts`
(a `documents` table with a `search_vector` generated `tsvector` column + GIN
index). Apply it with:

```bash
bunx --cwd packages/db drizzle-kit push
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

## MCP tools (Phase 1)

| Tool                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `search_documents`    | Postgres FTS over the corpus (ranked + snippet)  |
| `get_document`        | Full markdown body by slug                       |
| `list_documents`      | List, optionally filtered by section             |
| `get_related_documents` | Docs sharing tags with a given slug            |

Smoke test (in-memory transport, real JSON-RPC):

```bash
bun --cwd apps/mcp run smoke
```

## Status

**Phase 1 — MVP (DONE):** monorepo, Core, Web UI (home/doc/search), MCP server,
Postgres FTS keyword search, content indexing.

See `PHASES.md` for Phase 2–4 (pgvector semantic/hybrid search, tRPC/Hono API,
auth, Redis/BullMQ background workers, revisions, scale-out).
