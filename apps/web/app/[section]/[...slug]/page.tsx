import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";
import TOC from "@/components/TOC";

// Render at request time (content in Postgres, not available at build time).
export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ section: string; slug: string[] }>;
  searchParams: Promise<{ edit?: string }>;
}

const SECTION_LABEL: Record<string, string> = {
  docs: "Documentation",
  writeups: "Writeup",
  research: "Research",
  notes: "Note",
};

const SECTION_ICON: Record<string, string> = {
  docs: "📄",
  writeups: "📝",
  research: "🔬",
  notes: "📌",
};

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { section, slug } = await params;
  const { edit } = await searchParams;
  const fullSlug = `${section}/${slug.join("/")}`;
  const doc = await getDocument(fullSlug);
  if (!doc) notFound();

  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  // Edit mode: inline form
  if (edit === "1" && canEdit) {
    return (
      <div>
        <Link
          href={`/${doc.slug}`}
          className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] mb-4 inline-block"
        >
          ← Back to {doc.title}
        </Link>
        <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">
          Edit: {doc.title}
        </h1>
        <DocForm
          mode="edit"
          slug={fullSlug}
          secret={WEBHOOK_SECRET}
          initial={{
            title: doc.title,
            body: doc.body,
            section: doc.section,
            type: doc.type,
            status: doc.status,
            tags: doc.tags,
            author: doc.author,
          }}
        />
      </div>
    );
  }

  const related = await getRelated(fullSlug, 5);
  const revisions = await listRevisions(fullSlug, 10);

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#62666d] mb-6">
        <Link
          href="/"
          className="hover:text-[#d0d6e0] transition-colors"
        >
          MCPedia
        </Link>
        <span>/</span>
        <Link
          href="/docs"
          className="hover:text-[#d0d6e0] transition-colors"
        >
          Docs
        </Link>
        <span>/</span>
        <span className="text-[#8a8f98]">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{SECTION_ICON[doc.section] || "📄"}</span>
          <span className="text-xs font-medium text-[#7170ff] uppercase">
            {SECTION_LABEL[doc.section] || doc.section}
          </span>
        </div>
        <h1 className="text-4xl font-medium text-[#f7f8f8] mb-4 leading-tight">
          {doc.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#62666d] mb-6">
          <span className="text-[#d0d6e0]">{doc.author || "unknown"}</span>
          <span>·</span>
          <time dateTime={doc.updatedAt}>
            Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          {doc.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Content + TOC */}
      <div className="mb-8">
        <TOC source={doc.body} />
        <Markdown source={doc.body} />
      </div>

      {/* Related docs (card-style) */}
      {related.length > 0 && (
        <aside className="mt-12 pt-8 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-5">
            Related Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.slug}`}
                className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">
                    {SECTION_ICON[r.section] || "📄"}
                  </span>
                  <time className="text-xs text-[#62666d]">
                    {new Date(r.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-1">
                  {r.title}
                </h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.slice(0, 3).map((t) => (
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
        </aside>
      )}

      {/* History */}
      {revisions.length > 0 && (
        <aside className="mt-12 pt-8 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-4">
            Revision History
          </h2>
          <ul className="space-y-2 text-sm">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#141516] last:border-0"
              >
                <span className="text-[#8a8f98]">
                  #{rev.revisionNo} · {rev.reason} ·{" "}
                  {new Date(rev.createdAt).toLocaleString()}
                </span>
                <form action="/api/revisions/restore" method="post">
                  <input type="hidden" name="id" value={rev.id} />
                  <button
                    type="submit"
                    className="text-xs text-[#d0d6e0] hover:text-[#7170ff] px-2 py-0.5 rounded border border-[#1f2022] hover:border-[#7170ff] transition-colors"
                  >
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
