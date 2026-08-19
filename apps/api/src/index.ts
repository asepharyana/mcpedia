import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { db } from "@mcpedia/db";
import { appRouter } from "./router";
import type { Context } from "./trpc";
import { enqueueIndexDoc, enqueueFullIndex } from "@mcpedia/queue";
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

// Shared guard for the git-sync webhooks: require `x-webhook-secret` header to
// match the configured secret. Reject anything else with 401.
function assertWebhookAuth(c: { req: { header: (k: string) => string | undefined } }): boolean {
  const provided = c.req.header("x-webhook-secret");
  return provided != null && provided === WEBHOOK_SECRET;
}

// --- Phase 3: Git synchronization hook ---
// POST /hooks/reindex        -> enqueue a full-corpus reindex (git push webhook)
// POST /hooks/index?slug=... -> enqueue a single document reindex
// Returns the created job id(s). The worker processes them asynchronously.
app.post("/hooks/reindex", async (c) => {
  if (!assertWebhookAuth(c)) return c.json({ ok: false, error: "unauthorized" }, 401);
  const job = await enqueueFullIndex("git-push");
  return c.json({ ok: true, jobId: job.id, kind: "full" });
});

app.post("/hooks/index", async (c) => {
  if (!assertWebhookAuth(c)) return c.json({ ok: false, error: "unauthorized" }, 401);
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
    createContext: (): Context => ({ db }),
  }),
);

const port = Number(process.env.API_PORT ?? 4020);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MCPedia API listening on http://localhost:${info.port}`);
});
