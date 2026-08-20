import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context as HonoContext } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { db } from "@mcpedia/db";
import { appRouter } from "./router";
import type { Context } from "./trpc";
import { enqueueIndexDoc, enqueueFullIndex, getQueue, INDEX_QUEUE } from "@mcpedia/queue";
import { WEBHOOK_SECRET } from "@mcpedia/config";

// Fail fast: never expose an open git-sync endpoint. If the operator hasn't
// set WEBHOOK_SECRET, refuse to start rather than run an unauthenticated hook.
if (!WEBHOOK_SECRET) {
  throw new Error(
    "WEBHOOK_SECRET is not set — /hooks/* would be open. Set it (see .env.example) before starting the API.",
  );
}

const app = new Hono();

// Health check (no auth — safe to expose).
app.get("/health", (c) => c.json({ ok: true }));

// --- Phase 7: Prometheus metrics (public, safe to scrape) ---
const startedAt = Date.now();
app.get("/metrics", async (c) => {
  const queue = getQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  const lines = [
    "# HELP mcpedia_uptime_seconds seconds since process start",
    "# TYPE mcpedia_uptime_seconds gauge",
    `mcpedia_uptime_seconds ${((Date.now() - startedAt) / 1000).toFixed(1)}`,
    `# HELP mcpedia_queue_jobs queue job counts for "${INDEX_QUEUE}"`,
    "# TYPE mcpedia_queue_jobs gauge",
    `mcpedia_queue_jobs{state="waiting"} ${waiting}`,
    `mcpedia_queue_jobs{state="active"} ${active}`,
    `mcpedia_queue_jobs{state="completed"} ${completed}`,
    `mcpedia_queue_jobs{state="failed"} ${failed}`,
    `mcpedia_queue_jobs{state="delayed"} ${delayed}`,
  ];
  return c.text(lines.join("\n") + "\n", 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

// Shared guard for the git-sync webhooks: require `x-webhook-secret` header to
// match the configured secret. Reject anything else with 401.
// Verify a git-provider webhook. Supports GitHub's native HMAC signature
// (X-Hub-Signature-256 = HMAC-SHA256 of the raw body with the webhook secret) and a
// plain `x-webhook-secret` header for manual/local triggers. GitHub does NOT send a
// custom header, so the HMAC path is what a real GitHub delivery will hit.
async function assertWebhookAuth(c: HonoContext): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;
  const raw = c.req.raw;
  const ghSig = raw.headers.get("x-hub-signature-256");
  if (ghSig && ghSig.startsWith("sha256=")) {
    try {
      const body = await raw.text();
      const mac = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
      const expected = `sha256=${mac}`;
      return timingSafeEqual(Buffer.from(ghSig), Buffer.from(expected));
    } catch {
      return false;
    }
  }
  const provided = raw.headers.get("x-webhook-secret");
  return provided != null && provided === WEBHOOK_SECRET;
}

// --- Phase 3: Git synchronization hook ---
// POST /hooks/reindex        -> enqueue a full-corpus reindex (git push webhook)
// POST /hooks/index?slug=... -> enqueue a single document reindex
// Returns the created job id(s). The worker processes them asynchronously.
app.post("/hooks/reindex", async (c) => {
  if (!(await assertWebhookAuth(c))) return c.json({ ok: false, error: "unauthorized" }, 401);
  const job = await enqueueFullIndex("git-push");
  return c.json({ ok: true, jobId: job.id, kind: "full" });
});

app.post("/hooks/index", async (c) => {
  if (!(await assertWebhookAuth(c))) return c.json({ ok: false, error: "unauthorized" }, 401);
  const slug = c.req.query("slug");
  if (!slug) return c.json({ ok: false, error: "slug query param required" }, 400);
  // slug is the relative path without extension, e.g. docs/websocket/contract
  const relPath = slug.endsWith(".md") || slug.endsWith(".mdx") ? slug : `${slug}.md`;
  const job = await enqueueIndexDoc(relPath, "git-push");
  return c.json({ ok: true, jobId: job.id, kind: "doc", relPath });
});

// Mount tRPC at /trpc/*. The fetch adapter is the canonical Bun/Hono adapter.
app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts): Context => ({
      db,
      webhookSecret: opts.req.headers.get("x-webhook-secret") ?? undefined,
    }),
  }),
);

const port = Number(process.env.API_PORT ?? 4020);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MCPedia API listening on http://localhost:${info.port}`);
});
