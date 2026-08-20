import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";

// Render at request time. The content lives in Postgres (populated by the
// indexer/worker), which is not available at build time (CI has no DB), so we
// opt out of static generation. At this corpus scale request-time rendering is
// instant.
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

  // Check auth for edit mode.
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  // If ?edit=1 and authenticated → show the edit form.
  if (edit === "1" && canEdit) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Edit: {doc.title}</h1>
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
    <article className="space-y-4">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">
          {doc.title}
        </h1>
        <div className="text-xs text-zinc-500 mt-1">
          {doc.tags.map((t) => `#${t}`).join(" ")} · {doc.author || "unknown"}
        </div>
        {canEdit && (
          <Link
            href={`/${doc.slug}?edit=1`}
            className="inline-block mt-2 px-3 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
        )}
      </div>

      <Markdown source={doc.body} />

      {related.length > 0 && (
        <aside className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h2 className="text-sm font-medium mb-2">Related</h2>
          <ul className="text-sm space-y-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {revisions.length > 0 && (
        <aside className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h2 className="text-sm font-medium mb-2">History</h2>
          <ul className="text-sm space-y-1">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  #{rev.revisionNo} · {rev.reason} ·{" "}
                  {new Date(rev.createdAt).toLocaleString()} · {rev.bodyLength} chars
                </span>
                <form action="/api/revisions/restore" method="post">
                  <input type="hidden" name="id" value={rev.id} />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
