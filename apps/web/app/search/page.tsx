"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface DocHit {
  slug: string;
  title: string;
  section: string;
  score: number;
  snippet: string;
}

type SearchMode = "hybrid" | "keyword" | "semantic";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialMode = (searchParams.get("mode") as SearchMode) ?? "hybrid";

  const [query, setQuery] = useState(initialQ);
  const [mode, setMode] = useState<SearchMode>(
    ["hybrid", "keyword", "semantic"].includes(initialMode) ? initialMode : "hybrid",
  );
  const [results, setResults] = useState<DocHit[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (q: string, searchMode: SearchMode) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&mode=${searchMode}`,
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) {
      handleSearch(initialQ, mode);
    }
  }, [initialQ, handleSearch, mode]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val, mode);
  }

  function handleModeChange(newMode: SearchMode) {
    setMode(newMode);
    if (query.trim()) {
      handleSearch(query, newMode);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">Search</h1>

      <div className="space-y-4 mb-8">
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search documents by keyword or semantic meaning..."
          className="w-full px-4 py-2.5 bg-[#0f1011] border border-[#23252a] rounded-lg text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          autoFocus
        />

        {/* Mode Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#62666d]">Mode:</span>
          {(
            [
              { id: "hybrid", label: "Hybrid (FTS + Semantic)" },
              { id: "keyword", label: "Keyword (FTS)" },
              { id: "semantic", label: "Semantic (Embeddings)" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={`px-2.5 py-1 rounded border transition-colors ${
                mode === m.id
                  ? "bg-[#5e6ad2]/15 border-[#5e6ad2] text-[#7170ff]"
                  : "bg-[#0f1011] border-[#1f2022] text-[#8a8f98] hover:text-[#d0d6e0]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-[#8a8f98]">Searching...</p>}

      {!loading && results.length === 0 && query && (
        <p className="text-[#8a8f98]">No results found for "{query}".</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-4">
          {results.map((r) => (
            <li
              key={r.slug}
              className="bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 transition-colors"
            >
              <Link
                href={`/${r.slug}`}
                className="text-[#f7f8f8] hover:text-[#7170ff] font-medium transition-colors block mb-1"
              >
                {r.title}
              </Link>
              <div className="flex items-center gap-2 text-xs text-[#62666d] mb-2">
                <span className="uppercase text-[#7170ff]">{r.section}</span>
                <span>·</span>
                <span>{r.slug}</span>
                <span>·</span>
                <span>Score: {r.score.toFixed(3)}</span>
              </div>
              {r.snippet && (
                <p
                  className="text-sm text-[#8a8f98] leading-relaxed [&>mark]:bg-[#5e6ad2]/30 [&>mark]:text-[#f7f8f8] [&>mark]:px-1 [&>mark]:rounded"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl">
          <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">Search</h1>
          <p className="text-[#8a8f98]">Loading search...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
