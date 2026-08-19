import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { db } from "@mcpedia/db";
import { appRouter } from "./router";
import type { Context } from "./trpc";
import { enqueueIndexDoc, enqueueFullIndex } from "@mcpedia/queue";

const app = new Hono();

// Health check.
app.get("/health", (c) => c.json({ ok: true }));

// --- Phase 3: Git synchronization hook ---
// POST /hooks/reindex        -> enqueue a full-corpus reindex (git push webhook)
// POST /hooks/index?slug=... -> enqueue a single document reindex
// Returns the created job id(s). The worker processes them asynchronously.
app.post("/hooks/reindex", async (c) => {
  const job = await enqueueFullIndex("git-push");
  return c.json({ ok: true, jobId: job.id, kind: "full" });
});

app.post("/hooks/index", async (c) => {
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
