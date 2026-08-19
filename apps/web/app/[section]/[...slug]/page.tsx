import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument, listDocuments, getRelated } from "@mcpedia/core";
import Markdown from "@/components/Markdown";

export default async function DocPage({
  params,
}: {
  params: Promise<{ section: string; slug: string[] }>;
}) {
  const { section, slug } = await params;
  const fullSlug = `${section}/${slug.join("/")}`;
  const doc = await getDocument(fullSlug);
  if (!doc) notFound();

  const related = await getRelated(fullSlug, 5);

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
      </div>

      <Markdown source={doc.body} />

      {related.length > 0 && (
        <aside className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h2 className="text-sm font-medium mb-2">Related</h2>
          <ul className="text-sm space-y-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.section}/${r.slug}`}
                  className="hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}

export async function generateStaticParams() {
  const docs = await listDocuments();
  return docs.map((d) => ({
    section: d.section,
    slug: d.slug.split("/").slice(1),
  }));
}
