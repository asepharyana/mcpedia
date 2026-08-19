---
id: websocket-timeout
title: Debugging a WebSocket Timeout Behind a Proxy
type: writeup
tags:
  - websocket
  - debugging
  - proxy
status: published
author: asep
created_at: 2026-08-19
updated_at: 2026-08-19
---

# Debugging a WebSocket Timeout Behind a Proxy

A recurring incident: the browser WebSocket connects, sends one frame, then
silently times out. The server logs show no error. Root cause: the reverse
proxy was buffering frames and only flushing on connection close.

## Symptoms

- Connection opens (101 Switching Protocols).
- First message never reaches the upstream.
- Client hits its own 30s timeout and reconnects, creating a storm.

## Fix

Disable proxy buffering for the WebSocket upgrade route and ensure the proxy
does not apply an idle timeout shorter than the application's heartbeat
interval. After that, frames flowed immediately and the timeout disappeared.

## Lesson

Always confirm at the proxy layer whether frames are buffered before assuming
the application server is at fault.
