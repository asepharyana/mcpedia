import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { db } from "@mcpedia/db";
import { appRouter } from "./router";
import type { Context } from "./trpc";

const app = new Hono();

// Health check.
app.get("/health", (c) => c.json({ ok: true }));

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
