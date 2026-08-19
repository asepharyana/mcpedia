import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listDocuments,
  getDocument,
  getRelated,
  semanticSearch,
  hybridSearch,
  keywordSearch,
  listRevisions,
  readContentFile,
} from "@mcpedia/core";
import { CONTENT_ROOT } from "@mcpedia/config";
import { join } from "node:path";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcpedia",
    version: "0.1.0",
  });

  server.registerTool(
    "search_documents",
    {
      description:
        "Full-text search across the MCPedia knowledge base (Postgres FTS). Returns ranked documents with a headline snippet.",
      inputSchema: z.object({
        query: z.string().describe("Free-text search query"),
        limit: z.number().int().positive().max(50).optional(),
      }),
    },
    async ({ query, limit }) => {
      const hits = await keywordSearch(query, limit ?? 20);
      return {
        content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_document",
    {
      description:
        "Fetch the full markdown body of a document by its slug (e.g. 'docs/websocket/contract').",
      inputSchema: z.object({
        slug: z.string().describe("Document slug, e.g. 'docs/websocket/contract'"),
      }),
    },
    async ({ slug }) => {
      const doc = await getDocument(slug);
      if (!doc) {
        return {
          content: [{ type: "text", text: `Document not found: ${slug}` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: doc.body }] };
    },
  );

  server.registerTool(
    "list_documents",
    {
      description: "List documents, optionally filtered by section.",
      inputSchema: z.object({
        section: z
          .enum(["docs", "writeups", "research", "notes"])
          .optional(),
      }),
    },
    async ({ section }) => {
      const docs = await listDocuments({ section });
      return {
        content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_related_documents",
    {
      description: "Return documents that share tags with the given slug.",
      inputSchema: z.object({
        slug: z.string(),
        limit: z.number().int().positive().max(20).optional(),
      }),
    },
    async ({ slug, limit }) => {
      const related = await getRelated(slug, limit ?? 5);
      return {
        content: [{ type: "text", text: JSON.stringify(related, null, 2) }],
      };
    },
  );

  server.registerTool(
    "semantic_search",
    {
      description:
        "Semantic (embedding) search across chunked document content. Best for conceptual/paraphrased queries that don't share exact keywords. Returns chunks ranked by cosine similarity.",
      inputSchema: z.object({
        query: z.string().describe("Natural-language query"),
        limit: z.number().int().positive().max(50).optional(),
      }),
    },
    async ({ query, limit }) => {
      const hits = await semanticSearch(query, limit ?? 10);
      return {
        content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
      };
    },
  );

  server.registerTool(
    "hybrid_search",
    {
      description:
        "Hybrid search fusing full-text (Postgres FTS) and semantic (embedding) signals via Reciprocal Rank Fusion. Best general-purpose search.",
      inputSchema: z.object({
        query: z.string().describe("Free-text or natural-language query"),
        limit: z.number().int().positive().max(50).optional(),
      }),
    },
    async ({ query, limit }) => {
      const hits = await hybridSearch(query, limit ?? 10);
      return {
        content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
      };
    },
  );

  // --- Phase 3: MCP Resources (read-only knowledge base surfaced via URIs) ---
  // mcpedia://docs                       -> list all published documents
  // mcpedia://docs/{slug}                -> full markdown body (from disk)
  // mcpedia://docs/{slug}/chunks         -> chunked preview (semantic slices)
  // mcpedia://docs/{slug}/revisions      -> revision history summary
  server.registerResource(
    "mcpedia-docs-list",
    "mcpedia://docs",
    {
      title: "MCPedia document index",
      description: "List of all published documents in the knowledge base.",
      mimeType: "application/json",
    },
    async (uri) => {
      const docs = await listDocuments();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(docs, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "mcpedia-doc-chunks",
    new ResourceTemplate("mcpedia://docs/{+slug}/chunks", { list: undefined }),
    {
      title: "MCPedia document chunks",
      description: "Preview of the embedded semantic chunks for a document.",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const slug = String(vars.slug);
      const doc = await getDocument(slug);
      if (!doc) throw new Error(`Document not found: ${slug}`);
      // Chunk the body the same way the indexer does (size 1000 / overlap 150)
      // so the resource mirrors what semantic search actually sees.
      const { chunkText } = await import("@mcpedia/embeddings");
      const chunks = chunkText(doc.body, { size: 1000, overlap: 150 });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              chunks.map((c, i) => ({ index: i, length: c.length, preview: c.slice(0, 200) })),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerResource(
    "mcpedia-doc-revisions",
    new ResourceTemplate("mcpedia://docs/{+slug}/revisions", { list: undefined }),
    {
      title: "MCPedia document revisions",
      description: "Revision history summary for a document.",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const slug = String(vars.slug);
      const revs = await listRevisions(slug, 20);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(revs, null, 2),
          },
        ],
      };
    },
  );

  // Registered LAST: the bare {+slug} template is greedy and would otherwise
  // swallow /chunks and /revisions URIs. Specific templates must match first.
  server.registerResource(
    "mcpedia-doc",
    new ResourceTemplate("mcpedia://docs/{+slug}", { list: undefined }),
    {
      title: "MCPedia document",
      description: "Full markdown body of a single document, read from disk (source of truth).",
      mimeType: "text/markdown",
    },
    async (uri, vars) => {
      const slug = String(vars.slug);
      const doc = await getDocument(slug);
      if (!doc) {
        throw new Error(`Document not found: ${slug}`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: doc.body,
          },
        ],
      };
    },
  );

  return server;
}

// When run directly (bun run src/index.ts), serve over stdio.
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
}
