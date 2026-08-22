"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_SECTIONS, type SectionConfig } from "@mcpedia/config/sections";
import ThemeToggle from "@/components/ThemeToggle";
import CommandMenu from "@/components/CommandMenu";
import {
  Sparkles,
  Plus,
  Search,
  Menu,
  X,
  Lock,
  Layers,
  FileText,
  Activity,
  Terminal,
} from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] glass-nav transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-15 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all">
              <span className="font-mono font-bold text-sm tracking-tighter">M</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-app)] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[var(--text-primary)] text-base tracking-tight leading-none group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors">
                MCPedia
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)] uppercase tracking-wider leading-tight mt-0.5 hidden sm:block">
                AI Knowledge Hub
              </span>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-dim)]">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>MCP :4021</span>
          </div>
        </div>

        {/* Center: Desktop Dynamic Sections Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-elevated)]/60 p-1 rounded-xl border border-[var(--border-color)]">
          {sections.map((s) => {
            const isActive = pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`);
            return (
              <Link
                key={s.id}
                href={`/${s.id}`}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "text-[var(--text-primary)] bg-[var(--bg-surface)] shadow-xs font-semibold border border-[var(--border-color)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50"
                }`}
              >
                <span className="text-xs">{s.icon}</span>
                <span>{s.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Tools & Navigation Deck */}
        <div className="flex items-center gap-2">
          <CommandMenu />

          <Link
            href="/search"
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] transition-colors"
            title="Search knowledge base"
          >
            <Search className="w-4 h-4" />
          </Link>

          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-medium rounded-lg shadow-md shadow-[var(--brand)]/20 hover:shadow-[var(--brand)]/35 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Doc</span>
          </Link>

          <Link
            href="/login"
            className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
              pathname === "/login"
                ? "text-[var(--text-primary)] bg-[var(--bg-elevated)] font-semibold border border-[var(--border-color)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
            title="Admin Login"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          <div className="border-l border-[var(--border-color)] pl-2 flex items-center">
            <ThemeToggle />
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-4 space-y-2 animate-fade-in shadow-xl">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-dim)] px-2 mb-1">
            Sections
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {sections.map((s) => {
              const isActive = pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`);
              return (
                <Link
                  key={s.id}
                  href={`/${s.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--brand)]/15 text-[var(--brand)] dark:text-[var(--accent)] border border-[var(--brand)]/30 font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] border border-transparent"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--border-color)] flex gap-2">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg font-medium border border-[var(--border-color)]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </Link>
            <Link
              href="/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-[var(--brand)] text-white rounded-lg font-medium shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Doc</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
