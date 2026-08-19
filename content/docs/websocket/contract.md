---
id: websocket-contract
title: WebSocket Contract
type: documentation
tags:
  - typescript
  - websocket
  - rpc
status: published
author: asep
created_at: 2026-08-19
updated_at: 2026-08-19
---

# WebSocket Contract

The WebSocket contract defines how clients establish a bidirectional connection
and exchange RPC-style messages with the server. It is the foundation for the
type-safe API described in the tRPC integration notes.

## Handshake

A client opens a single WebSocket connection and sends an `init` frame携带 an
auth token. The server answers with `ready` or closes the socket with code 4401
if the token is invalid.

## Message envelope

Every frame uses a JSON envelope:

```json
{ "id": "req-1", "method": "echo", "params": { "text": "hi" } }
```

The server replies with a matching `id` and either a `result` or an `error`
field. This request/response correlation is what makes the protocol feel like
RPC even though it rides on a single socket.

## Timeouts

If the server does not answer within the negotiated timeout, the client should
re-send with the same `id` rather than opening a new connection. See the
debugging writeup for a common timeout pitfall when proxies buffer frames.
