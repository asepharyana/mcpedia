import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import type { DocSection } from "@mcpedia/core";

export const dynamic = "force-dynamic";

const SECTIONS: { id: DocSection; label: string }[] = [
  { id: "docs", label: "Documentation" },
  { id: "writeups", label: "Writeups" },
  { id: "research", label: "Research" },
  { id: "notes", label: "Notes" },
];

const SECTION_ICONS: Record<DocSection, string> = {
  docs: "📄",
  writeups: "📝",
  research: "🔬",
  notes: "📌",
};

export default async function DocsIndexPage() {
  const all = await listDocuments();

  // Group by section, sort by updatedAt desc for recency
  const bySection = SECTIONS.map((section) => ({
    section,
    docs: all
      .filter((d) => d.section === section.id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
  }));

  // Flatten + sort all docs by updatedAt for the hero "recent" strip
  const recent = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-4xl font-medium text-[#f7f8f8] mb-3">
          MCPedia Knowledge Base
        </h1>
        <p className="text-lg text-[#8a8f98] max-w-2xl leading-relaxed">
          A content-first knowledge base for humans and AI agents. Documents
          covering MCP protocol, TypeScript, infrastructure, and security.
        </p>

        {/* Search bar */}
        <div className="mt-8">
          <Link
            href="/search"
            className="relative flex items-center max-w-2xl group"
          >
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#62666d] group-focus-within:text-[#5e6ad2] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="w-full pl-10 pr-4 py-3 bg-[#191a1b] border border-[#1f2022] rounded-lg text-[#62666d] group-hover:border-[#5e6ad2]/40 transition-colors">
              Search documents, tags, authors...
            </span>
          </Link>
        </div>

        {/* Recent strip */}
        {recent.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => (
              <Link
                key={d.slug}
                href={`/${d.slug}`}
                className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl">
                    {SECTION_ICONS[d.section] || "📄"}
                  </span>
                  <time className="text-xs text-[#62666d]">
                    {new Date(d.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1">
                  {d.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-xs px-1.5 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Sections */}
      {bySection.map(({ section, docs }) => {
        if (docs.length === 0) return null;
        return (
          <section key={section.id} className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-medium text-[#d0d6e0] uppercase">
                {section.label}
              </h2>
              <Link
                href={`/${section.id}`}
                className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
              >
                View all ({docs.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((d) => (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-5 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-2xl">
                      {SECTION_ICONS[section.id] || "📄"}
                    </span>
                    <time className="text-xs text-[#62666d]">
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-2">
                    {d.title}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {d.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
