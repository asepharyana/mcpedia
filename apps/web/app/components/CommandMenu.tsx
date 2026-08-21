"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Hit {
  slug: string;
  title: string;
  section: string;
  snippet?: string;
  score: number;
}

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut ⌘K or /
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  function handleNavigate(slug: string) {
    setOpen(false);
    router.push(`/${slug}`);
  }

  function handleKeyNavigation(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleNavigate(results[selectedIndex].slug);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-sm"
      >
        <svg className="w-3.5 h-3.5 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search docs...</span>
        <kbd className="ml-2 font-mono bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[10px] text-[var(--text-dim)]">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
          <svg className="w-5 h-5 text-[#5e6ad2] dark:text-[#7170ff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            placeholder="Type to search (titles, keywords, concepts)..."
            className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-dim)] text-sm focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)]"
          >
            ESC
          </button>
        </div>

        {/* Results / Suggestions */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-[var(--text-muted)]">Search full-text, semantic embeddings, and CTF writeups.</p>
              <div className="flex justify-center gap-2 mt-3 text-[11px] text-[var(--text-dim)]">
                <span>Navigation: <kbd className="bg-[var(--bg-elevated)] px-1 py-0.5 rounded border border-[var(--border-color)]">↑</kbd> <kbd className="bg-[var(--bg-elevated)] px-1 py-0.5 rounded border border-[var(--border-color)]">↓</kbd></span>
                <span>Select: <kbd className="bg-[var(--bg-elevated)] px-1 py-0.5 rounded border border-[var(--border-color)]">↵</kbd></span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
              No documents matching &quot;{query}&quot;
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((hit, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={hit.slug}
                    onClick={() => handleNavigate(hit.slug)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#5e6ad2]/15 border border-[#5e6ad2]/40 text-[var(--text-primary)]"
                        : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.25 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded text-[#5e6ad2] dark:text-[#7170ff] font-mono">
                          {hit.section}
                        </span>
                        <span className={`text-sm font-medium ${isSelected ? "text-[#5e6ad2] dark:text-[#7170ff]" : "text-[var(--text-primary)]"} truncate`}>
                          {hit.title}
                        </span>
                      </div>
                      {hit.snippet && (
                        <p
                          className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1 [&>mark]:bg-[#5e6ad2]/30 [&>mark]:text-[var(--text-primary)] [&>mark]:rounded [&>mark]:px-0.5"
                          dangerouslySetInnerHTML={{ __html: hit.snippet }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-dim)] shrink-0 self-center">
                      {hit.slug}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-dim)]">
          <span>Tip: Press <kbd className="bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-color)]">Hybrid</kbd> search is enabled</span>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="hover:text-[#5e6ad2] dark:hover:text-[#7170ff] transition-colors"
          >
            Open full search page →
          </Link>
        </div>
      </div>
    </div>
  );
}
