import Link from "next/link";
import { keywordSearch, hybridSearch } from "@mcpedia/core";

type Mode = "keyword" | "hybrid";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q, mode } = await searchParams;
  const query = q?.trim() ?? "";
  const activeMode: Mode = mode === "hybrid" ? "hybrid" : "keyword";

  const hits = query
    ? activeMode === "hybrid"
      ? await hybridSearch(query, 30)
      : await keywordSearch(query, 30)
    : [];

  const toggle = (m: Mode) => `/search?q=${encodeURIComponent(query)}&mode=${m}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <div className="flex rounded overflow-hidden border border-zinc-300 dark:border-zinc-700 text-sm">
          <Link
            href={toggle("keyword")}
            className={`px-3 py-1.5 ${activeMode === "keyword" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            Keyword
          </Link>
          <Link
            href={toggle("hybrid")}
            className={`px-3 py-1.5 ${activeMode === "hybrid" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            Hybrid
          </Link>
        </div>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="e.g. websocket contract typescript"
          className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
        <input type="hidden" name="mode" value={activeMode} />
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
            {/* Snippet comes from Postgres ts_headline (keyword mode) or our own
                chunk content (hybrid mode) — both trusted, first-party data, not
                user input. The only markup is <mark> from ts_headline. */}
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
