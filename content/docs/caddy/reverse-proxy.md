---
id: caddy-reverse-proxy
title: Caddy Reverse Proxy
type: documentation
tags:
  - caddy
  - reverse-proxy
  - tls
  - infra
status: published
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# Caddy Reverse Proxy

Caddy is the single reverse proxy on the host. Every public service sits behind it
and terminates TLS with automatic Let's Encrypt certificates. Understanding its
config model prevents the two recurring failure modes: **525 (origin TLS)** and
**404 (path routing)**.

## Config model

The live config is `/etc/caddy/Caddyfile`. It is a manual, tuned file — CI does not
deploy it, so the live file is the source of truth and must be kept in sync with any
repo reference.

A reusable snippet handles the common case:

```
(proxy) {
    encode zstd gzip
    header {
        -Server
        X-Content-Type-Options "nosniff"
    }
    reverse_proxy 127.0.0.1:{args[0]} {
        transport http {
            keepalive 120s
            dial_timeout 3s
        }
    }
}
```

A site block wires a domain to a backend port:

```
wiki.asepharyana.my.id {
    import proxy 4016
}
```

## Path routing: `handle` vs `handle_path`

`handle /trpc/*` forwards the request **with** the `/trpc` prefix preserved.
`handle_path /trpc/*` **strips** it before proxying. Stripping is wrong when the
upstream already mounts the route at `/trpc` — the upstream then receives `/` and 404s.

Rule: when the upstream already serves the path (e.g. Hono `app.all("/trpc/*")`),
use `handle`, not `handle_path`.

## 525 — origin TLS handshake failed

Cloudflare proxies every `*.asepharyana.my.id` record. If a subdomain has **no**
Caddy site block, Caddy has no certificate for that SNI and the TLS handshake dies →
Cloudflare returns 525. Fix: add the block, `caddy validate`, `systemctl reload caddy`.
The first request after adding a block triggers ACME certificate issuance; until it
completes the origin may briefly 525. That is expected and self-heals in ~10s.

## Slow upstreams

LLM gateways (9router) have time-to-first-token of 30–40s. The default
`response_header_timeout 30s` yields false 504s. Lengthen it for those blocks:

```
reverse_proxy 127.0.0.1:4014 {
    transport http {
        response_header_timeout 120s
        read_timeout 300s
        write_timeout 300s
    }
}
```
