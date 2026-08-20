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
      <div className="mb-2 flex items-center gap-2 text-xs text-[#62666d]">
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
        {canEdit && (
          <>
            <span>/</span>
            <Link
              href={`/${doc.slug}?edit=1`}
              className="hover:text-[#d0d6e0] text-[#8a8f98] hover:text-[#5e6ad2] transition-colors"
            >
              Edit
            </Link>
          </>
        )}
      </div>

      <h1 className="text-3xl font-light text-[#f7f8f8] mb-2">{doc.title}</h1>

      <div className="flex items-center gap-3 text-xs text-[#62666d] mb-6">
        <span>{doc.author || "unknown"}</span>
        <span>•</span>
        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
        {doc.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
          >
            #{t}
          </span>
        ))}
      </div>

      <div className="mb-8">
        <TOC source={doc.body} />
        <Markdown source={doc.body} />
      </div>

      {related.length > 0 && (
        <aside className="mt-12 pt-6 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
            Related
          </h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {revisions.length > 0 && (
        <aside className="mt-12 pt-6 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
            History
          </h2>
          <ul className="text-sm">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-[#141516]"
              >
                <span className="text-[#8a8f98]">
                  #{rev.revisionNo} · {rev.reason} ·{" "}
                  {new Date(rev.createdAt).toLocaleString()}
                </span>
                <form action="/api/revisions/restore" method="post">
                  <input type="hidden" name="id" value={rev.id} />
                  <button
                    type="submit"
                    className="text-xs text-[#d0d6e0] hover:text-[#5e6ad2] px-2 py-0.5 rounded border border-[#1f2022] hover:border-[#5e6ad2] transition-colors"
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
