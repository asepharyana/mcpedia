import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "docs", label: "Documentation" },
  { id: "writeups", label: "Writeups" },
  { id: "research", label: "Research" },
  { id: "notes", label: "Notes" },
] as const;

export default async function HomePage() {
  const all = await listDocuments();
  const bySection = SECTIONS.map((section) => ({
    ...section,
    docs: all.filter((d) => d.section === section.id),
  }));

  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-[2.5rem] font-light text-[#f7f8f8] mb-2">
          MCPedia
        </h1>
        <p className="text-[#8a8f98] text-lg max-w-2xl">
          A content-first knowledge base. Humans read the Web UI; AI agents
          use the MCP server. Both share one Core.
        </p>
      </div>

      {canEdit && (
        <div className="mb-8">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#5e6ad2] text-white hover:bg-[#7170ff] transition-colors font-medium text-sm"
          >
            + Create Document
          </Link>
        </div>
      )}

      {bySection.map(({ id, label, docs }) => {
        if (docs.length === 0) return null;
        return (
          <section key={id} className="mb-10">
            <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-4">
              {label}
            </h2>
            <ul className="space-y-px text-sm">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/${d.slug}`}
                    className="group flex items-start gap-3 py-2 text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                  >
                    <span className="text-[#8a8f98] group-hover:text-[#d0d6e0] w-5 text-center mt-0.5">
                      •
                    </span>
                    <span>
                      <span className="font-medium">{d.title}</span>
                      {d.tags.length > 0 && (
                        <span className="mt-0.5 text-xs text-[#62666d]">
                          {" "}
                          {d.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
