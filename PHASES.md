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

- [x] `packages/embeddings` — `EmbeddingProvider` interface + OpenRouter provider (via 9router `/v1`, `encoding_format:"float"`); `chunkText` + `embedChunks` batcher. `EMBED_DIM=2048` discovered live.
- [x] Schema `document_chunks` (id, document_id→documents.id cascade, slug, chunk_index, content, `embedding real[]`). Stored as `real[]` because pgvector **is not installed** on the shared imrnes Postgres (installing needs host-level apt — deferred). Cosine computed in-app; instant for a KB-sized corpus.
- [x] `scripts/indexer.ts` — chunks + embeds + upserts (per-doc replace).
- [x] `@mcpedia/search` — `semanticSearch` (cosine) + `hybridSearch` (FTS + cosine, RRF fusion). `keywordSearch` unchanged.
- [x] `apps/api` — Hono + tRPC v11 (`@trpc/server` fetch adapter, `@hono/node-server` on :4020): `search`, `semanticSearch`, `hybridSearch`, `getDocument`, `listDocuments`, `related`.
- [x] MCP server — added `semantic_search` + `hybrid_search` tools (6 total).
- [x] Web search — keyword/hybrid toggle (`?mode=hybrid`), hybrid reaches semantically-related docs keyword misses.

## Phase 3 — Async + Scale ✅ DONE

- [x] **Redis + BullMQ background indexing / embedding workers** —
  `packages/queue` (ioredis singleton + BullMQ `Queue`/`Worker`, prefix
  `mcpedia:` on shared imrnes Redis `:6379`); `apps/worker` runs
  `startWorker()`. Three job types: `index-doc`, `index-all`, `reindex`.
  Single indexing entry point `indexContentFile`/`runFullIndex` in
  `@mcpedia/core` shared by the script, worker, and git hook. Verified
  end-to-end against live Redis (job enqueue → worker → Postgres write).
- [x] **Git synchronization hook (auto-reindex on push)** — API webhook
  `POST /hooks/reindex` (full) and `POST /hooks/index?slug=` (single) enqueue
  BullMQ jobs. Wire a Git provider (GitHub/Gitea) post-receive / webhook to
  `POST /hooks/reindex` to auto-reindex on push. `scripts/enqueue.ts` is a
  one-shot enqueue helper (`bun run enqueue --all` / `<slug>`).
- [x] **Document revision system (`document_revisions`)** — `packages/db`
  migration `0002_document_revisions.sql`. Indexer snapshots a revision only
  when the body actually changes vs the latest revision (pure metadata edits
  don't bloat history). `listRevisions` / `getRevision` / `restoreRevision`
  in `@mcpedia/core`; exposed as tRPC `revisions` / `getRevision` /
  `restoreRevision` and the `mcpedia://docs/{+slug}/revisions` MCP Resource.
- [x] **MCP Resources (`mcpedia://docs/...`)** — alongside the 6 tools:
  `mcpedia://docs` (list), `mcpedia://docs/{+slug}` (body from disk),
  `mcpedia://docs/{+slug}/chunks` (chunk preview),
  `mcpedia://docs/{+slug}/revisions` (history). `{+slug}` uses RFC 6570
  reserved expansion so slugs containing `/` match.

### New/changed commands
```
bun run index            # full reindex (runFullIndex, writes revisions)
bun run enqueue --all    # enqueue a full reindex job (no worker needed)
bun run enqueue <slug>   # enqueue a single-doc reindex job
bun run worker           # start the BullMQ indexing worker (long-running)
bun run api              # Hono+tRPC API on :4020 (added /hooks/* webhooks)
```

### Verification done (real, against imrnes Redis + Postgres)
- `turbo run typecheck` green across all 13 packages.
- BullMQ e2e: enqueue `index-doc` → worker completes → `documents` +
  `document_chunks` + `document_revisions` rows present.
- Revision dedup proven: editing a body creates a new revision; metadata-only
  reindex does not; `restoreRevision` writes history back into the live row.
- MCP smoke test passes (tools + all 4 resources).
- API webhook `POST /hooks/reindex` enqueues → worker drains queue →
  `queueStatus` reflects counts.

## Phase 4 — Operability & Correctness Hardening ✅ DONE

> Reinterpreted from the original "Scale-out" plan: OpenSearch/object-storage/
> multi-tenant were flagged YAGNI at KB scale (4 docs), so Phase 4 = make the
> Phase 3 async + revision machinery **correct, secure, observable, deployable**.

- [x] **T1 — `restoreRevision` rebuilds semantic chunks (CORRECTNESS BUG)** —
  previously restore wrote the old body into `documents` but left `document_chunks`
  on the *new* body, so semantic/hybrid search went stale after a restore.
  `@mcpedia/core` `reindexChunks(slug)` now re-chunks + re-embeds from the live
  body; `restoreRevision` calls it after the update (embed failure is logged, not
  thrown). Verified: restore → `document_chunks` count matches re-chunk of the
  restored body.
- [x] **T2 — Secure git-sync webhook (SECURITY)** — `/hooks/*` now require an
  `x-webhook-secret` header matching `WEBHOOK_SECRET` (401 otherwise). API
  fails fast at startup if `WEBHOOK_SECRET` is unset (no open endpoint). Added
  `WEBHOOK_SECRET` to `@mcpedia/config` + `.env.example`; generated a real secret
  in the local `.env` (gitignored).
- [x] **T3 — Web UI revisions view (UX)** — doc page now shows a "History" panel
  (revision no, reason, date, body length) with a per-revision Restore button.
  Restore POSTs to `apps/web/app/api/revisions/restore/route.ts` → `restoreRevision`
  → `revalidatePath` (server-component only, no client JS).
- [x] **T4 — Paginate `listRevisions`** — added `offset` param (summary never
  includes body). API `revisions` + MCP resource use the summary.
- [x] **T5 — Deploy as supervised services (OPS)** — `deploy/mcpedia-api.service`
  + `deploy/mcpedia-worker.service` systemd units (`Restart=on-failure`,
  `EnvironmentFile=.env`, `WorkingDirectory=/home/code/mcpedia`). Enable with:
  `cp deploy/*.service /etc/systemd/system && systemctl daemon-reload &&
  systemctl enable --now mcpedia-api mcpedia-worker`. (Not auto-enabled on host
  without explicit user go-ahead.)

### Verification done (real, against imrnes Redis + Postgres)
- `turbo run typecheck` + `turbo run build` green (incl. `next build` with the
  History panel).
- T1: edit → reindex (new revision + chunks) → restore rev #1 → `document_chunks`
  count for that slug matches re-chunk of rev #1; `semanticSearch` on a term
  unique to rev #1 returns it.
- T2: `curl -XPOST /hooks/reindex` → 401; with `-H "x-webhook-secret: $WEBHOOK_SECRET"`
  → 200 + jobId; job drains via worker.
- T3: History panel renders; restore route rebuilds chunks (T1 path).
- T4: `revisions` returns summaries (no body); `offset` paging works.
- T5: `systemd-analyze verify deploy/*.service` passes (off-host safe check).

## Phase 5 — Deferred scale-out (only when needed)

- [ ] Dedicated search engine (OpenSearch/Elasticsearch) — YAGNI until FTS is insufficient
- [ ] pgvector migration (install on imrnes Postgres) — when `real[]` cosine stalls
- [ ] Object storage for assets
- [ ] Advanced ranking, distributed workers, observability, multi-tenant

## Decisions locked (from initial planning)

- **Tooling:** bun workspaces + Turborepo (repo already used bun; pnpm rejected to minimize churn).
- **DB:** imrnes Postgres `100.121.180.82:6432/mcpedia` for both dev and deploy; driver `prepare:false` (PgBouncer). Docker Compose reserved for future prod.
- **Phase 1 scope:** Core + Web + MCP only. tRPC/Hono API, pgvector, auth, BullMQ deferred (YAGNI).
