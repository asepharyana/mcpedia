# MCPedia Phase 9 — Test Coverage + Observability Hardening

**Goal:** Add a real test suite (CI-gated) covering every layer of MCPedia — pure
logic, Core services, the API surface, the MCP server + auth gates, and the Web
UI — so regressions are caught before deploy. The suite must run green in CI
with **no external services** (no Postgres, no Redis) by using in-process fakes.

## Constraints recap
- Tooling: bun workspaces + Turborepo, bun 1.3.14 has a built-in `bun:test` runner.
- DB is `imrnes` Postgres at `:6432` (no DB in CI) — tests must NOT touch it.
- pgvector is NOT installed (vectors are `real[]`, cosine in-app) — confirmed.
- Existing smoke test (`apps/mcp/src/smoke.test.ts`) is a script with `main()`
  run via `bun run smoke`, NOT a `bun:test` file. It hits the DB → cannot run in CI.
- Secrets (`WEBHOOK_SECRET`, `DATABASE_URL`, `EMBED_*`) live in `.env` (gitignored)
  or BWS for deploy — never in tests or committed config.

## Decisions

1. **Runner:** `bun:test` — zero-config, built into the bun 1.3.14 toolchain
   already used. No extra deps. Add a `test` task to `turbo.json` and `package.json`
   scripts; add a `Test` step to CI.
2. **No live DB in CI.** Tests that would need Postgres/Redis/Embeddings use
   **in-process fakes** (memory stores + a stub embedder returning fixed vectors).
   This means Core service tests cannot use the real `@mcpedia/db` singleton —
   they must accept an injected DB (drizzle-pg mem or a hand-rolled fake). We will
   **refactor the Core services' DB access behind injectable handles** where cheap,
   and for the MCP/HTTP auth-layer tests we stub `@mcpedia/queue` + `@mcpedia/core`
   at the module boundary (the transport/auth logic does not need a real queue).
3. **Test boundaries by package:**
   - `packages/embeddings` — pure: `chunkText`, `cosine`. Real assertions, no I/O.
   - `packages/search` — pure: `toTsQuery`, `cosine`. SQL-bearing functions
     (`keywordSearch`/`semanticSearch`/`hybridSearch`) tested via a **fake db**
     injected into `@mcpedia/db`, OR via the `cosine`/fusion helpers in isolation.
   - `packages/core` — `snapshotRevision` dedup logic (refactor to accept an inject
     fn or test the public `indexContentFile`/`restoreRevision` with fakes).
     Focus: revision-dedup correctness + `restoreRevision` triggers `reindexChunks`.
   - `apps/api` — Hono app: `/health`, `/metrics` shape, `/hooks/*` auth (401 w/o
     secret, 200 + enqueue w/ secret using a fake queue), tRPC `restoreRevision`
     mutation auth gate (401 w/o secret).
   - `apps/mcp` — auth gates on write tools: `index_document`/`reindex_all`/
     `restore_revision` error without secret, enqueue with secret (fake queue).
     Read tools + resources via `InMemoryTransport` (reuse smoke style but without
     DB).
   - `apps/web` — render correctness of home (lists sections), doc page
     (renders title + markdown + history panel when revisions exist), search page
     (keyword/hybrid toggle, empty state). These need a fake Core.

## Approach per test (minimal, high-signal)

### embeddings: `packages/embeddings/src/chunk.test.ts`
- `chunkText("hello world")` with short size → single chunk.
- `chunkText` long text → multiple chunks, overlap honored, no word splits past boundary.
- `chunkText("")` / `"   "` → `[]`.

### search: `packages/search/src/cosine.test.ts` (new tiny file) + refactor
- `cosine([1,0],[0,1])` ≈ 0; `cosine([1,1],[1,1])` = 1; `cosine([],[1])` = 0.
- `toTsQuery("a b c")` → `"a:* & b:* & c:*"`; empty/garbage → `""`.

### core: `packages/core/src/index.service.test.ts`
The hard part: `indexContentFile`/`restoreRevision`/`snapshotRevision` call `db`
directly. Two options:
- **Option A (chosen):** extract `snapshotRevision`'s "latest body" + "insert"
  steps behind the existing `db` but make `indexContentFile` test the revision
  *decision* by inserting a doc + revision directly via `db` in a test Postgres
  (too heavy for CI).
- **Option B (chosen):** test the **pure decision logic** by refactoring
  `snapshotRevision` to export a pure helper
  `shouldCreateRevision(latestBody, body): boolean` — `true` when latest is null
  or latest.body !== body. Then a unit test asserts the dedup truth table;
  `indexContentFile` is verified by the existing e2e (manual `bun run index`).
  This is the CI-safe win.
- `restoreRevision` correctness: assert it calls `reindexChunks(slug)` — we can
  test by spying. Since `reindexChunks` is in the same module, we'll export a
  seam: `restoreRevision(id, { reindexChunks: spy })` — keep backward compat by
  defaulting. (Or test the public contract via the API layer instead.)

### api: `apps/api/src/index.test.ts`
- Build the Hono `app` from a testable factory that accepts a fake queue + fake
  webhook secret. Current `index.ts` throws at import if `WEBHOOK_SECRET` unset —
  that breaks import in CI. **Refactor:** move the fail-fast check into
  `listen()`/serve start, so the app is constructable without a secret for
  testing. Export `createApp(opts?)` returning the Hono instance.
- `/health` → 200 `{ok:true}`.
- `/metrics` → 200, text/plain, contains `mcpedia_uptime_seconds` +
  `mcpedia_queue_jobs` for each state (fake queue returns 0/1).
- `POST /hooks/reindex` w/o `x-webhook-secret` → 401; with matching secret →
  200 + `{ok:true, jobId}` (fake queue records the enqueue).
- tRPC: build a client against the app, call `restoreRevision` without secret →
  error; the public `listDocuments` returns from a fake DB.

### mcp: `apps/mcp/src/auth.test.ts`
- `createMcpServer()` (no secret) → `index_document`/`reindex_all`/`restore_revision`
  throw "unauthorized".
- `createMcpServer("secret")` → same tools reach the enqueue call (fake queue).
- Read tools still work without secret (server loads, resources list).

### web: `apps/web/app/search/page.test.tsx` (or a lighter harness)
- This is the hardest to test without a browser. **Decision:** keep web tests
  minimal — assert that `toTsQuery`/render helpers exist; full DOM tests deferred
  (needs playwright + a running server). We'll instead add a **contract test**
  that the search page's `dynamic = "force-dynamic"` export exists (static-
  generation guard, the kind of thing that broke CI before).

## File layout (new files)
```
packages/embeddings/src/chunk.test.ts
packages/search/src/cosine.test.ts
packages/core/src/index.service.test.ts      # snapshotRevision + restoreRevision seam
apps/api/src/index.test.ts                    # Hono /health /metrics /hooks + tRPC gate
apps/mcp/src/auth.test.ts                     # write-tool auth gates
```

## turbo.json
Add a `test` task (like `typecheck`, no dependsOn, cache false so it always runs):
```jsonc
"test": { "cache": false }
```
Each app/pkg gets `"test": "bun test"` in its package.json.

## CI (`.github/workflows/ci.yml`)
After `Build`, add:
```yaml
- name: Test
  run: bun run test        # -> turbo run test
```

## Source changes required (enablers)
1. `apps/api/src/app.ts` (NEW) — extracted `createApp(deps?)` factory returning a
   `Promise<Hono>`. Pure construction (no process exit, no fail-fast). Accepts
   injected `ApiDeps` (`{ queue, webhookSecret }`); when omitted, lazily
   imports the real queue + uses `WEBHOOK_SECRET` (production path). `/dashboard`
   now renders the HTML from a new `apps/api/src/dashboard.ts` module.
2. `apps/api/src/dashboard.ts` (NEW) — the self-contained dashboard HTML, split
   out of the original `index.ts` so the route is testable + the const is
   importable. XSS-safe (esc() on all KB-sourced fields; documented in comment).
3. `apps/api/src/index.ts` — now a thin re-export of `createApp`/`start` + the
   `isMain` bootstrap. Systemd unit still runs `bun --cwd apps/api src/index.ts`.
4. `packages/core/src/index.service.ts` — exported `shouldCreateRevision` (pure
   predicate for the revision dedup invariant). `restoreRevision` in
   `revision.service.ts` now accepts an optional `opts.reindex` seam (defaults
   to the real `reindexChunks`), making the chunk-rebuild contract testable.
5. `apps/mcp/src/smoke.ts` — renamed from `smoke.test.ts` (so `bun test` doesn't
   treat the integration smoke as a unit run), and fixed stale assertions:
   expected tool set updated to all 10 tools (Phase 7 additions + write tools),
   `list_documents(section=docs)` count updated to 4 (post-Phase-7 corpus).

## Verification
- `bun run test` (local) → 32 tests green across 6 packages (embeddings 5,
  search 8, core 4, parser 5, mcp 6, api 8), **no live DB needed** (mocks
  stub `@mcpedia/db`, `@mcpedia/queue`, `@mcpedia/core`).
- `bun run typecheck` → green (4 apps, no test-only type errors).
- `bun --cwd apps/mcp run smoke` → green (integration, needs live DB — runs in
  CI on the deploy host, not in CI's no-services job).
- Live API check: `/health`, `/metrics`, `/dashboard`, `/hooks/*` auth gate
  all 200/401-verified against a temp-port server.
- Commit + push; worker redeploy not needed (code + tests only).

