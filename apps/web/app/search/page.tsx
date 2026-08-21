"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SECTIONS } from "@mcpedia/config/sections";

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
  const [selectedSection, setSelectedSection] = useState<string>("all");
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
        `/api/search?q=${encodeURIComponent(q)}&mode=${searchMode}&limit=30`,
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

  const filteredResults = selectedSection === "all"
    ? results
    : results.filter((r) => r.section === selectedSection);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#f7f8f8] tracking-tight mb-2">
          Search Knowledge Base
        </h1>
        <p className="text-sm text-[#8a8f98]">
          Find answers across all documentation, CTF writeups, research notes, and semantic vector chunks.
        </p>
      </div>

      {/* Search Box & Controls */}
      <div className="bg-[#0f1011] border border-[#1f2022] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search by keywords, challenge names, tools, concepts..."
            className="w-full pl-11 pr-10 py-3 bg-[#141517] border border-[#23252a] hover:border-[#383b42] rounded-lg text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-2 focus:ring-[#5e6ad2]/20 text-base transition-all"
            autoFocus
          />
          <svg
            className="w-5 h-5 text-[#7170ff] absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3.5 top-3.5 text-xs text-[#62666d] hover:text-[#d0d6e0] p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Mode & Section Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a1b1d] text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#62666d] mr-1">Algorithm:</span>
            {[
              { id: "hybrid", label: "⚡ Hybrid (RRF)", desc: "FTS + Vector Fusion" },
              { id: "keyword", label: "🔍 Keyword", desc: "PostgreSQL FTS" },
              { id: "semantic", label: "🧠 Semantic", desc: "Embeddings Cosine" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id as SearchMode)}
                title={m.desc}
                className={`px-3 py-1 rounded-md border font-medium transition-all ${
                  mode === m.id
                    ? "bg-[#5e6ad2] border-[#5e6ad2] text-white shadow-sm"
                    : "bg-[#141517] border-[#23252a] text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedSection("all")}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                selectedSection === "all"
                  ? "bg-[#23252a] text-white"
                  : "text-[#62666d] hover:text-[#8a8f98]"
              }`}
            >
              All Sections
            </button>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSection(s.id)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedSection === s.id
                    ? "bg-[#23252a] text-white"
                    : "text-[#62666d] hover:text-[#8a8f98]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-3 py-8 text-[#8a8f98] text-sm">
          <div className="w-5 h-5 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
          <span>Searching knowledge base...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && query && filteredResults.length === 0 && (
        <div className="text-center py-16 bg-[#0f1011] border border-[#1f2022] rounded-xl">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="text-base font-medium text-[#f7f8f8] mb-1">No matching documents</h3>
          <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
            Try switching algorithm mode to <strong>Hybrid</strong> or <strong>Semantic</strong>, or search with different keywords.
          </p>
        </div>
      )}

      {/* Initial Hint */}
      {!loading && !query && (
        <div className="p-8 text-center bg-[#0c0d0e] border border-[#1f2022] rounded-xl space-y-4">
          <p className="text-xs text-[#8a8f98]">Popular search queries:</p>
          <div className="flex justify-center flex-wrap gap-2 text-xs">
            {["stack alignment", "ret2win", "bullmq worker", "streamable http", "full-text search", "caddy reverse proxy"].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  handleSearch(term, mode);
                }}
                className="px-3 py-1 bg-[#141517] hover:bg-[#1b1d20] border border-[#23252a] hover:border-[#5e6ad2]/40 rounded-md text-[#d0d6e0] transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {!loading && filteredResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#62666d]">
            <span>Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}</span>
            <span className="font-mono">Ranked by {mode} score</span>
          </div>

          <div className="space-y-3">
            {filteredResults.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.slug}`}
                className="group block bg-[#0f1011] hover:bg-[#131415] border border-[#1f2022] hover:border-[#5e6ad2]/40 rounded-xl p-4 sm:p-5 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#5e6ad2]/10 border border-[#5e6ad2]/30 text-[#7170ff] uppercase">
                      {r.section}
                    </span>
                    <span className="text-xs text-[#62666d] font-mono truncate">
                      /{r.slug}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#8a8f98] bg-[#141517] px-2 py-0.5 rounded">
                    Score: {r.score.toFixed(3)}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors mb-2">
                  {r.title}
                </h2>

                {r.snippet && (
                  <p
                    className="text-xs text-[#8a8f98] leading-relaxed line-clamp-2 [&>mark]:bg-[#5e6ad2]/30 [&>mark]:text-white [&>mark]:px-1 [&>mark]:rounded [&>mark]:font-medium"
                    dangerouslySetInnerHTML={{ __html: r.snippet }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl py-12">
          <h1 className="text-2xl font-bold text-[#f7f8f8] mb-4">Search</h1>
          <p className="text-sm text-[#8a8f98]">Loading search module...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
