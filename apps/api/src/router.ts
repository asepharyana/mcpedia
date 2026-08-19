import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  getDocument,
  getRelated,
  hybridSearch,
  keywordSearch,
  listDocuments,
  semanticSearch,
  listRevisions,
  getRevision,
  restoreRevision,
} from "@mcpedia/core";
import { getQueue, INDEX_QUEUE } from "@mcpedia/queue";
import { getConnection, BULLMQ_PREFIX } from "@mcpedia/queue/client";

export const appRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(({ input }) => keywordSearch(input.q, input.limit)),

  semanticSearch: publicProcedure
    .input(z.object({ q: z.string(), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => semanticSearch(input.q, input.limit)),

  hybridSearch: publicProcedure
    .input(z.object({ q: z.string(), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => hybridSearch(input.q, input.limit)),

  getDocument: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => getDocument(input.slug)),

  listDocuments: publicProcedure
    .input(z.object({ section: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => listDocuments(input ?? {})),

  related: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ input }) => getRelated(input.slug, input.limit)),

  // --- Phase 3: revisions ---
  revisions: publicProcedure
    .input(z.object({ slug: z.string(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => listRevisions(input.slug, input.limit)),

  getRevision: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => getRevision(input.id)),

  restoreRevision: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => restoreRevision(input.id)),

  // --- Phase 3: async job status ---
  jobStatus: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const queue = getQueue();
      const job = await queue.getJob(input.id);
      if (!job) return { exists: false };
      const state = await job.getState();
      const failedReason = job.failedReason;
      const returnvalue = job.returnvalue;
      const progress = job.progress;
      return {
        exists: true,
        id: job.id,
        name: job.name,
        state,
        progress,
        failedReason,
        returnvalue,
        attemptsMade: job.attemptsMade,
      };
    }),

  queueStatus: publicProcedure.query(async () => {
    const queue = getQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return {
      queue: INDEX_QUEUE,
      prefix: BULLMQ_PREFIX,
      counts: { waiting, active, completed, failed, delayed },
    };
  }),
});

export type AppRouter = typeof appRouter;
