import { test, expect, mock } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// -----------------------------------------------------------------------
// Mock the heavy dependencies so the MCP server is fully testable without
// Postgres / Redis / embeddings. We record calls to the mutating functions
// so we can assert the auth gate is (or isn't) the reason a tool errors.
// -----------------------------------------------------------------------
const calls = {
  enqueueIndexDoc: [] as Array<[string, string]>,
  enqueueFullIndex: [] as Array<[string]>,
  restoreRevision: [] as Array<[string]>,
};

mock.module("@mcpedia/queue", () => ({
  enqueueIndexDoc: (relPath: string, reason: string) => {
    calls.enqueueIndexDoc.push([relPath, reason]);
    return Promise.resolve({ id: `doc__${relPath}` });
  },
  enqueueFullIndex: (reason: string) => {
    calls.enqueueFullIndex.push([reason]);
    return Promise.resolve({ id: `full__${Date.now()}` });
  },
  getQueue: () => ({
    getWaitingCount: () => Promise.resolve(0),
    getActiveCount: () => Promise.resolve(0),
    getCompletedCount: () => Promise.resolve(0),
    getFailedCount: () => Promise.resolve(0),
    getDelayedCount: () => Promise.resolve(0),
  }),
  INDEX_QUEUE: "mcpedia-index",
}));

mock.module("@mcpedia/core", () => ({
  keywordSearch: () => Promise.resolve([]),
  getDocument: () => Promise.resolve(null),
  listDocuments: () => Promise.resolve([]),
  getRelated: () => Promise.resolve([]),
  semanticSearch: () => Promise.resolve([]),
  hybridSearch: () => Promise.resolve([]),
  listRevisions: () => Promise.resolve([]),
  getRevision: () => Promise.resolve(null),
  restoreRevision: (id: string) => {
    calls.restoreRevision.push([id]);
    return Promise.resolve({ slug: "docs/test", documentId: "d1" });
  },
  readContentFile: () => "",
}));

// Import AFTER mocking so the modules resolve to our fakes.
const { createMcpServer } = await import("../src/index");

async function connect(secret?: string) {
  const server = createMcpServer(secret);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: "test", version: "0.0.1" });
  await client.connect(clientT);
  return { server, client };
}

function reset() {
  calls.enqueueIndexDoc.length = 0;
  calls.enqueueFullIndex.length = 0;
  calls.restoreRevision.length = 0;
}

// --- Auth gates on write tools ---

test("index_document without auth secret -> tool returns isError", async () => {
  reset();
  const { client, server } = await connect(); // no secret
  const res = await client.callTool({
    name: "index_document",
    arguments: { slug: "docs/foo" },
  });
  expect(res.isError).toBe(true);
  expect(calls.enqueueIndexDoc).toHaveLength(0);
  await client.close();
  await server.close();
});

test("index_document WITH auth secret -> enqueues job", async () => {
  reset();
  const { client, server } = await connect("real-secret");
  const res = await client.callTool({
    name: "index_document",
    arguments: { slug: "docs/foo" },
  });
  expect(res.isError).toBeFalsy();
  const text = (res.content as any[])[0].text;
  const parsed = JSON.parse(text);
  expect(parsed.ok).toBe(true);
  expect(parsed.jobId).toBeTruthy();
  expect(calls.enqueueIndexDoc).toHaveLength(1);
  expect(calls.enqueueIndexDoc[0][0]).toBe("docs/foo.md");
  await client.close();
  await server.close();
});

test("reindex_all without auth -> isError; with auth -> enqueues", async () => {
  reset();
  const { client, server } = await connect();
  let res = await client.callTool({ name: "reindex_all", arguments: {} });
  expect(res.isError).toBe(true);
  expect(calls.enqueueFullIndex).toHaveLength(0);
  await client.close();
  await server.close();

  const { client: c2, server: s2 } = await connect("real-secret");
  res = await c2.callTool({ name: "reindex_all", arguments: {} });
  expect(res.isError).toBeFalsy();
  expect(calls.enqueueFullIndex).toHaveLength(1);
  await c2.close();
  await s2.close();
});

test("restore_revision without auth -> isError; with auth -> calls core.restoreRevision", async () => {
  reset();
  const { client, server } = await connect();
  let res = await client.callTool({
    name: "restore_revision",
    arguments: { id: "rev-123" },
  });
  expect(res.isError).toBe(true);
  expect(calls.restoreRevision).toHaveLength(0);
  await client.close();
  await server.close();

  const { client: c2, server: s2 } = await connect("real-secret");
  res = await c2.callTool({
    name: "restore_revision",
    arguments: { id: "rev-123" },
  });
  expect(res.isError).toBeFalsy();
  expect(calls.restoreRevision).toHaveLength(1);
  expect(calls.restoreRevision[0][0]).toBe("rev-123");
  await c2.close();
  await s2.close();
});

test("queue_status is public (no auth needed)", async () => {
  const { client, server } = await connect(); // no secret
  const res = await client.callTool({ name: "queue_status", arguments: {} });
  expect(res.isError).toBeFalsy();
  const text = (res.content as any[])[0].text;
  expect(JSON.parse(text).queue).toBe("mcpedia-index");
  await client.close();
  await server.close();
});

test("tool discovery works without auth (read tools present)", async () => {
  const { client, server } = await connect();
  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  expect(names).toContain("search_documents");
  expect(names).toContain("get_document");
  expect(names).toContain("list_documents");
  expect(names).toContain("semantic_search");
  expect(names).toContain("hybrid_search");
  expect(names).toContain("get_related_documents");
  // Write tools are registered regardless of secret — the gate is in the
  // handler, not registration.
  expect(names).toContain("index_document");
  expect(names).toContain("reindex_all");
  expect(names).toContain("restore_revision");
  expect(names).toContain("queue_status");
  await client.close();
  await server.close();
});
