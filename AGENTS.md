<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MCPedia Agent Instructions

MCPedia is a content-first knowledge base where documents are stored in **PostgreSQL** as the source of truth (with auto-generated .md backups on disk), indexed into embeddings + search vectors, and accessed via Web UI, tRPC API, and Model Context Protocol (MCP).

- **DB-first**: Documents are created/updated/deleted via the MCP `create_document`/`update_document`/`delete_document` tools (require `x-webhook-secret`). Filesystem `.md` files in `content/` are auto-generated backups (gitignored).
- **Git-sync deploy**: CI builds `.next` on GitHub Actions → tarball → SCP to VPS → unpack. VPS never builds. Content changes flow via MCP API to the DB directly.

## Architecture Principles

1. **Single Core Layer (`@mcpedia/core`)**: All business logic (document CRUD, indexing, search, revisions, path classification) resides in `packages/core`. Never access the database directly from `apps/web`, `apps/mcp`, or `apps/api`.
2. **DB as Source of Truth**: PostgreSQL stores document body + metadata. Filesystem `.md` files in `content/` are auto-generated backups (gitignored). Use the MCP `create_document`/`update_document` tools to write content.
3. **Multi-Modal Search**: Keyword search (Postgres FTS `tsvector` + GIN), Semantic search (cosine similarity over chunked embeddings), and Hybrid search (Reciprocal Rank Fusion / RRF) are unified in `@mcpedia/search`.
4. **Mutations & Security**: State-changing operations (document creation/updates/deletions, reindexing, revision restoration) require authentication (`x-webhook-secret` header or session cookie).

## Development Workflow

- **Install dependencies**: `bun install`
- **Run tests**: `bun run test`
- **Typecheck**: `bun run typecheck`
- **Build monorepo**: `bunx turbo run build`
- **Index content**: `bun run index`
- **Start dev servers**: `bun run dev`

