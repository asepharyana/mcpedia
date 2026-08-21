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
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#141517] hover:bg-[#1b1d20] border border-[#23252a] hover:border-[#383b42] text-xs text-[#8a8f98] hover:text-[#d0d6e0] rounded-lg transition-all shadow-inner"
      >
        <svg className="w-3.5 h-3.5 text-[#62666d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search documentation...</span>
        <kbd className="ml-2 font-mono bg-[#08090a] px-1.5 py-0.5 rounded border border-[#1f2022] text-[10px] text-[#62666d]">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0f1011] border border-[#27292d] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1f2022] bg-[#141517]">
          <svg className="w-5 h-5 text-[#7170ff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            placeholder="Type to search (titles, keywords, concepts)..."
            className="w-full bg-transparent text-[#f7f8f8] placeholder-[#62666d] text-sm focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-[#62666d] hover:text-[#d0d6e0] bg-[#1b1d20] px-1.5 py-0.5 rounded border border-[#27292d]"
          >
            ESC
          </button>
        </div>

        {/* Results / Suggestions */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-[#8a8f98]">Search full-text, semantic embeddings, and CTF writeups.</p>
              <div className="flex justify-center gap-2 mt-3 text-[11px] text-[#62666d]">
                <span>Navigation: <kbd className="bg-[#141517] px-1 py-0.5 rounded border border-[#1f2022]">↑</kbd> <kbd className="bg-[#141517] px-1 py-0.5 rounded border border-[#1f2022]">↓</kbd></span>
                <span>Select: <kbd className="bg-[#141517] px-1 py-0.5 rounded border border-[#1f2022]">↵</kbd></span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-xs text-[#8a8f98]">
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
                        ? "bg-[#5e6ad2]/15 border border-[#5e6ad2]/40 text-[#f7f8f8]"
                        : "hover:bg-[#141517] text-[#d0d6e0] border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.25 bg-[#191a1b] border border-[#23252a] rounded text-[#7170ff] font-mono">
                          {hit.section}
                        </span>
                        <span className={`text-sm font-medium ${isSelected ? "text-[#7170ff]" : "text-[#f7f8f8]"} truncate`}>
                          {hit.title}
                        </span>
                      </div>
                      {hit.snippet && (
                        <p
                          className="text-xs text-[#8a8f98] mt-1 line-clamp-1 [&>mark]:bg-[#5e6ad2]/30 [&>mark]:text-[#f7f8f8] [&>mark]:rounded [&>mark]:px-0.5"
                          dangerouslySetInnerHTML={{ __html: hit.snippet }}
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-[#62666d] shrink-0 self-center">
                      {hit.slug}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1f2022] bg-[#0c0d0e] text-[11px] text-[#62666d]">
          <span>Tip: Press <kbd className="bg-[#141517] px-1 py-0.5 rounded border border-[#1f2022]">Hybrid</kbd> search is enabled by default</span>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="hover:text-[#7170ff] transition-colors"
          >
            Open full search page →
          </Link>
        </div>
      </div>
    </div>
  );
}
