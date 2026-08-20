import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import type { DocumentMeta } from "@mcpedia/core";
import { cookies } from "next/headers";

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

  // Auth check for edit/create buttons.
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">MCPedia</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A content-first knowledge base. Humans read the Web UI; AI agents use
          the MCP server. Both share one Core.
        </p>
        {canEdit && (
          <Link
            href="/create"
            className="inline-block mt-3 px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            + Create Document
          </Link>
        )}
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
                  href={`/${d.slug}`}
                  className="hover:underline font-medium"
                >
                  {d.title}
                </Link>
                {canEdit && (
                  <Link
                    href={`/${d.slug}/edit`}
                    className="ml-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    ✎
                  </Link>
                )}
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
