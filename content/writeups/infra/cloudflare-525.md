---
id: cloudflare-525-writeup
title: Diagnosing Cloudflare 525 (Origin TLS Handshake Failed)
type: writeup
tags:
  - cloudflare
  - tls
  - 525
  - caddy
  - debugging
status: published
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# Diagnosing Cloudflare 525 (Origin TLS Handshake Failed)

A 525 appears between the user and the origin when Cloudflare (Strict TLS mode) cannot
complete the TLS handshake to the origin server. This writeup captures the debugging
loop that recurred while wiring new subdomains.

## Symptom

`curl https://<sub>.asepharyana.my.id` → `HTTP/2 525`. Browser shows Cloudflare's
"SSL handshake failed" page.

## Root causes (in order of likelihood)

1. **No Caddy site block for the SNI.** Cloudflare proxies every `*.asepharyana.my.id`
   record. A host without a matching Caddy `site` block has no certificate, so the
   handshake dies. This is the #1 cause and the one that bit `wiki` and `mcp`.
2. **Certificate still provisioning.** The first request after adding a block triggers
   ACME `http-01` issuance. Until the cert lands (~10s), the origin 525s. Self-heals.
3. **Wrong cert presented.** Rare here — Caddy serves the SNI-matched cert; a mismatch
   means the block points at the wrong backend or the cert store is stale.

## The debugging loop

```
curl -sI https://<sub>/            # 525?
grep -n "<sub>" /etc/caddy/Caddyfile   # block present?
sudo journalctl -u caddy | grep -i "tls\|acme\|<sub>"   # cert issued?
openssl s_client -connect 127.0.0.1:443 -servername <sub>   # origin cert valid?
```

If the block is missing: add `import proxy <port>`, `caddy validate`, `systemctl
reload caddy`. If the cert is mid-issuance: wait and re-test. Do **not** point Cloudflare
at a non-existent origin or set the SSL mode to Flexible — Flexible mode breaks already-
working Strict setups.

## Lesson

Every new subdomain needs (a) a Caddy site block and (b) a Cloudflare DNS record that
proxies to the origin. Omit either and you get a 525. The wildcard DNS means you only
add the Caddy side.
