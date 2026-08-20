import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { cookies } from "next/headers";
import type { DocSection } from "@mcpedia/core";

export const dynamic = "force-dynamic";

const SECTIONS: { id: DocSection; label: string; icon: string; desc: string }[] = [
  {
    id: "docs",
    label: "Documentation",
    icon: "📄",
    desc: "Setup guides, API references, and protocol specs.",
  },
  { id: "writeups", label: "Writeups", icon: "📝", desc: "Post-mortems, debugging stories, and case studies." },
  { id: "research", label: "Research", icon: "🔬", desc: "Deep-dive analysis, architecture notes, and experiments." },
  { id: "notes", label: "Notes", icon: "📌", desc: "Quick references, patterns, and gotchas." },
];

export default async function HomePage() {
  const all = await listDocuments();
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  const recent = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  const bySection = SECTIONS.map((s) => ({
    ...s,
    docs: all.filter((d) => d.section === s.id).slice(0, 4),
    total: all.filter((d) => d.section === s.id).length,
  }));

  return (
    <>
      {/* ── Hero ── */}
      <section className="mb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-medium text-[#f7f8f8] mb-4 leading-tight">
            MCPedia
          </h1>
          <p className="text-xl text-[#8a8f98] mb-8 leading-relaxed max-w-2xl">
            A content-first knowledge base for humans and AI agents. Read the
            web docs, call the MCP server, or browse the full document archive.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5e6ad2] text-white rounded-lg font-medium hover:bg-[#6a75e0] transition-colors"
            >
              Browse Documents
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#191a1b] border border-[#1f2022] text-[#d0d6e0] rounded-lg font-medium hover:border-[#5e6ad2]/40 hover:text-[#f7f8f8] transition-colors"
            >
              Search
            </Link>
          </div>

          {/* Search box */}
          <Link
            href="/search"
            className="relative flex items-center max-w-2xl group mb-12"
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
      </section>

      {/* ── Section Overview ── */}
      <section className="mb-16">
        <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-6">
          Browse by section
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bySection.map((s) => (
            <Link
              key={s.id}
              href={`/${s.id}`}
              className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-5 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
            >
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors mb-1">
                {s.label}
              </h3>
              <p className="text-xs text-[#62666d] mb-2 line-clamp-2">
                {s.desc}
              </p>
              <span className="text-xs text-[#8a8f98]">
                {s.total} document{s.total !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent Documents ── */}
      {recent.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-sm font-medium text-[#d0d6e0] uppercase">
              Recently updated
            </h2>
            <Link
              href="/docs"
              className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => (
              <Link
                key={d.slug}
                href={`/${d.slug}`}
                className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xl">
                    {SECTIONS.find((s) => s.id === d.section)?.icon || "📄"}
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
        </section>
      )}

      {/* ── MCP info ── */}
      <section className="border-t border-[#1f2022] pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-medium text-[#f7f8f8] mb-1">AI agents</h3>
            <p className="text-sm text-[#8a8f98]">
              MCP server at{" "}
              <code className="text-[#d0d6e0] bg-[#191a1b] px-1.5 py-0.5 rounded">
                mcp.asepharyana.my.id/mcp
              </code>
              . All tools available via Streamable HTTP transport.
            </p>
          </div>
          <Link
            href="https://github.com/modelcontextprotocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
          >
            MCP spec →
          </Link>
        </div>
      </section>
    </>
  );
}
