---
id: mcp-streamable-http
title: MCP Streamable HTTP Transport
type: documentation
tags:
  - mcp
  - protocol
  - http
  - infra
status: published
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# MCP Streamable HTTP Transport

The MCPedia MCP server is served over **Streamable HTTP** (the MCP 2025-03-26
transport) so remote clients — Claude, a Discord bot, a web frontend — can call its
tools and read its resources without spawning a stdio subprocess.

## Why stateless

The server uses `StreamableHTTPServerTransport` in **stateless mode**
(`sessionIdGenerator: undefined`):

- One `McpServer` + transport is created **per request**.
- No session affinity, no shared-transport `connect()` race, no session-map memory
  leak under burst traffic.
- Re-registering the 6 tools + 4 resources per request is negligible for a KB-sized
  corpus.

Stateful mode (a `sessionIdGenerator` returning a UUID) would require holding a
transport map keyed by session id and cleaning it up on `onclose`. For this read-mostly
knowledge base, stateless is simpler and equally correct.

## Endpoint

```
POST https://mcp.asepharyana.my.id/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
```

Responses use SSE framing (`event: message` / `data: {...}`) even for unary results.
Clients must send `Accept: application/json, text/event-stream` or the server returns
406. The MCP `initialize` handshake sets `protocolVersion: "2025-03-26"`.

## CORS

`/mcp` returns permissive CORS headers (`Access-Control-Allow-Origin: *`) so browser
clients can call it directly. Preflight `OPTIONS` is answered with 204.

## Auth for write tools

Read tools (`search_documents`, `get_document`, ...) are open. Write tools
(`index_document`, `reindex_all`, `restore_revision`) require the
`x-webhook-secret` header to match `WEBHOOK_SECRET` — the same shared secret used by
the git-sync webhook. A missing/invalid header makes the tool return an error before
any mutation.
