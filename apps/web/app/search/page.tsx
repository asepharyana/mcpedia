"use client";

import { useState } from "react";
import Link from "next/link";

interface DocHit {
  slug: string;
  title: string;
  section: string;
  score: number;
  snippet: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocHit[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  }

  return (
    <div>
      <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">Search</h1>
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search documents..."
          className="w-full px-4 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          autoFocus
        />
      </div>

      {loading && <p className="text-[#8a8f98]">Searching...</p>}

      {!loading && results.length === 0 && query && (
        <p className="text-[#8a8f98]">No results for "{query}".</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.slug} className="border-b border-[#1f2022] pb-3">
              <Link
                href={`/${r.slug}`}
                className="text-[#f7f8f8] hover:text-[#7170ff] font-medium transition-colors"
              >
                {r.title}
              </Link>
              <span className="block text-xs text-[#62666d]">
                {r.section} · {Math.round(r.score * 100)}% match
              </span>
              {r.snippet && (
                <p className="mt-1 text-sm text-[#8a8f98] line-clamp-2">
                  {r.snippet}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
