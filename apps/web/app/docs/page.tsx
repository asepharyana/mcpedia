import Link from "next/link";
import { listDocuments } from "@mcpedia/core";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "docs", label: "Documentation" },
  { id: "writeups", label: "Writeups" },
  { id: "research", label: "Research" },
  { id: "notes", label: "Notes" },
] as const;

export default async function DocsIndexPage() {
  const all = await listDocuments();
  const bySection = SECTIONS.map((section) => ({
    section,
    docs: all.filter((d) => d.section === section.id),
  }));

  return (
    <div>
      <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">All Documents</h1>

      {bySection.map(({ section, docs }) => {
        if (docs.length === 0) return null;
        return (
          <section key={section.id} className="mb-10">
            <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-4">
              {section.label}
            </h2>
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/${d.slug}`}
                    className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                  >
                    {d.title}
                  </Link>
                  <span className="text-xs text-[#62666d] ml-2">
                    {d.tags.slice(0, 2).map((t) => `#${t}`).join(" ") || "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
