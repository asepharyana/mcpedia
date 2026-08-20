import Link from "next/link";
import { listDocuments } from "@mcpedia/core";

export const dynamic = "force-dynamic";

const SECTIONS = ["docs", "writeups", "research", "notes"] as const;

export default async function DocsIndexPage() {
  const all = await listDocuments();
  const bySection = SECTIONS.map((section) => ({
    section,
    docs: all.filter((d) => d.section === section),
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">All Documents</h1>
      {bySection.map(({ section, docs }) => (
        <section key={section}>
          <h2 className="text-lg font-medium capitalize mb-3">{section}</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-zinc-500">No documents in this section.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link href={`/${d.slug}`} className="hover:underline">
                    {d.title}
                  </Link>
                  <span className="text-xs text-zinc-500 ml-2">
                    {d.author || "unknown"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
