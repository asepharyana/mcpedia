import { initTRPC } from "@trpc/server";
import { db } from "@mcpedia/db";

export interface Context {
  db: typeof db;
  // Raw `x-webhook-secret` header from the incoming request, if present.
  // State-changing tRPC mutations (restoreRevision) require it to match
  // WEBHOOK_SECRET; read-only procedures ignore it.
  webhookSecret?: string;
}

export const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
