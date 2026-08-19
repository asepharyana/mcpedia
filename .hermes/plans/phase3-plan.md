# MCPedia — Phase 3 "Async + Scale" Implementation Plan

Status: Phase 1 (MVP) + Phase 2 (Semantic+API) DONE. Phase 3 adds async
background work, git-driven reindex, document revision history, and MCP
Resources. All logic stays in `@mcpedia/core`; new `packages/queue` wires
BullMQ; `apps/worker` runs the worker process; the existing API gets a git-sync
webhook + job-status procedures; the MCP server gains Resources.

## Scope (4 features from PHASES.md)

1. **Redis + BullMQ background indexing/embedding workers**
2. **Git synchronization hook** (auto-reindex on push via webhook)
3. **Document revision system** (`document_revisions`)
4. **MCP Resources** (`mcpedia://docs/...`) alongside existing tools

## Architecture decisions (locked)

- **Redis**: shared imrnes Redis `100.121.180.82:6379`, no auth (verified
  `+PONG`). `REDIS_URL` env (default `redis://100.121.180.82:6379`), optional
  `REDIS_PASSWORD`. BullMQ key prefix `mcpedia:` to avoid collisions on the
  shared instance.
- **Queue lib**: `bullmq@6.1.2` + `ioredis@6.0.0` (BullMQ peer dep). Pass an
  ioredis instance; BullMQ duplicates it for blocking commands.
- **Single source of truth preserved**: per-doc indexing logic moves into
  `@mcpedia/core` as `indexContentFile(relPath, reason?)`. The script, the
  worker, and the git hook ALL call this. Revisions are snapshotted inside it.
- **Revisions**: created only when body actually changes vs the latest revision
  (avoids bloat on every sync). Stored in `document_revisions`.

## Files touched

### packages/config
- `src/index.ts`: add `REDIS_URL`, `REDIS_PASSWORD`, `QUEUE_PREFIX`.

### packages/db
- `src/schema.ts`: add `documentRevisions` table
  (id, documentId→documents.id cascade, slug, revisionNo int, title, body,
  meta jsonb, reason text, createdAt). Index (document_id, revision_no DESC),
  (slug).
- `drizzle/0002_document_revisions.sql`: migration (applied via psql).
- `drizzle/meta/0002_snapshot.json` + `_journal.json` entry (keeps drizzle-kit
  consistent even though we apply manually).

### packages/core (new)
- `src/index.service.ts`:
  - `indexContentFile(relPath: string, reason = "index")` — parse → upsert
    `documents` → `indexChunks` → snapshot revision (if changed).
  - `runFullIndex(reason?)` — walk content, index each, return counts.
- `src/revision.service.ts`:
  - `createRevision(...)`, `listRevisions(slug, limit)`,
    `getRevision(id)`, `latestRevisionBody(slug)`, `restoreRevision(id)`.
- `src/index.ts`: export both.

### packages/queue (NEW)
- `package.json` (@mcpedia/queue): deps bullmq, ioredis, @mcpedia/core,
  @mcpedia/db, @mcpedia/config.
- `src/client.ts`: ioredis instance factory from config.
- `src/queue.ts`:
  - `INDEX_QUEUE = "mcpedia-index"`.
  - `enqueueIndexDoc(slug, absPath, reason)`, `enqueueFullIndex(reason)`.
  - `getQueue()` lazy singleton.
- `src/worker.ts`: `startWorker()` — BullMQ Worker with 3 job types:
  `index-doc` (single), `index-all` (full), `reindex` (full, reason=git-push).
  Graceful shutdown on SIGINT/SIGTERM. Job progress + error handling.

### apps/worker (NEW)
- `package.json` (@mcpedia/worker): script `start: bun src/index.ts`.
- `src/index.ts`: `startWorker()` + heartbeat log.

### apps/api
- `src/index.ts`: add `POST /hooks/reindex` (full) and
  `POST /hooks/index?slug=` (single) webhook routes → enqueue jobs. Mount
  AFTER /trpc.
- `src/router.ts`: add `jobStatus` (id→state/prev/failedData),
  `queueStatus` (waiting/active/completed/failed counts),
  `revisions` (slug→list), `restoreRevision` (id→new slug/doc).
- `package.json`: add `@mcpedia/queue` dep, `hooks` reused.

### apps/mcp
- `src/index.ts`: register Resources:
  - `mcpedia://docs` (list all metas)
  - `mcpedia://docs/{slug}` (full body from disk)
  - `mcpedia://docs/{slug}/chunks` (chunk previews)
  - `mcpedia://docs/{slug}/revisions` (revision list)
- `src/smoke.test.ts`: add `listResources` + read `mcpedia://docs` assertion.

### scripts
- `scripts/indexer.ts`: refactor `main()` to call `runFullIndex()`.

### Root
- `package.json`: add `"worker": "bun --cwd apps/worker run start"`,
  `"reindex": "bun run scripts/worker.ts"`? No — `worker` runs the listener;
  triggering reindex = `bun run api` webhook or `enqueueFullIndex` helper.
  Add `"enqueue-index": "bun run scripts/enqueue.ts"` (one-shot enqueue).
- `.env.example`: add `REDIS_URL`, `REDIS_PASSWORD`, `QUEUE_PREFIX`.

### Docs
- `PHASES.md`: mark Phase 3 items DONE with notes.
- `README.md`: document worker, webhook, revisions, MCP resources.

## Verification (real, not claimed)

1. `bun install` picks up new deps.
2. `bunx turbo run build` + `typecheck` green across workspace.
3. **Real BullMQ e2e against imrnes Redis**: script that enqueues an
   `index-doc` job, starts a Worker, asserts the job completes and the doc row
   + chunks + a revision row appear in Postgres. Verifies Redis+ioredis+bullmq
   + db + core all wired correctly.
4. `bun --cwd apps/mcp run smoke` passes (incl. new resources).
5. `bun run index` (runFullIndex) green; verify `documents`,
   `document_chunks`, `document_revisions` row counts via psql.
6. API webhook: `curl -XPOST localhost:4020/hooks/reindex` enqueues; worker
   processes; `curl localhost:4020/trpc/queueStatus` reflects counts.
7. MCP resource read returns real content.
