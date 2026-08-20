# MCPedia Phase 11 — CRUD + Auth + UI/UX Improvement

## Plan (spec BEFORE implementation, per user rule)

### Scope: 4 areas
1. **CRUD**: Create/Read/Update/Delete documents from web UI + MCP
2. **Auth**: Session-based auth for web edits; API key auth for MCP writes
3. **UI/UX**: Polish doc page, edit forms, search UX, dark mode
4. **Agent integration**: MCP tools for CRUD with auth

### Files to touch:
- `packages/db/` — migrations (users table, if needed)
- `apps/api/src/` — auth routes, CRUD tRPC routers
- `apps/mcp/src/` — add create/update/delete tools
- `apps/web/app/` — edit/create pages, auth UI

### Schema changes:
- Optional: `users` table if auth is user-based
- OR: simple `WEB_AUTH_TOKEN` env for admin access (simpler, fits single-author KB)

### Backend surface:
- **Web auth**: Cookie-based session OR single admin token in localStorage
  - Simpler approach: `POST /api/auth/login` (checks `ADMIN_PASSWORD` env) → sets cookie
  - Edit UI gated behind cookie check in server components
- **MCP auth**: `x-api-key` header for write tools (create/update/delete)
  - Read tools (list, get, search) — public
  - Write tools (create, update, delete, index_document, reindex_all, restore_revision) — require key
  - `createMcpServer(authKey?)` threads the header, same pattern as `x-webhook-secret`

### CRUD operations:
- **Create**: `POST /trpc/createDocument` (title, slug, section, body, tags)
  - Writes markdown file to `content/{section}/{slug}.md`
  - Triggers indexer (enqueues job or calls directly)
- **Update**: `POST /trpc/updateDocument` (slug, body, title, tags, status)
  - Updates file + creates revision + reindexes
- **Delete**: `POST /trpc/deleteDocument` (slug)
  - Removes file, DB rows, chunks; creates revision tombstone
- All mutations require auth (web cookie OR webhook secret OR MCP api-key)

### UI improvements:
- Edit button on doc pages (auth-gated) → link to `/docs/{slug}/edit`
- Create page: `/docs/create` with form (section dropdown, slug, title, tags, markdown editor)
- Edit page: `/docs/{slug}/edit` pre-fills from getDocument
- Search page: live search results with keyboard nav, better empty states
- Doc page: table of contents (auto-generated from h2), dark mode toggle

### Verification steps:
1. TDD: write failing tests for each new API endpoint/method first
2. `bun run typecheck` — green
3. `bun run test` — 32 existing + new tests green
4. `bun run build` — green
5. CI + Deploy passes
6. Browser: create doc → search sees it → edit doc → changes reflect → delete doc → gone
7. MCP: create_document tool with key → doc appears; without key → unauthorized

### Acceptance criteria:
- [ ] createDocument tRPC + MCP
- [ ] updateDocument tRPC + MCP  
- [ ] deleteDocument tRPC + MCP
- [ ] Web auth (cookie-based login)
- [ ] MCP write-tool auth (api-key)
- [ ] UI: edit/create pages
- [ ] UI: TOC + dark mode on doc pages
- [ ] All tests green, CI+Deploy passes
