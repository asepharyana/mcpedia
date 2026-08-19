import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  getDocument,
  getRelated,
  hybridSearch,
  keywordSearch,
  listDocuments,
  semanticSearch,
} from "@mcpedia/core";

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
});

export type AppRouter = typeof appRouter;
