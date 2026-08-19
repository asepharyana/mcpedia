import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import type { DocumentMeta } from "@mcpedia/core";

// Render at request time — content is in Postgres (not available at build in
// CI, which has no DB). Request-time rendering is instant at this corpus scale.
export const dynamic = "force-dynamic";

const SECTIONS = ["docs", "writeups", "research", "notes"] as const;

export default async function Home() {
  const all = await listDocuments();
  const bySection = SECTIONS.map((section) => ({
    section,
    docs: all.filter((d) => d.section === section),
  }));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">MCPedia</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A content-first knowledge base. Humans read the Web UI; AI agents use
          the MCP server. Both share one Core.
        </p>
      </section>

      {bySection.map(({ section, docs }) => (
        <section key={section}>
          <h2 className="text-lg font-medium capitalize mb-2">{section}</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-zinc-500">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {docs.map((d: DocumentMeta) => (
                <li key={d.slug} className="py-2">
                  <Link
                    href={`/${d.section}/${d.slug}`}
                    className="hover:underline font-medium"
                  >
                    {d.title}
                  </Link>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {d.tags.map((t) => `#${t}`).join(" ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
