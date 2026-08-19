# MCPedia Phase 4 — Operability & Correctness Hardening

> Reinterpretation: the PHASES.md "Scale-out" items (OpenSearch, object storage,
> multi-tenant, distributed workers) are YAGNI at KB scale (4 docs). Phase 4 =
> make the Phase 3 async + revision machinery **correct, secure, observable, and
> deployable** — not speculative infra. Each task below fixes a real gap found
> by reading the code, not a hypothetical need.

## Tasks

### T1 — `restoreRevision` must rebuild semantic chunks (CORRECTNESS BUG)
**Root cause:** `packages/core/src/revision.service.ts` `restoreRevision` writes
the old body back into `documents` but never calls `indexChunks(slug, body)`.
So after a restore, keyword search (FTS on `documents.body`) is correct but
`document_chunks`/embeddings stay on the *new* body → semantic + hybrid search
return stale/ghost chunks.

**Fix:**
- Add `reindexChunks(slug)` to `@mcpedia/core` that re-runs `indexChunks(slug, body)`
  using the live `documents.body` (the new body after the update).
- Call it inside `restoreRevision` after the `documents` update (wrap in try/catch
  like `indexContentFile` so embed failure doesn't abort the restore).
- Add a unit-style assertion to the MCP smoke test or a small script: restore →
  `document_chunks` count matches re-chunked body.

**Files:** `packages/core/src/revision.service.ts`, `packages/core/src/index.ts`,
`packages/core/src/document.service.ts` (export existing `indexChunks` if needed).

### T2 — Secure the git-sync webhook (SECURITY)
**Root cause:** `apps/api/src/index.ts` `/hooks/reindex` and `/hooks/index` accept
any request with no `WEBHOOK_SECRET` check — `.env.example` defines `WEBHOOK_SECRET`
but the router never reads it.

**Fix:**
- In `apps/api/src/index.ts`, compare `c.req.header("x-webhook-secret")` (or
  `?secret=`) against `WEBHOOK_SECRET` (from `@mcpedia/config`). If unset/mismatch →
  `401`. If `WEBHOOK_SECRET` env is empty, reject at startup with a clear log
  (fail-fast, don't run an open endpoint).
- Add `WEBHOOK_SECRET` to `packages/config/src/index.ts` export.
- Document the header in README + verify with curl (401 without secret, 200 with).

**Files:** `apps/api/src/index.ts`, `packages/config/src/index.ts`, README.

### T3 — Web UI revisions view (UX)
**Root cause:** Web UI (server components) calls `@mcpedia/core` directly; there is
no revisions surface even though `revisions`/`restoreRevision` tRPC + MCP resource
exist.

**Fix (server-component only, no client JS):**
- On the doc page (`apps/web/app/[section]/[...slug]/page.tsx`), fetch
  `listRevisions(fullSlug, 10)` and render a "History" panel: revision number,
  reason, createdAt, body length, and a `/api/revisions/restore` link/POST that
  calls the tRPC `restoreRevision` mutation via a server action or a form POST to
  a small route handler. Simplest: a `<form method="post" action="/api/revisions/restore">`
  with hidden `id` + a route handler in `apps/web` calling `restoreRevision`.
  Keep it read-mostly; restore is a deliberate action.
- Add `apps/web/app/api/revisions/restore/route.ts` (POST) → `restoreRevision(id)`
  → `revalidatePath` the doc.

**Files:** `apps/web/app/[section]/[...slug]/page.tsx`,
`apps/web/app/api/revisions/restore/route.ts`.

### T4 — Paginate `listRevisions` / `revisions` API (PERF)
**Root cause:** `revision.service.ts` `listRevisions` does `select length(body)`
  (fine) but the tRPC `revisions` and MCP resource return *full* revision rows
  including the body in some callers; list endpoints should never carry bodies.

**Fix:**
- Ensure `listRevisions` summary excludes `body` (it already does — `bodyLength`
  only). Add `offset` param for paging. Confirm MCP resource uses the summary.
- No behavior change for the doc page (uses summary).

**Files:** `packages/core/src/revision.service.ts` (add `offset`), router unchanged.

### T5 — Deployable as supervised services (OPS)
**Root cause:** `apps/api` and `apps/worker` run only ad-hoc; the host already runs
`zeavis` via Nix/systemd. Phase-4 operability = provide a systemd unit (or Nix
service) so `mcpedia-api` + `mcpedia-worker` start on boot and restart on failure.

**Fix (Nix-first, per MEMORY):**
- Write `mcpedia-api.service` + `mcpedia-worker.service` systemd unit files under
  `deploy/` (bun run api / bun run worker, `WorkingDirectory`, `Restart=on-failure`,
  `EnvironmentFile` pointing at `.env`, `After=network-online.target`).
- README section "Run as a service" with `cp deploy/*.service /etc/systemd/system && systemctl daemon-reload && systemctl enable --now mcpedia-api mcpedia-worker`.
- **Do NOT** `systemctl` on the host without user confirmation (changing live
  services). Provide the files + instructions only; user runs enable.

**Files:** `deploy/mcpedia-api.service`, `deploy/mcpedia-worker.service`, README.

## Verification (all real, against imrnes Redis + Postgres)
1. `turbo run typecheck` + `turbo run build` green.
2. T1: script — edit a doc, reindex (new revision + new chunks), restore rev #1,
   assert `document_chunks` count for that slug now matches re-chunk of rev #1 body
   and `semanticSearch` on a term unique to rev #1 returns it.
3. T2: `curl -XPOST localhost:4020/hooks/reindex` → 401; with
   `-H "x-webhook-secret: $WEBHOOK_SECRET"` → 200 + jobId.
4. T3: `next build` includes the History panel; restore form rebuilds chunks
   (verified via T1 path through the route handler).
5. T4: `revisions` API returns summaries without body; offset paging works.
6. T5: `systemd-analyze verify deploy/*.service` passes (off-host safe check);
   README documents enable steps.

## Out of scope (YAGNI, keep deferred per PHASES.md)
OpenSearch/Elasticsearch, object storage, multi-tenant, distributed workers,
pgvector migration. Revisit only when corpus > ~10k docs or query latency bites.
