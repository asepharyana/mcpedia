import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/index";

async function main() {
  const server = createMcpServer();
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);

  const client = new Client({ name: "smoke", version: "0.0.1" });
  await client.connect(clientT);

  // 1) tool discovery
  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  console.log("tools:", names.join(", "));
  const expected = [
    "get_document",
    "get_related_documents",
    "list_documents",
    "search_documents",
  ].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`tool set mismatch: ${names.join(",")}`);
  }

  // 2) search_documents
  const search = await client.callTool({
    name: "search_documents",
    arguments: { query: "websocket", limit: 10 },
  });
  const hits = JSON.parse((search.content as any)[0].text);
  if (!Array.isArray(hits) || hits.length < 1) {
    throw new Error("search_documents returned no hits");
  }
  console.log(`search_documents("websocket") => ${hits.length} hits`);
  console.log("  top:", hits[0].doc.slug, hits[0].doc.title);

  // 3) get_document
  const get = await client.callTool({
    name: "get_document",
    arguments: { slug: "docs/websocket/contract" },
  });
  const body = (get.content as any)[0].text;
  if (!body.includes("WebSocket Contract")) {
    throw new Error("get_document returned unexpected body");
  }
  console.log("get_document('docs/websocket/contract') => body ok (len", body.length, ")");

  // 4) get_document not found
  const missing = await client.callTool({
    name: "get_document",
    arguments: { slug: "nope/missing" },
  });
  if (!(missing as any).isError) {
    throw new Error("get_document should report isError for missing doc");
  }
  console.log("get_document('nope/missing') => isError ok");

  // 5) list_documents
  const list = await client.callTool({
    name: "list_documents",
    arguments: { section: "docs" },
  });
  const docs = JSON.parse((list.content as any)[0].text);
  if (docs.length !== 1) throw new Error("list_documents docs != 1");
  console.log("list_documents(section=docs) =>", docs.length, "doc");

  await client.close();
  await server.close();
  console.log("\nSMOKE OK");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SMOKE FAIL:", e);
    process.exit(1);
  });
