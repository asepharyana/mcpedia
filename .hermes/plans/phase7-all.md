# MCPedia — "lanjut semua" workstream

Three real gaps remain (from review): tiny corpus (4 docs), MCP read-only (no write/auth),
no observability. This plan closes all three.

## 1. Content corpus (grow the KB)
Author real, useful docs so search/semantic/revisions have something to operate on.
Frontmatter schema (from packages/parser): id,title,type,tags,status,author,created_at,updated_at.
Sections: docs|writeups|research|notes. Files under content/<section>/...
New docs to add:
- content/docs/caddy/reverse-proxy.md        (ops reference, tags: caddy, reverse-proxy, tls)
- content/docs/bullmq/workers.md             (queue/worker reference, tags: bullmq, redis, jobs)
- content/docs/mcp/streamable-http.md        (MCP transport reference, tags: mcp, protocol, http)
- content/notes/postgres/full-text-search.md (PG FTS notes, tags: postgres, fts, tsvector)
- content/writeups/infra/cloudflare-525.md   (debugging writeup, tags: cloudflare, tls, 525)
After adding: `bun run index` to reindex (writes revisions + chunks), verify counts.

## 2. MCP write-tools + auth
Add mutating + admin tools to the MCP server (currently read-only):
- `index_document(slug)`  -> enqueueIndexDoc (requires MCP auth header)
- `reindex_all()`         -> enqueueFullIndex (requires MCP auth header)
- `queue_status()`        -> getQueue counts (read, public)
- `restore_revision(id)`  -> restoreRevision (requires MCP auth header)
Auth: MCP client must send header `x-webhook-secret` (reuse WEBHOOK_SECRET). StreamableHTTP
transport: read the Authorization/header in http.ts, pass to server via a factory closure
capturing the request; tools check it. Stateless per-request server already created fresh,
so threading the header is clean. Guard write-tools with the same requireWriteAuth logic.
Verify: unauthenticated call to index_document -> error; authenticated -> enqueues job.

## 3. Observability
- `GET /metrics` on the API (Prometheus text format): queue counts (waiting/active/
  completed/failed/delayed), uptime, service name. Public (safe to expose).
- Caddy: expose /metrics on wiki. domain -> :4020 (add to handle list).
- tRPC `queueStatus` already exists; /metrics reuses getQueue.
Verify: curl /metrics -> text exposition with mcpedia_queue_* gauges.

## Verification
- typecheck green (turbo run typecheck).
- MCP smoke extended: tools/list shows new tools; authenticated index_document enqueues.
- /metrics returns 200 text; queue drains.
- commit + push.
