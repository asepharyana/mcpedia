"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEFAULT_SECTIONS, type SectionConfig } from "@mcpedia/config/sections";
import {
  Search,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  X,
  Compass,
} from "lucide-react";

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
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [results, setResults] = useState<DocHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSections(data);
        }
      })
      .catch(() => {});
  }, []);

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

  const filteredResults =
    selectedSection === "all"
      ? results
      : results.filter((r) => r.section === selectedSection);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] dark:text-[var(--accent)]">
            <Search className="w-5 h-5" />
          </span>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Multi-Modal Search Console
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
          Search across documentation, CTF writeups, and research notes using PostgreSQL Full-Text Search, Cosine Embeddings, or Reciprocal Rank Fusion.
        </p>
      </div>

      {/* Search Box & Controls */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search by keywords, challenge names, tools, concepts..."
            className="w-full pl-12 pr-10 py-3.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 text-base transition-all"
            autoFocus
          />
          <Search className="w-5 h-5 text-[var(--brand)] dark:text-[var(--accent)] absolute left-4 top-4 pointer-events-none" />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3.5 top-3.5 p-1 text-[var(--text-dim)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)]"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Algorithm & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[var(--border-color)] text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[var(--text-dim)] font-mono uppercase font-semibold mr-1">Algorithm:</span>
            {[
              { id: "hybrid", label: "⚡ Hybrid (RRF)", desc: "Reciprocal Rank Fusion (FTS + Vector)" },
              { id: "keyword", label: "🔍 Keyword (FTS)", desc: "PostgreSQL GIN tsvector" },
              { id: "semantic", label: "🧠 Semantic Vector", desc: "Cosine Similarity over Embeddings" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id as SearchMode)}
                title={m.desc}
                className={`px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                  mode === m.id
                    ? "bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm shadow-[var(--brand)]/25"
                    : "bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedSection === "all"
                  ? "bg-[var(--bg-elevated-hover)] text-[var(--text-primary)] font-bold"
                  : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
              }`}
            >
              All
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSection(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedSection === s.id
                    ? "bg-[var(--bg-elevated-hover)] text-[var(--text-primary)] font-bold"
                    : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-[var(--text-muted)] text-sm animate-fade-in">
          <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          <span>Searching knowledge vector space...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && query && filteredResults.length === 0 && (
        <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm space-y-3 animate-fade-in">
          <div className="p-3 w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-dim)] mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">No matching documents found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Try switching algorithm mode to <strong>Hybrid</strong> or <strong>Semantic</strong>, or search with different keywords.
          </p>
        </div>
      )}

      {/* Initial Suggestions */}
      {!loading && !query && (
        <div className="p-6 sm:p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Popular search queries:</p>
          <div className="flex justify-center flex-wrap gap-2 text-xs">
            {[
              "stack alignment",
              "ret2win exploit",
              "bullmq worker",
              "streamable http",
              "full-text search",
              "caddy reverse proxy",
              "pgvector cosine",
            ].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  handleSearch(term, mode);
                }}
                className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-mono cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {!loading && filteredResults.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-[var(--text-dim)] font-mono">
            <span>Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}</span>
            <span>Ranked by {mode} score</span>
          </div>

          <div className="space-y-3">
            {filteredResults.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.slug}`}
                className="group block bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--brand)]/10 border border-[var(--brand)]/30 text-[var(--brand)] dark:text-[var(--accent)] uppercase font-bold">
                      {r.section}
                    </span>
                    <span className="text-xs text-[var(--text-dim)] font-mono truncate">
                      /{r.slug}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-color)] px-2.5 py-0.5 rounded-md font-semibold">
                    Score: {r.score.toFixed(3)}
                  </span>
                </div>

                <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors mb-2">
                  {r.title}
                </h2>

                {r.snippet && (
                  <p
                    className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 [&>mark]:bg-[var(--brand)]/30 [&>mark]:text-[var(--text-primary)] [&>mark]:px-1 [&>mark]:rounded [&>mark]:font-semibold"
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Search</h1>
          <p className="text-sm text-[var(--text-muted)]">Loading search module...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
