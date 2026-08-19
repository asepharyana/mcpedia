import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listDocuments, getDocument, getRelated } from "@mcpedia/core";
import { keywordSearch } from "@mcpedia/search";

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

  return server;
}

// When run directly (bun run src/index.ts), serve over stdio.
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
}
