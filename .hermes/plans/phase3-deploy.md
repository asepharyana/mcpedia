# Phase 3 — Deploy + git-sync wiring (remaining work)

Status: Phase 3/4 code is DONE and e2e-verified (webhook enqueue -> worker drain, 0 failed).
What was missing on the host: API + worker never ran as systemd services, and the GitHub
push webhook was never created. Also a real integration bug: `assertWebhookAuth` only
accepts a plain `x-webhook-secret` header, which GitHub does NOT send (GitHub delivers
`X-Hub-Signature-256` = HMAC-SHA256 of raw body). So a real GitHub webhook would 401.

## Changes
1. `apps/api/src/index.ts` — `assertWebhookAuth` now verifies GitHub `X-Hub-Signature-256`
   (HMAC-SHA256 of raw body w/ WEBHOOK_SECRET) and still accepts `x-webhook-secret` for manual tests.
2. root `package.json` scripts — `api`: `bun --cwd apps/api run dev` -> `bun --cwd apps/api src/index.ts`
   (the `run dev` form errors in bun 1.3.14; direct-file form verified booting + health). `worker` -> same form for consistency.
3. systemd — `cp deploy/*.service /etc/systemd/system`, `daemon-reload`, `enable --now mcpedia-api mcpedia-worker`.
4. Caddy — expose `/hooks/*` on `wiki.asepharyana.my.id` -> :4020 (no new DNS). Keep web on :4016.
5. GitHub webhook — `gh api repos/asepharyana/mcpedia/hooks` POST:
   `https://wiki.asepharyana.my.id/hooks/reindex`, content_type json, secret=WEBHOOK_SECRET, events=push.

## Verification
- `systemctl is-active mcpedia-api mcpedia-worker` == active.
- `curl /health` on :4020 -> ok.
- `curl -X POST https://wiki.asepharyana.my.id/hooks/reindex -H "X-Hub-Signature-256: ..."` (or x-webhook-secret) -> 200 + jobId; worker drains.
- `gh api .../hooks` lists the webhook.
- `turbo run typecheck` green; commit + push.
