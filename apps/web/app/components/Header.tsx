"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_SECTIONS, type SectionConfig } from "@mcpedia/config/sections";
import ThemeToggle from "@/components/ThemeToggle";
import CommandMenu from "@/components/CommandMenu";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);

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

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-color)] glass-nav">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5e6ad2] to-[#7170ff] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-[#5e6ad2]/20 group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-base tracking-tight transition-colors">
              MCPedia
            </span>
          </Link>
          <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)]">
            v0.1.0
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {sections.map((s) => {
            const isActive = pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`);
            return (
              <Link
                key={s.id}
                href={`/${s.id}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-color)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
                }`}
              >
                <span className="mr-1.5 opacity-80">{s.icon}</span>
                {s.label}
              </Link>
            );
          })}
        </nav>

        {/* Right tools */}
        <div className="flex items-center gap-2.5">
          <CommandMenu />

          <Link
            href="/search"
            className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            title="Search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#5e6ad2] hover:bg-[#7170ff] text-white text-xs font-medium rounded-lg transition-all shadow-sm"
          >
            <span>+</span>
            <span>New Doc</span>
          </Link>

          <Link
            href="/login"
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              pathname === "/login"
                ? "text-[var(--text-primary)] bg-[var(--bg-elevated)] font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            Login
          </Link>

          <div className="border-l border-[var(--border-color)] pl-2.5 flex items-center">
            <ThemeToggle />
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Toggle navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 space-y-1 animate-fade-in shadow-lg">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/${s.id}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-[var(--border-color)] flex gap-2">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg font-medium border border-[var(--border-color)]"
            >
              Search
            </Link>
            <Link
              href="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-xs bg-[#5e6ad2] text-white rounded-lg font-medium"
            >
              + Create
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
