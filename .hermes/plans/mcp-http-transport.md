# MCP HTTP transport + deploy + review actions

## Goal
Make the MCPedia MCP server reachable over the network (not just stdio subprocess), so
remote MCP clients (Claude, a Discord bot, a web client) can call its 6 tools + 4 resources.
Serve via Streamable HTTP (MCP 2025-03-26 spec), deploy as a supervised systemd service,
expose through Caddy on a dedicated subdomain.

## Design decisions
- **StreamableHTTPServerTransport, stateless mode** (`sessionIdGenerator: undefined`).
  One McpServer + transport per request. No session map, no shared-transport connect race,
  no memory leak. Re-registering 6 tools + 4 resources per request is negligible for a KB.
- **New entry `apps/mcp/src/http.ts`** served by Node `http` (built-in), NOT mounted on the
  API app — keeps the MCP app's zod-4 isolation intact (api app is zod 3).
- **Port 4021** (next free in the 4000s range; 4020 is the API).
- **Subdomain `mcp.asepharyana.my.id`** -> 4021 (Cloudflare `*` wildcard already proxies it;
  Caddy auto-issues LE cert, no extra DNS work).
- **CORS** allow on `/mcp` (remote web clients need it).
- MCP tools are read-only (search/get/list/related + read-only resources) => open MCP is
  low-risk. No auth on MCP itself.

## Files
- `apps/mcp/src/http.ts` (NEW) — Node http server, `/mcp` route, stateless transport.
- `apps/mcp/package.json` — add `serve:http` script.
- `package.json` (root) — add `mcp:http` script (absolute bun path).
- `deploy/mcpedia-mcp.service` (NEW) — systemd unit, MCP_PORT=4021.
- `/etc/caddy/Caddyfile` — add `mcp.asepharyana.my.id { import proxy 4021 }`.

## Security finding (review, flagged not silently built)
The tRPC `restoreRevision` mutation is exposed UNauthenticated at
`https://wiki.asepharyana.my.id/trpc/restoreRevision` — anyone can revert a live doc.
The web UI's restore path calls `@mcpedia/core` directly (server component), so the tRPC
mutation is dead surface. Fix: guard the mutation with the existing WEBHOOK_SECRET header,
or drop it from the router. Will apply the guard (consistent with /hooks auth) unless user
prefers removal.

## Verification
- `bun --cwd apps/mcp run typecheck` green.
- Live: `curl -XPOST https://mcp.asepharyana.my.id/mcp` initialize -> 200 + serverInfo;
  tools/list -> 6 tools; resources/list -> 4 resources.
- `systemctl is-active mcpedia-mcp` == active.
- Commit + push.
