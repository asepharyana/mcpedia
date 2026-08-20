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

## Phase 6 — Network deployment + review hardening ✅ DONE

> Closed the real gaps found during review: the MCP server was stdio-only (unreachable
> over the network) and the tRPC API was not routed on the domain (swallowed by web →
> `/trpc/*` returned Next.js 404). Also found + fixed a security hole.

- [x] **MCP over Streamable HTTP** — `apps/mcp/src/http.ts` serves the 6 tools + 4
  resources via MCP 2025-03-26 Streamable HTTP on `:4021`, stateless mode
  (`sessionIdGenerator: undefined`, one server+transport per request, CORS on `/mcp`).
  Deployed as `mcpedia-mcp.service`; reachable at `https://mcp.asepharyana.my.id/mcp`.
  Stdio entry (`bun run mcp`) retained for local subprocess use.
- [x] **tRPC API routed on the domain** — Caddy `wiki.asepharyana.my.id` now forwards
  `/trpc/*` (+ `/hooks/*`, `/health`) to the API on `:4020`; web stays on `:4016`.
  Read-only procedures (search, list, revisions, job status) are public; the
  `restoreRevision` mutation is gated by `x-webhook-secret` (see security fix below).
- [x] **Security: lock down `restoreRevision`** — the state-changing tRPC mutation was
  anonymously callable over the network. Now requires `x-webhook-secret` (consistent
  with `/hooks` auth). The Web UI calls `@mcpedia/core` directly in a server component,
  so the gate does not affect the UI's restore button. Verified: no-secret → 401-class
  rejection, with-secret → reaches handler.
- [x] **All four services live + supervised** — `mcpedia-web` (:4016), `mcpedia-api`
  (:4020), `mcpedia-worker` (BullMQ), `mcpedia-mcp` (:4021) all `active`, reboot-safe.
  GitHub push webhook → `https://wiki.asepharyana.my.id/hooks/reindex` (verified 200,
  worker drains, 0 failed).

### Verification done (real, against live services)
- `https://mcp.asepharyana.my.id/mcp` initialize → 200 + serverInfo; tools/list → 6;
  resources/list → 4 (Streamable HTTP SSE framing).
- `https://wiki.asepharyana.my.id/` → 200; `/health` → 200; `/trpc/listDocuments` → 200.
- GitHub push webhook delivers 200; `queueStatus` shows completed:N, failed:0.
- `turbo run typecheck` green across all 4 apps.

## Phase 7 — Corpus, MCP write-tools + auth, observability ✅ DONE

> Closed the remaining review gaps: tiny corpus (4 docs), MCP read-only (no write/auth),
> no observability.

- [x] **Content corpus grown** — added 5 real docs (Caddy reverse proxy, BullMQ workers,
  MCP Streamable HTTP, Postgres FTS, Cloudflare-525 debugging writeup) across
  docs/writeups/notes. `bun run index` reindexed: **9 documents, 17 chunks, 5 new
  revisions** (was 4 docs). Search/semantic/revisions now operate on a real corpus.
- [x] **MCP write-tools + auth** — added `index_document`, `reindex_all`,
  `restore_revision` (write, require `x-webhook-secret`) and `queue_status` (public).
  `createMcpServer(authSecret?)` threads the request header; stdio keeps write tools
  open (trusted local). Verified: unauthenticated `index_document` → `isError` +
  "unauthorized"; authenticated → enqueues job, worker drains.
- [x] **Observability** — `GET /metrics` on the API (Prometheus text exposition:
  `mcpedia_uptime_seconds`, `mcpedia_queue_jobs{state=...}`). Exposed on the domain at
  `https://wiki.asepharyana.my.id/metrics`. Public, safe to scrape.

### Verification done (real, against live services)
- `https://wiki.asepharyana.my.id/metrics` → 200 Prometheus text (uptime + queue gauges).
- `tools/list` over MCP → 10 tools (6 read + 4 new). `index_document` auth gate works.
- Worker drained the MCP-enqueued job (completed count incremented, failed:0).
- `turbo run typecheck` green across all 4 apps.

## Phase 8 — Dashboard (observability UI) ✅ DONE

> The metrics endpoint existed (Phase 7) but had no consumer. Added a zero-dependency
> dashboard so the KB is actually observable + searchable from a browser.

- [x] **`GET /dashboard`** on the API — self-contained HTML (no build, no deps) that:
  - pulls `/metrics` (same origin) and renders queue gauges (waiting/active/completed/
    failed/delayed) + uptime, refreshing every 5s with a live-dot status indicator;
  - runs a live **search box** that calls the MCP `hybrid_search` tool directly from the
    browser (MCP `/mcp` is CORS-open), returning ranked hits that link to the web doc
    page (`/docs/...`).
- [x] XSS hardening: all KB-sourced fields (`slug`/`title`/`section`/error message)
  are `esc()`-escaped before `innerHTML` (defense-in-depth; data is server-trusted).
- [x] Caddy: `wiki.asepharyana.my.id/dashboard` → :4020.

### Verification done (real)
- `https://wiki.asepharyana.my.id/dashboard` → 200, serves the page (title + JS present).
- `/metrics` → 200, 7 gauge lines including `mcpedia_queue_jobs{state=...}`.
- MCP `hybrid_search` from browser path returns real ranked hits (verified the exact
  `tools/call` payload the dashboard issues; shape `{doc:{slug,title,section},rank}`).
- Dashboard link points to working web doc route `/docs/<slug>` (verified 200).
- `turbo run typecheck` green.

## Phase 9 — Test coverage + CI gating ✅ DONE

> Before Phase 9 the only test was an integration smoke (`apps/mcp/src/smoke.test.ts`)
> requiring a live DB; its assertions had also rotted (expected 6 tools, now 10). Added
> a real `bun:test` suite that runs green in CI with **no external services** via
> in-process module mocking.

- [x] **Test infra** — `turbo.json` `test` task (cache:false); `test` script on every
  package/app that has `.test.ts` files; `@types/bun` added to root devDeps;
  `tsconfig.base.json` registers `types: ["bun","node"]`; CI step
  `bun run test` added after `Build`.
- [x] **`@mcpedia/embeddings`** (5 tests) — `chunkText`: empty input, single chunk,
  multi-chunk split, overlap/word-boundary integrity, default options.
- [x] **`@mcpedia/parser`** (5 tests) — `parseFile`: frontmatter extraction, section
  derivation from top-level dir, invalid type/status fallbacks, missing-field
  defaults, body excludes delimiter.
- [x] **`@mcpedia/search`** (8 tests) — `cosine` (orthogonal/identical/zero-vector/
  mismatched-length/negative) + `toTsQuery` (AND-prefix, sanitization, empty/garbage).
- [x] **`@mcpedia/core`** (4 tests) — `shouldCreateRevision` dedup truth table (no prior
  revision → snapshot; identical body → skip; changed body → snapshot; empty vs
  non-empty). `restoreRevision` gained an `opts.reindex` seam for the chunk-rebuild
  contract.
- [x] **`apps/api`** (8 tests) — refactored `index.ts` → `app.ts` `createApp(deps?)`
  factory (pure construction, injectable `QueueLike`); `dashboard.ts` extracted;
  `/health`, `/metrics`, `/hooks/reindex` (401 w/o secret, 200 w/ secret),
  `/hooks/index` (400 w/o slug, 200 w/ slug+secret, 401 wrong secret), `/dashboard`.
- [x] **`apps/mcp`** (6 tests) — write-tool auth gates via `InMemoryTransport`:
  `index_document`/`reindex_all`/`restore_revision` error without secret and enqueue
  with secret (mocked `@mcpedia/queue` + `@mcpedia/core`); `queue_status` public;
  tool discovery lists all 10 tools regardless of secret (gate is in handler).
- [x] **Fixed rot** — renamed `smoke.test.ts` → `smoke.ts` (so `bun test` doesn't run the
  integration smoke as a unit test) and updated stale assertions (10-tool set, 4 docs
  in `docs` section).

### Verification done (real)
- `bun run test` → 32 tests green across 6 packages, **no DB/Redis** (all fakes).
- `bun run typecheck` → 4 apps green (no test-only type errors).
- `bun --cwd apps/mcp run smoke` → SMOKE OK (integration, live DB).
- Live API (temp port): `/health`→200, `/metrics`→200 gauges, `/hooks/reindex`→401/200.
- CI workflow now runs `bun run test`.

### Files changed
```
new:    apps/api/src/app.ts                 # createApp factory
new:    apps/api/src/dashboard.ts           # dashboard HTML module
new:    packages/embeddings/src/chunk.test.ts
new:    packages/parser/src/parse.test.ts
new:    packages/search/src/cosine.test.ts
new:    packages/core/src/index.service.test.ts
new:    apps/api/src/app.test.ts
new:    apps/mcp/src/auth.test.ts
mod:    turbo.json, package.json, tsconfig.base.json, .github/workflows/ci.yml
mod:    apps/api/src/index.ts (thin re-export), apps/api/src/router.ts (unchanged)
renamed: apps/mcp/src/smoke.test.ts -> smoke.ts (fixed stale assertions)
```

## Phase 10 — Audit + Bug fixes + CI/CD deploy (live verification)

> Full feature audit against live services. Found + fixed one real bug. Added the
> missing CI/CD deploy pipeline.

### Bug: Frontmatter leaking into rendered doc pages + MCP doc body

- **Symptom:** Doc pages showed raw YAML frontmatter (`id: websocket-contract`,
  `title: WebSocket Contract`, etc.) as visible plain text between `<hr/>`
  markers. MCP `mcpedia://docs/{+slug}` resource had the same leak.
- **Root cause:** `getDocument()` in `@mcpedia/core` preferred the on-disk file
  via `readFileSync(abs, "utf8")` — returning **raw** file content including the
  `---` frontmatter block. The indexer correctly stripped frontmatter via
  `parseFile` (gray-matter), but `getDocument` bypassed it. `ReactMarkdown`
  rendered `---` as `<hr/>` and the YAML as paragraphs.
- **Fix:** `packages/core/src/document.service.ts` — replaced `readFileSync` with
  `parseFile(abs, row.path).body` (same frontmatter stripping as the indexer).
  DB fallback (`row.body`) unchanged (already clean).
- **Verified:** 9/9 doc pages render clean (no frontmatter `id:` text, proper
  `<h2>` + `<code>` elements in SSR HTML); MCP `mcpedia://` doc body resource
  returns clean markdown (starts with `# WebSocket Contract`).

### Audit findings (all phases verified live)

| Phase | Feature | Live check | Status |
|-------|---------|------------|--------|
| P1 | Web UI `/docs/<section>/<slug>` | 200, renders markdown | ✅ |
| P1 | Search page (`?q=` + `?mode=hybrid`) | 200, returns results | ✅ |
| P1 | MCP stdio + HTTP (`/4021`) | 10 tools, 4 resources | ✅ |
| P2 | Semantic/hybrid search | returns ranked chunks | ✅ |
| P2 | tRPC API on domain (`/trpc/*`) | listDocuments → 4 docs | ✅ |
| P3 | BullMQ worker drains jobs | queue completed 17→19 after enqueue | ✅ |
| P3 | Revision system | listRevisions → rev #1 "phase4-final-clean" | ✅ |
| P3 | Git webhook auth gate | 401 w/o secret, 200 w/ secret | ✅ |
| P4 | Dashboard | `/dashboard` → 200 HTML | ✅ |
| P6 | All 4 systemd services | web/api/mcp/worker all `active` | ✅ |
| P6 | restoreRevision mutation locked | 401 w/o secret, executes w/ secret | ✅ |
| P7 | 10 MCP tools (6 read + 4 write) | tools/list → 10 | ✅ |
| P7 | Write-tool auth gate | reindex_all w/o secret → isError | ✅ |
| P7 | Prometheus metrics | `/metrics` → 7 gauges, 200 | ✅ |
| P8 | Dashboard live search | `fetch("/metrics")` + `hybrid_search` via `/mcp` | ✅ |
| P9 | Test suite | 6/6 packages, 32 tests, 0 fail | ✅ |

### Notes / non-bugs
- Doc URLs follow `/<section>/<slug>` (e.g. `/docs/caddy/reverse-proxy`,
  `/writeups/infra/cloudflare-525`, `/notes/postgres/full-text-search`).
  The route is `[section]/[...slug]` — `/docs/websocket/contract` works because
  the section IS `docs` for that doc; `/notes/postgres/fts` does not (the correct
  slug is `notes/postgres/full-text-search`).
- `restoreRevision` via tRPC needs the `x-webhook-secret` as an **HTTP header**
  (not inside the JSON body) — the fetch adapter reads `c.req.raw.headers`.

### CI/CD deploy pipeline (Phase 10 addition)

Before this audit the CI workflow only built+tested — it did **not** deploy.
The VPS services were configured manually (systemd units in `deploy/`). Added a
`deploy.yml` workflow per the nix-ci-deploy pattern (CI builds, deploy is separate):

- **Trigger:** `workflow_run` on `CI` completion (only runs if CI passes).
- **Build:** same as CI (bun install + typecheck + web build) on the GitHub
  runner — fails fast if the build is broken.
- **Deploy:** SSHes to the VPS over the public IP (`45.127.35.244`, not the
  Tailscale `100.79.111.61` which GitHub runners can't reach), pulls from git,
  reinstalls deps, rebuilds the web app, and restarts all 4 services via
  `sudo systemctl restart` (NOPASSWD already configured for `code` user).
- **Secrets** (GitHub repo secrets, not files): `SSH_DEPLOY_HOST`,
  `SSH_DEPLOY_PORT`, `SSH_DEPLOY_USER`, `SSH_DEPLOY_KEY` (ed25519 deploy key).
  Deploy key's public half is in `/home/code/.ssh/authorized_keys` on the VPS.

#### Gotchas discovered + fixed during setup
1. **SSH host = public IP, not Tailscale IP.** `100.79.111.61` is a Tailscale
  `tailscale0` interface IP (CGNAT `100.64.0.0/10`); GitHub Actions runners can't
  route to it. Use the real public IP `45.127.35.244` (port 22 open in iptables).
2. **SSH key storage.** Storing the key via shell variable (`gh secret set --body "$VAR"`)
  mangles newlines → `ssh.ParsePrivateKey: no key found`. Store directly from file:
  `cat keyfile | gh secret set SSH_DEPLOY_KEY --repo ...`
   Use `appleboy/ssh-action@v1` (not `@v1.1.0`) which correctly parses the key.
   Add `-o IdentitiesOnly=yes` to prevent "too many authentication failures".
3. **Key rotation.** Force-pushing amended commits changes the SHA but CI triggers
  on `push: branches: [main]` (CI) + `workflow_run` (deploy) — both fire correctly.

### Verification done (real)
- CI `workflow_run` → Deploy triggers after CI success; all 4 services `active`.
- All public URLs return 200: web `/`, `/docs/...`, `/search`, `/dashboard`,
  `/metrics`, `/trpc/*`, `mcp.asepharyana.my.id/mcp`.
- Doc pages render clean markdown (no frontmatter); History panel + Restore work.

## Phase 11 — CRUD + Auth + Web UI ✅ DONE

> User requested: "perbagus agar jadi CRUD, pastikan ada autentikasi dan bisa
> manual dari web atau lewat agent melalui MCP, dan perbaui UI/UXnya."

### Backend (Core + API + MCP)

- [x] **`packages/parser` — `stringifyFile()`** — serialize `DocumentMeta` + body
  back to a markdown file with YAML frontmatter (gray-matter). Round-trip stable
  with `parseFile`.
- [x] **`@mcpedia/core` — CRUD functions:**
  - `createDocument({slug, title, section, body, type?, status?, author?, tags?})`
    — writes file to `content/{section}/{slug}.md`, upserts `documents` row,
    snapshots revision, indexes chunks.
  - `updateDocument(slug, {...})` — writes file, updates DB row, snapshots
    revision (if body changed), reindexes chunks.
  - `deleteDocument(slug)` — removes file + `documents`/`document_chunks`/
    `document_revisions` rows.
  - Slug validation: `[a-z0-9][a-z0-9/_-]*`, no `//`, no `..` traversal.
- [x] **`apps/api` — tRPC CRUD routers** — `createDocument`, `updateDocument`,
  `deleteDocument` (all `.use(requireWriteAuth)`). Fixed `requireWriteAuth` to
  compare against `ctx.expectedSecret` (injected from deps) instead of the
  module-level `WEBHOOK_SECRET` env constant — latent bug that made the middleware
  untestable without env manipulation.
- [x] **`apps/mcp` — 3 new write tools** — `create_document`, `update_document`,
  `delete_document` (all require `x-webhook-secret`). Tools: 10 → 13.
- [x] **Auth** — MCP/API writes reuse the existing `WEBHOOK_SECRET` /
  `x-webhook-secret` pattern. Web CRUD adds cookie-based auth: `ADMIN_PASSWORD`
  env + `/api/auth/login` (HMAC-signed `mcpedia_admin` cookie, HttpOnly).

### Web UI

- [x] **`/create` page** — form (section/type/status/title/slug/tags/author/body),
  POSTs to `/api/docs` with `x-webhook-secret`.
- [x] **`?edit=1` on doc pages** — inline edit form (`DocForm` component),
  PUTs to `/api/docs/{slug}`.
- [x] **`/login` page** — password → `/api/auth/login` → cookie → redirect `/create`.
- [x] **Edit buttons** — homepage "+ Create Document" + per-doc "✎" (auth-gated);
  doc page "Edit" button (auth-gated).
- [x] **TOC** — doc page auto-generates a table of contents from `h2` headings.
- [x] **Dark mode** — toggle persisted in `localStorage`, defaults to system.
- [x] **`/api/docs` REST routes** — POST (create), PUT (update), DELETE (delete),
  all `x-webhook-secret` gated.

### Files changed
```
new: apps/web/app/api/auth/login/route.ts  # cookie-based login + verify
new: apps/web/app/api/docs/route.ts        # GET (list) + POST (create)
new: apps/web/app/api/docs/[...slug]/route.ts  # PUT (update) + DELETE (delete)
new: apps/web/app/components/DocForm.tsx   # shared create/edit form
new: apps/web/app/components/Sidebar.tsx   # client-side doc navigation tree
new: apps/web/app/components/TOC.tsx       # auto-generated TOC (github-slugger)
new: apps/web/app/components/ThemeToggle.tsx  # dark mode toggle
new: apps/web/app/create/page.tsx          # create UI
new: apps/web/app/login/page.tsx           # login UI
new: apps/web/app/docs/page.tsx            # docs index listing
mod: apps/web/app/layout.tsx               # Linear design: sticky header + sidebar + dark canvas
mod: apps/web/app/page.tsx                 # editorial-style homepage w/ section doc listings
mod: apps/web/app/[section]/[...slug]/page.tsx # Linear doc layout (breadcrumb, TOC, metadata)
mod: apps/web/app/search/page.tsx          # dark-themed search w/ result cards
mod: apps/web/app/components/Markdown.tsx  # Linear typography + rehype-slug
mod: apps/web/app/globals.css              # Inter font, Linear dark-mode-first palette
mod: apps/web/app/app/api/docs/route.ts    # dual auth: cookie OR x-webhook-secret
mod: apps/web/app/api/docs/[...slug]/route.ts
mod: packages/core/src/document.service.ts # createDocument/updateDocument/deleteDocument
mod: packages/core/src/index.service.ts    # export snapshotRevision
mod: packages/core/src/index.ts            # re-export CRUD + types
mod: packages/parser/src/index.ts          # stringifyFile
mod: packages/config/src/index.ts          # ADMIN_PASSWORD
mod: apps/api/src/router.ts                # CRUD routers + fix requireWriteAuth
mod: apps/api/src/app.ts                   # createContext passes expectedSecret
mod: apps/api/src/trpc.ts                  # Context.expectedSecret
mod: apps/mcp/src/index.ts                 # 3 new CRUD write tools
mod: apps/mcp/src/auth.test.ts             # +4 CRUD auth tests
mod: apps/api/src/app.test.ts              # +5 tRPC CRUD auth tests
mod: .env.example                          # ADMIN_PASSWORD
new dep: rehype-slug                       # heading anchors for TOC links
new dep: github-slugger                    # matching slug algorithm for client-side TOC
```

### Gotchas / lessons
1. **tRPC fetch adapter** expects input directly as JSON body, NOT JSON-RPC
   envelope (`{"slug":...}` not `{"jsonrpc":"2.0","method":...,"params":{...}}`).
2. **`requireWriteAuth` env-constant bug** — comparing `ctx.webhookSecret !== WEBHOOK_SECRET`
   (module-level env constant) is untestable. Fix: thread `expectedSecret` through
   `Context` from `createApp(deps)`.
3. **Next.js catch-all routes** — `[...slug]/edit/` is invalid (catch-all must be
   last). Used `?edit=1` query param instead. Also, Next.js App Router won't match
   PUT/DELETE on `/api/docs/route.ts` for nested paths — need a dynamic segment
   `/api/docs/[...slug]/route.ts`.
5. **`stringifyFile` YAML** — quote string values with `JSON.stringify` for
   special-char safety; arrays use `[...]` syntax.
6. **Next.js SSG + DB** — client components (`"use client"`) don't block SSG
   during `next build` even if they fetch at runtime. Used for Sidebar (fetches
   /api/docs at runtime) to avoid ECONNREFUSED on CI.
7. **MCP SDK zod-v4 skew** — `@modelcontextprotocol/sdk@1.30` compiled `.d.ts`
   references zod-4 internal types. Pin `zod: ^4.0.0` in the MCP app (not
   workspace-wide) to match the SDK.
8. **StreamableHTTP transport headers** — use `requestInit: { headers: {...} }`
   (not a top-level `headers` option) on `StreamableHTTPClientTransport`.
9. **SDK type noise** — use type-cast helpers (`as AnyContent`, `as CallToolResult`)
   for the SDK's content union types which don't expose `.content[0].text` cleanly.


## Phase 12 — MCP Client + Full Layout Overhaul ✅ DONE

> User: "buat mcp untuk client nya" (create the MCP client) + "fokus ke web nya"
> (the user also said the UI was "boring, only style changed despite requesting
> a full layout overhaul").

### MCP Client (`apps/mcp-client/`)

New independent bun workspace package that connects to the MCPedia MCP server
over Streamable HTTP and provides both a programmatic API + CLI interface.

- **`src/client.ts`** — `McpediaClient` class wrapping the SDK's
  `StreamableHTTPClientTransport` + `Client`. Typed methods for all 13 tools:
  `listDocuments`, `getDocument`, `search`, `semanticSearch`, `hybridSearch`,
  `getRelated`, `indexDocument`, `reindexAll`, `queueStatus`, `createDocument`,
  `updateDocument`, `deleteDocument`, `listTools`, `callTool`, `listResources`,
  `readResource`, `disconnect`. Accepts custom headers (`x-webhook-secret` for
  write tools).
- **`src/index.ts`** — Interactive REPL (`bun run chat`): `/tools`, `/resources`,
  `/search`, `/ss`, `/hybrid`, `/doc`, `/related`, `/create` (prompts), `/update`,
  `/delete`, `/index`, `/status`, `/help`, `/quit`.
- **`src/ask.ts`** — One-shot CLI (`bun run ask <cmd> [args]`) for scripting.
- **`src/client.test.ts`** — 7 tests (mock SDK, no network/DB).

### Layout Overhaul (Linear design system)

Complete web UI redesign, not just style changes:

- **Dark-mode-first** — near-black canvas (`#08090a`), white-opacity borders
  (`rgba(255,255,255,0.05–0.08)`), Inter font with `cv01/ss03` features.
- **Sticky header** — MCPedia brand + Docs/Search/Login + theme toggle.
- **Sticky sidebar** (xl+) — hierarchical doc tree with indented children.
- **Editorial homepage** — H1 + description, "Create Document" button,
  section-organized doc listings with tag previews.
- **Doc page** — breadcrumb nav links, title + metadata bar (author/date/tags),
  TOC (CONTENTS), clean prose rendering, Related + History sections.
- **Create/Edit** — `/create` page, `?edit=1` inline form (DocForm).
- **Login** — `/login` with dark-themed form + brand-indigo CTA.
- **Search** — `/search?q=` with dark-themed results + snippets.
- **Docs index** — `/docs` listing all documents by section.

### Gotchas
- Next.js catch-all `[...slug]/edit/` is invalid — used `?edit=1` query param.
- Next.js App Router: PUT/DELETE need `/api/docs/[...slug]/route.ts`.
- tRPC fetch adapter expects JSON body directly (not JSON-RPC envelope).
- `requireWriteAuth` env-constant bug: use `ctx.expectedSecret` from deps.
- Next.js SSG + DB: Sidebar as `"use client"` to avoid DB connection during build.
- MCP SDK zod-v4 skew: pin `zod: ^4.0.0` in the MCP app.
- `StreamableHTTPClientTransport`: use `requestInit: { headers }` not top-level `headers`.

- **Tooling:** bun workspaces + Turborepo (repo already used bun; pnpm rejected to minimize churn).
- **DB:** imrnes Postgres `100.121.180.82:6432/mcpedia` for both dev and deploy; driver `prepare:false` (PgBouncer). Docker Compose reserved for future prod.
- **Phase 1 scope:** Core + Web + MCP only. tRPC/Hono API, pgvector, auth, BullMQ deferred (YAGNI).

## Phase 13 — CTF Writeup Template System + Table Rendering Fix ✅ DONE

> User: "apakah bisa diperbagus agar isi kontennya bisa memiliki bagian contohnya
> jika untuk writeup ctf kan ada banyak event ctf nya dan tiap event banyak wu nya"
> → User clarified: "jadikan dinamis field nya jangan static begini, jadi yg
> membuat yg menentukan isinya" (make it dynamic, not static — content creators
> determine the fields).

### Problem
CTF writeups need per-event organization (a CTF event has many challenges/writeups).
No standardized template existed. Additionally, **tables weren't rendering** —
two bugs:

1. **`remark-gfm` missing** — `react-markdown` without the GFM plugin rendered
   markdown table pipe characters as plain text, not as `<table>` HTML.
2. **`@tailwindcss/typography` not installed** — the `Markdown.tsx` component uses
   `prose` classes for typography, but the plugin wasn't registered, so all
   markdown content (tables, headings, paragraphs) had zero CSS styling.

### Fixes
- **Installed `remark-gfm@4`** — enables GFM table/strikethrough/task-list parsing
  in `ReactMarkdown`. Tables now render as proper `<table>`/`<thead>`/`<tbody>`/
  `<th>`/`<td>` HTML.
- **Installed `@tailwindcss/typography@0.5.20`** — `@plugin "@tailwindcss/typography"`
  directive in `globals.css` (Tailwind v4 approach). Generates `prose` CSS including
  `prose table` styles, `prose-headings:`, `prose-code:` etc.
- **Added custom dark-theme table CSS** in `globals.css` for `prose table`,
  `prose th`, `prose td` with dark-mode-appropriate colors.
- **Added `overflow-x-auto` wrapper** in `Markdown.tsx` for responsive table scrolling.

### Dynamic Custom Fields System
Replaced hardcoded CTF fields (event/challenge/category/difficulty/points) with
a **fully content-driven** system:

- **`documents.extra_fields` JSONB column** — stores arbitrary key-value metadata
  per document (migration `0003_document_extra_fields.sql`).
- **`parseFile`** — any frontmatter key not in the standard set (`title`,
  `type`, `section`, `status`, `author`, `tags`, `created_at`, `updated_at`) is
  automatically extracted as an `extraField` → stored in DB + rendered as badge.
- **`stringifyFile`** — writes `extraFields` back to YAML frontmatter for
  round-trip stability (parse → stringify → parse yields same result).
- **`DocForm`** — new "+ Add field" UI lets content creators add ANY metadata
  key at create/edit time. Auto-labels and auto-styles common patterns:
  - `difficulty` → colored badge (easy:green, medium:yellow, hard:red)
  - `points` → purple badge with "pts" suffix
  - `event` → purple badge with trophy icon
  - Any other key → labeled badge (e.g. "Category: pwn")
- **API routes** (`POST /api/docs`, `PUT /api/docs/[...slug]`) — `splitPayload()`
  separates standard CRUD fields from custom fields, sends custom fields as
  `extraFields` to `createDocument`/`updateDocument`.
- **`toMeta`** (search → DB mapping) — spreads `extraFields` from DB row into
  `DocumentMeta`, making them available to the UI.

### CTF Writeup Template + Sample
- **`content/writeups/ctf/template/writeup-template.md`** — standardized template
  with: Challenge Info table, Initial Recon, Approach, Step-by-Step Solve,
  Flag, Summary sections.
- **`content/writeups/ctf/defcon-quals-2024/pwn-100-ret2win-alignment.md`** —
  sample writeup demonstrating the template with frontmatter fields:
  `event: DEF CON CTF Quals 2024`, `challenge: pwn-100`, `category: pwn`,
  `difficulty: easy`, `points: 100`.

### Deploy workflow fix
- Added `db:push` step to deploy workflow for schema migrations (with `yes |`
  to auto-accept non-interactive confirmation prompts).
- Fixed `bun run index` → `bun run scripts/indexer.ts` (explicit path to avoid
  resolution ambiguity in SSH deploy context).

### Verification done (real, against live services)
- All endpoints return 200: `/`, `/docs`, `/docs/mcp/streamable-http`,
  `/notes/postgres/full-text-search`, `/writeups/ctf/defcon-quals-2024/pwn-100-...`,
  `/writeups/ctf/template/writeup-template`, `/search`, `/login`, `/create`,
  `/dashboard`, `/metrics`.
- CTF writeup page renders: TOC (all h2 headings auto-linked), Challenge Info
  table (thead + tbody + cells), code blocks, dynamic badges (Event/purple,
  Category/default, Challenge/default, Difficulty/green, Points/purple).
- Postgres FTS doc renders table properly (GFM + typography CSS working).
- `bun run test` → 7 task groups pass. `turbo run typecheck` → green across 14 packages.
- DB `extra_fields` column verified: `ALTER TABLE documents ADD COLUMN
  extra_fields jsonb DEFAULT '{}'::jsonb NOT NULL`.
