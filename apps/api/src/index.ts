import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context as HonoContext } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { db } from "@mcpedia/db";
import { appRouter } from "./router";
import type { Context } from "./trpc";
import { enqueueIndexDoc, enqueueFullIndex, getQueue, INDEX_QUEUE } from "@mcpedia/queue";
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

// --- Phase 7: Prometheus metrics (public, safe to scrape) ---
const startedAt = Date.now();
app.get("/metrics", async (c) => {
  const queue = getQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  const lines = [
    "# HELP mcpedia_uptime_seconds seconds since process start",
    "# TYPE mcpedia_uptime_seconds gauge",
    `mcpedia_uptime_seconds ${((Date.now() - startedAt) / 1000).toFixed(1)}`,
    `# HELP mcpedia_queue_jobs queue job counts for "${INDEX_QUEUE}"`,
    "# TYPE mcpedia_queue_jobs gauge",
    `mcpedia_queue_jobs{state="waiting"} ${waiting}`,
    `mcpedia_queue_jobs{state="active"} ${active}`,
    `mcpedia_queue_jobs{state="completed"} ${completed}`,
    `mcpedia_queue_jobs{state="failed"} ${failed}`,
    `mcpedia_queue_jobs{state="delayed"} ${delayed}`,
  ];
  return c.text(lines.join("\n") + "\n", 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

// Shared guard for the git-sync webhooks: require `x-webhook-secret` header to
// match the configured secret. Reject anything else with 401.
// Verify a git-provider webhook. Supports GitHub's native HMAC signature
// (X-Hub-Signature-256 = HMAC-SHA256 of the raw body with the webhook secret) and a
// plain `x-webhook-secret` header for manual/local triggers. GitHub does NOT send a
// custom header, so the HMAC path is what a real GitHub delivery will hit.
async function assertWebhookAuth(c: HonoContext): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;
  const raw = c.req.raw;
  const ghSig = raw.headers.get("x-hub-signature-256");
  if (ghSig && ghSig.startsWith("sha256=")) {
    try {
      const body = await raw.text();
      const mac = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
      const expected = `sha256=${mac}`;
      return timingSafeEqual(Buffer.from(ghSig), Buffer.from(expected));
    } catch {
      return false;
    }
  }
  const provided = raw.headers.get("x-webhook-secret");
  return provided != null && provided === WEBHOOK_SECRET;
}

// --- Phase 3: Git synchronization hook ---
// POST /hooks/reindex        -> enqueue a full-corpus reindex (git push webhook)
// POST /hooks/index?slug=... -> enqueue a single document reindex
// Returns the created job id(s). The worker processes them asynchronously.
app.post("/hooks/reindex", async (c) => {
  if (!(await assertWebhookAuth(c))) return c.json({ ok: false, error: "unauthorized" }, 401);
  const job = await enqueueFullIndex("git-push");
  return c.json({ ok: true, jobId: job.id, kind: "full" });
});

app.post("/hooks/index", async (c) => {
  if (!(await assertWebhookAuth(c))) return c.json({ ok: false, error: "unauthorized" }, 401);
  const slug = c.req.query("slug");
  if (!slug) return c.json({ ok: false, error: "slug query param required" }, 400);
  // slug is the relative path without extension, e.g. docs/websocket/contract
  const relPath = slug.endsWith(".md") || slug.endsWith(".mdx") ? slug : `${slug}.md`;
  const job = await enqueueIndexDoc(relPath, "git-push");
  return c.json({ ok: true, jobId: job.id, kind: "doc", relPath });
});

// --- Phase 7: observability dashboard (public) ---
// Self-contained HTML page that reads /metrics (same origin) and queries the MCP
// server (/mcp, CORS-open) directly from the browser. No build step, no deps.
app.get("/dashboard", (c) =>
  c.html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>MCPedia — Dashboard</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--border:#30363d;--fg:#e6edf3;--muted:#8b949e;--accent:#58a6ff;--ok:#3fb950;--err:#f85149}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg);color:var(--fg)}
header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
header h1{font-size:16px;margin:0;font-weight:600}header .dot{width:9px;height:9px;border-radius:50%;background:var(--ok)}
main{padding:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start}
.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px}
.card h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 10px}
.metric{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed var(--border)}
.metric:last-child{border-bottom:0}.metric b{color:var(--accent)}
.search{grid-column:1/-1}.search input{width:100%;padding:10px;background:#0d1117;border:1px solid var(--border);border-radius:8px;color:var(--fg);font:inherit}
.result{margin-top:10px}.hit{padding:8px 0;border-bottom:1px solid var(--border)}
.hit a{color:var(--accent);text-decoration:none}.hit span{color:var(--muted)}
.err{color:var(--err)}.pill{display:inline-block;padding:1px 7px;border-radius:999px;background:#21262d;border:1px solid var(--border);color:var(--muted);font-size:11px}
</style></head>
<body>
<header><span class="dot" id="live"></span><h1>MCPedia Dashboard</h1><span class="pill" id="uptime"></span></header>
<main>
  <section class="card"><h2>Index Queue (BullMQ)</h2><div id="queue"></div></section>
  <section class="card"><h2>Service</h2><div id="svc"></div></section>
  <section class="card search"><h2>Search the knowledge base (via MCP)</h2>
    <input id="q" placeholder="type a query, e.g. 'cloudflare 525 tls' and press Enter" autocomplete="off"/>
    <div class="result" id="results"></div>
  </section>
</main>
<script>
const MCP="/mcp";
// slug/title/section come from our own KB (server-side, trusted) — escape anyway
// for defense-in-depth (no user-supplied data ever reaches innerHTML here).
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function loadMetrics(){
  try{
    const t=await (await fetch("/metrics")).text();
    const get=(name)=>{const m=t.match(new RegExp(name+'\\\\s+([0-9.]+)'));return m?m[1]:'?'};
    document.getElementById("uptime").textContent="up "+get("mcpedia_uptime_seconds")+"s";
    const states=["waiting","active","completed","failed","delayed"];
    document.getElementById("queue").innerHTML=states.map(s=>
      '<div class="metric"><span>'+s+'</span><b>'+get('mcpedia_queue_jobs\\\\{state="'+s+'"\\\\}')+'</b></div>').join("");
    document.getElementById("svc").innerHTML=
      '<div class="metric"><span>metrics</span><b>live</b></div>'+
      '<div class="metric"><span>mcp</span><b>'+MCP+'</b></div>';
    document.getElementById("live").style.background="var(--ok)";
  }catch(e){
    document.getElementById("live").style.background="var(--err)";
    document.getElementById("queue").innerHTML='<div class="err">metrics fetch failed: '+e.message+'</div>';
  }
}
// MCP Streamable HTTP: initialize then tools/call (stateless, no session).
async function mcpCall(method,params){
  const res=await fetch(MCP,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const raw=await res.text();
  const ev=raw.split("\\n").find(l=>l.startsWith("data: "));
  if(!ev)throw new Error("no SSE data");
  return JSON.parse(ev.slice(6)).result;
}
async function search(q){
  const el=document.getElementById("results");el.innerHTML='<span class="muted">searching…</span>';
  try{
    await mcpCall("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"dashboard",version:"1"}});
    const r=await mcpCall("tools/call",{name:"hybrid_search",arguments:{query:q,limit:8}});
    const hits=JSON.parse(r.content[0].text);
    if(!hits.length){el.innerHTML='<span class="muted">no results</span>';return;}
    el.innerHTML=hits.map(h=>'<div class="hit"><a href="/'+esc(h.doc.slug)+'" target="_blank">'+esc(h.doc.title||h.doc.slug)+'</a> <span>'+esc(h.doc.section||"")+(h.rank!=null?" · rank "+h.rank.toFixed(3):"")+'</span></div>').join("");
  }catch(e){el.innerHTML='<div class="err">search failed: '+esc(e.message)+'</div>';}
}
document.getElementById("q").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.value.trim())search(e.target.value.trim())});
loadMetrics();setInterval(loadMetrics,5000);
</script></body></html>`),
);
app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts): Context => ({
      db,
      webhookSecret: opts.req.headers.get("x-webhook-secret") ?? undefined,
    }),
  }),
);

const port = Number(process.env.API_PORT ?? 4020);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MCPedia API listening on http://localhost:${info.port}`);
});
