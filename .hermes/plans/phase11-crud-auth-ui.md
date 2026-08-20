# MCPedia Phase 11 — CRUD + Auth + Web UI

## STATUS: ✅ ALL DONE (committed f8b525d, CI+Deploy success)

## Plan (spec BEFORE implementation, per user rule)

### Scope: 4 areas
1. **CRUD**: Create/Read/Update/Delete documents from web UI + MCP
2. **Authentication**: MCP/API writes (x-webhook-secret), Web CRUD (cookie-based ADMIN_PASSWORD)
3. **Web + Agent access**: Web forms + MCP write tools
4. **UI/UX**: Edit forms, TOC, dark mode

### Requirements:
1. Source of truth = filesystem (markdown files in content/{section}/{slug}.md)
2. DB mirrors disk (documents, document_chunks, document_revisions tables)
3. Single indexing path: indexContentFile in @mcpedia/core
4. Auth: MCP/API writes use WEBHOOK_SECRET; Web uses ADMIN_PASSWORD cookie
5. Slug rules: [a-z0-9][a-z0-9/_-]*, no //, no .. traversal
6. No breaking existing features (32 original tests still green)
7. UI/UX: edit button on doc pages, ?edit=1 inline form, /create page, login, TOC, dark mode

### Implementation

#### Backend
- `packages/parser`: added `stringifyFile()` (writes markdown with frontmatter)
- `packages/core`: `createDocument`, `updateDocument`, `deleteDocument` (file I/O + DB + revision + chunks)
- `apps/api`: tRPC CRUD routers (`requireWriteAuth`), fixed `requireWriteAuth` env-constant bug (now uses `ctx.expectedSecret` injected from `createApp(deps)`)
- `apps/mcp`: 3 new write tools (`create_document`, `update_document`, `delete_document`) gated by `x-webhook-secret`

#### Web UI
- `apps/web/app/api/auth/login/route.ts`: POST login → verify ADMIN_PASSWORD, set `mcpedia_admin` cookie
- `apps/web/app/api/docs/route.ts`: POST (create)
- `apps/web/app/api/docs/[...slug]/route.ts`: PUT (update), DELETE (delete)
- `apps/web/app/components/DocForm.tsx`: shared create/edit form
- `apps/web/app/create/page.tsx`: create form
- `apps/web/app/login/page.tsx`: login form
- `apps/web/app/[section]/[...slug]/page.tsx`: `?edit=1` inline edit, TOC, dark mode, Edit button
- `apps/web/app/docs/page.tsx`: docs index listing
- `apps/web/app/components/TOC.tsx`: auto-generated TOC from h2/h3 headings
- `apps/web/app/components/ThemeToggle.tsx`: dark mode toggle (localStorage + system default)

#### New deps (minimal — only for UX):
- `rehype-slug` (heading anchors for TOC links)
- `github-slugger` (matching slug algorithm for TOC client-side)

### Gotchas (learned the hard way)
1. tRPC fetch adapter expects input directly as JSON body, NOT JSON-RPC envelope
2. requireWriteAuth compared `ctx.webhookSecret !== WEBHOOK_SECRET` (module-level env constant) — untestable. Fixed: `ctx.webhookSecret !== ctx.expectedSecret` (injected per-app via deps).
3. Next.js catch-all routes: `[...slug]/edit/` is INVALID (catch-all must be last). Used `?edit=1` query param instead.
4. Next.js App Router: PUT/DELETE on `/api/docs/route.ts` doesn't match `/api/docs/{slug}` — need dynamic route `/api/docs/[...slug]/route.ts`.
5. `@env.example` should be updated.
6. `ADMIN_PASSWORD` must be set in VPS `.env` (deployed separately).

### Verification
- Typecheck: ✅ 4/4 apps green
- Tests: ✅ 40 tests green (32 original + 8 new), no DB/Redis
- Build: ✅ web compiled
- CI: ✅ success → Deploy: ✅ success
- Live: all 9 endpoints 200, 13 MCP tools live, CRUD e2e verified (login → create → view → delete via cookie auth), MCP create_document verified via header auth
- Test docs cleaned up (404 confirmed)

### Commits
1. `57f9001` feat: Phase 11 — CRUD + auth + web UI
2. `1dd16eb` feat(web): Phase 11 UI/UX — TOC, dark mode toggle, /docs index
3. `98437cb` fix(web): /api/docs accepts cookie OR header (not both required)
4. `8ed8c67` fix(web): split PUT/DELETE into /api/docs/[...slug]/route.ts
5. `f8b525d` chore: remove test docs
