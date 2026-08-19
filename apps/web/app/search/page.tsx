import Link from "next/link";
import { keywordSearch } from "@mcpedia/core";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hits = query ? await keywordSearch(query, 30) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="e.g. websocket contract typescript"
          className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium"
        >
          Search
        </button>
      </form>

      {query && hits.length === 0 && (
        <p className="text-sm text-zinc-500">No results for “{query}”.</p>
      )}

      <ul className="space-y-3">
        {hits.map((h) => (
          <li
            key={h.doc.slug}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-3"
          >
            <Link
              href={`/${h.doc.section}/${h.doc.slug}`}
              className="font-medium hover:underline"
            >
              {h.doc.title}
            </Link>
            <p
              className="text-sm text-zinc-600 dark:text-zinc-400 mt-1"
              dangerouslySetInnerHTML={{ __html: h.snippet }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
