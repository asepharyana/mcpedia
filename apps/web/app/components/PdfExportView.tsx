"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import {
  extractDocCategory,
  extractDocPoints,
  extractDocDifficulty,
  extractDocSolved,
  sortExportDocuments,
  compileExportMarkdown,
  type Document,
  type ExportData,
  type ExportSortOption,
  type ExportCategorySummary,
} from "@mcpedia/core/export-helpers";
import { getSectionMeta } from "@mcpedia/config/sections";

interface PdfExportViewProps {
  exportData: ExportData;
  backHref: string;
}

export default function PdfExportView({
  exportData,
  backHref,
}: PdfExportViewProps) {
  const { summary, documents: initialDocs } = exportData;

  // Configuration and interactive state
  const [sortBy, setSortBy] = useState<ExportSortOption>("category_points");
  const [showCover, setShowCover] = useState(true);
  const [showScoreboard, setShowScoreboard] = useState(initialDocs.length > 1);
  const [showTOC, setShowTOC] = useState(initialDocs.length > 1);
  const [pageBreaks, setPageBreaks] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedMd, setCopiedMd] = useState(false);

  const sectionMeta = getSectionMeta(summary.section);

  // Available categories for filtering
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const doc of initialDocs) {
      set.add(extractDocCategory(doc));
    }
    return Array.from(set).sort();
  }, [initialDocs]);

  // Filtered & Sorted documents
  const filteredAndSortedDocs = useMemo(() => {
    let docs = [...initialDocs];
    if (selectedCategory !== "all") {
      docs = docs.filter(
        (d) => extractDocCategory(d).toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    return sortExportDocuments(docs, sortBy);
  }, [initialDocs, selectedCategory, sortBy]);

  // Calculate dynamic stats for currently filtered view
  const currentTotalPoints = useMemo(() => {
    return filteredAndSortedDocs.reduce(
      (sum, d) => sum + extractDocPoints(d),
      0,
    );
  }, [filteredAndSortedDocs]);

  function handlePrint() {
    window.print();
  }

  function handleCopyMarkdown() {
    const md = compileExportMarkdown({
      summary,
      documents: filteredAndSortedDocs,
    });
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }

  function handleDownloadMarkdown() {
    const md = compileExportMarkdown({
      summary,
      documents: filteredAndSortedDocs,
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = summary.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getCategoryBadgeClass(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes("web")) {
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    }
    if (cat.includes("crypto")) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (cat.includes("pwn") || cat.includes("binary")) {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
    if (cat.includes("reverse") || cat.includes("rev")) {
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
    }
    if (cat.includes("forensic") || cat.includes("dfir")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
    if (cat.includes("osint")) {
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30";
    }
    return "bg-[var(--brand)]/10 text-[var(--brand)] dark:text-[var(--accent)] border-[var(--brand)]/30";
  }

  function getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes("web")) return "🌐";
    if (cat.includes("crypto")) return "🔐";
    if (cat.includes("pwn") || cat.includes("binary")) return "⚡";
    if (cat.includes("reverse") || cat.includes("rev")) return "⚙️";
    if (cat.includes("forensic") || cat.includes("dfir")) return "🔍";
    if (cat.includes("osint")) return "🛰️";
    if (cat.includes("mobile")) return "📱";
    if (cat.includes("hardware")) return "🔌";
    return "🚩";
  }

  function getDifficultyBadgeClass(difficulty: string): string {
    const diff = difficulty.toLowerCase();
    if (/easy|simple|beginner/i.test(diff)) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (/medium|intermediate/i.test(diff)) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
    if (/hard|expert|advanced|insane/i.test(diff)) {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
    return "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-color)]";
  }

  return (
    <div className="pb-16 print:pb-0">
      {/* =========================================================================
          Export Control Toolbar (Hidden in Print)
          ========================================================================= */}
      <aside className="no-print export-toolbar sticky top-16 z-30 mb-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info & Back button */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--brand)] dark:text-[var(--accent)] font-semibold uppercase">
                  {sectionMeta.icon} {sectionMeta.label}
                </span>
                <span className="text-xs text-[var(--text-dim)]">·</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {filteredAndSortedDocs.length} challenge{filteredAndSortedDocs.length !== 1 ? "s" : ""}
                  {currentTotalPoints > 0 ? ` (${currentTotalPoints} pts)` : ""}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-md">
                {summary.title}
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Copy All Markdown */}
            <button
              onClick={handleCopyMarkdown}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs cursor-pointer"
              title="Copy compiled markdown document"
            >
              {copiedMd ? (
                <>
                  <span className="text-emerald-500 font-bold">✓ Copied</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            {/* Download Markdown */}
            <button
              onClick={handleDownloadMarkdown}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs cursor-pointer"
              title="Download compiled .md file"
            >
              <span>💾</span>
              <span>Download .md</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-98"
              title="Open browser print dialog to save as PDF"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        {/* Options & Filters Bar */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Sort Order Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ExportSortOption)}
              aria-label="Sort documents"
              className="bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--brand)] cursor-pointer"
            >
              <option value="category_points">Category & Points (CTF Standard)</option>
              <option value="points_desc">Points (Highest First)</option>
              <option value="difficulty">Difficulty (Easy to Hard)</option>
              <option value="title">Challenge Title (A-Z)</option>
              <option value="path">Directory / Chapter Path</option>
              <option value="updated_at">Recently Updated</option>
            </select>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-4 flex-wrap text-[var(--text-muted)]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={showCover}
                onChange={(e) => setShowCover(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span>Cover Page</span>
            </label>

            {initialDocs.length > 1 && (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={showScoreboard}
                    onChange={(e) => setShowScoreboard(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span>Scoreboard Table</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={showTOC}
                    onChange={(e) => setShowTOC(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span>Table of Contents</span>
                </label>
              </>
            )}

            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={pageBreaks}
                onChange={(e) => setPageBreaks(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span>Page Break per Ch</span>
            </label>
          </div>
        </div>

        {/* Category Filter Chips */}
        {allCategories.length > 1 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[var(--text-muted)] font-medium mr-1">Category:</span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                selectedCategory === "all"
                  ? "bg-[var(--brand)] text-white font-medium"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
              }`}
            >
              All ({initialDocs.length})
            </button>
            {allCategories.map((cat: string) => {
              const count = initialDocs.filter((d: Document) => extractDocCategory(d) === cat).length;
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isActive ? "all" : cat)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                    isActive
                      ? "bg-[var(--brand)] text-white font-medium"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                  }`}
                >
                  <span>{getCategoryIcon(cat)}</span>
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75 font-sans">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* =========================================================================
          Main Printable Document
          ========================================================================= */}
      <div className="print-container bg-[var(--bg-surface)] print:bg-white border border-[var(--border-color)] print:border-none rounded-2xl print:rounded-none p-6 sm:p-10 print:p-0 shadow-sm print:shadow-none space-y-12 print:space-y-0">
        
        {/* =======================================================================
            1. Cover Page
            ======================================================================= */}
        {showCover && (
          <section className="cover-page flex flex-col justify-between min-h-[600px] print:min-h-[92vh] p-8 sm:p-12 print:p-10 border border-[var(--border-color)] print:border-none rounded-xl print:rounded-none bg-[var(--bg-elevated)] print:bg-transparent">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center font-bold text-sm">
                    M
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      MCPedia
                    </span>
                    <p className="text-[10px] text-[var(--text-dim)] font-mono">
                      Knowledge Base Documentation
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--brand)]/15 text-[var(--brand)] dark:text-[var(--accent)] border border-[var(--brand)]/30">
                  <span>{sectionMeta.icon}</span>
                  <span className="uppercase">{sectionMeta.label}</span>
                </span>
              </div>

              {/* Title and Subtitle */}
              <div className="space-y-3 mb-10 pt-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                  {summary.title}
                </h1>
                <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
                  Comprehensive challenge solutions, technical writeups, and security research findings.
                </p>
              </div>

              {/* Stats Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8">
                <div className="p-4 bg-[var(--bg-surface)] print:bg-slate-50 border border-[var(--border-color)] rounded-xl">
                  <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {filteredAndSortedDocs.length}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Challenges / Ch
                  </div>
                </div>

                {currentTotalPoints > 0 && (
                  <div className="p-4 bg-[var(--bg-surface)] print:bg-slate-50 border border-[var(--border-color)] rounded-xl">
                    <div className="text-2xl font-bold text-[var(--brand)] dark:text-[var(--accent)] font-mono">
                      {currentTotalPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Total Points
                    </div>
                  </div>
                )}

                <div className="p-4 bg-[var(--bg-surface)] print:bg-slate-50 border border-[var(--border-color)] rounded-xl">
                  <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {summary.categories.length}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Categories
                  </div>
                </div>

                <div className="p-4 bg-[var(--bg-surface)] print:bg-slate-50 border border-[var(--border-color)] rounded-xl">
                  <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
                    {summary.authors.length || 1}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Contributors
                  </div>
                </div>
              </div>

              {/* Categories Distribution */}
              {summary.categories.length > 0 && (
                <div className="space-y-2 mt-6">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Categories Covered:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {summary.categories.map((cat: ExportCategorySummary) => (
                      <span
                        key={cat.name}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${getCategoryBadgeClass(cat.name)}`}
                      >
                        <span>{getCategoryIcon(cat.name)}</span>
                        <span className="font-semibold">{cat.name}:</span>
                        <span>{cat.count} chall{cat.count !== 1 ? "s" : ""}</span>
                        {cat.points > 0 && <span className="opacity-75 font-sans">({cat.points} pts)</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cover Footer */}
            <div className="pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <div>
                {summary.authors.length > 0 && (
                  <p>
                    <span className="font-medium text-[var(--text-secondary)]">Authors:</span>{" "}
                    {summary.authors.map((a: string) => `@${a}`).join(", ")}
                  </p>
                )}
                <p className="mt-0.5 font-mono text-[11px] text-[var(--text-dim)]">
                  Path: {summary.scope}
                </p>
              </div>
              <div className="font-mono text-right sm:text-right">
                <p>
                  {new Date(summary.generatedAt).toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}
                </p>
                <p className="text-[10px] text-[var(--text-dim)]">Generated by MCPedia</p>
              </div>
            </div>
          </section>
        )}

        {/* =======================================================================
            2. Scoreboard / Challenge Matrix Table
            ======================================================================= */}
        {showScoreboard && filteredAndSortedDocs.length > 1 && (
          <section className="scoreboard-page py-6 print:py-8 border-t border-[var(--border-color)] print:border-none">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                <span>📊</span>
                <span>Challenge Overview & Scoreboard</span>
              </h2>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {filteredAndSortedDocs.length} Total Challenges
              </span>
            </div>

            <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] print:bg-slate-100 border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono uppercase">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Challenge</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-3 text-right">Points</th>
                    <th className="py-2.5 px-3">Author</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredAndSortedDocs.map((doc, idx) => {
                    const chNum = idx + 1;
                    const cat = extractDocCategory(doc);
                    const pts = extractDocPoints(doc);
                    const diff = extractDocDifficulty(doc);
                    const isSolved = extractDocSolved(doc);

                    return (
                      <tr
                        key={doc.slug}
                        className="hover:bg-[var(--bg-elevated)]/50 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-[var(--text-dim)]">
                          {chNum}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                          <a
                            href={`#ch-${chNum}`}
                            className="hover:text-[var(--brand)] dark:hover:text-[var(--accent)] hover:underline"
                          >
                            {doc.title}
                          </a>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${getCategoryBadgeClass(cat)}`}
                          >
                            <span>{getCategoryIcon(cat)}</span>
                            <span>{cat}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {diff ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getDifficultyBadgeClass(diff)}`}
                            >
                              {diff}
                            </span>
                          ) : (
                            <span className="text-[var(--text-dim)]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--brand)] dark:text-[var(--accent)]">
                          {pts > 0 ? `${pts} pts` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                          {doc.author ? `@${doc.author}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isSolved ? (
                            <span className="text-emerald-600 font-bold" title="Solved">
                              ✓
                            </span>
                          ) : (
                            <span className="text-[var(--text-dim)]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =======================================================================
            3. Table of Contents (TOC)
            ======================================================================= */}
        {showTOC && filteredAndSortedDocs.length > 1 && (
          <section className="toc-page py-6 print:py-8 border-t border-[var(--border-color)] print:border-none">
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4 flex items-center gap-2">
              <span>📑</span>
              <span>Table of Contents</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredAndSortedDocs.map((doc, idx) => {
                const chNum = idx + 1;
                const cat = extractDocCategory(doc);
                const pts = extractDocPoints(doc);

                return (
                  <a
                    key={doc.slug}
                    href={`#ch-${chNum}`}
                    className="group flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] print:bg-slate-50 hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="font-mono text-[11px] font-bold text-[var(--brand)] dark:text-[var(--accent)] bg-[var(--brand)]/10 px-1.5 py-0.5 rounded shrink-0">
                        Ch {chNum}
                      </span>
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] truncate">
                        {doc.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span className="text-[var(--text-muted)]">{cat}</span>
                      {pts > 0 && (
                        <span className="text-[var(--brand)] dark:text-[var(--accent)] font-semibold">
                          · {pts}p
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* =======================================================================
            4. Challenge Chapters ("Urutan Rapih Per Ch")
            ======================================================================= */}
        <div className="space-y-12 print:space-y-0">
          {filteredAndSortedDocs.map((doc, idx) => {
            const chNum = idx + 1;
            const cat = extractDocCategory(doc);
            const pts = extractDocPoints(doc);
            const diff = extractDocDifficulty(doc);
            const isSolved = extractDocSolved(doc);
            const extra = doc.extraFields || {};

            return (
              <article
                key={doc.slug}
                id={`ch-${chNum}`}
                className={`chapter-page ${
                  pageBreaks && idx > 0 ? "page-break-before" : ""
                } pt-8 first:pt-0 print:pt-6`}
              >
                {/* Chapter Header Card */}
                <div className="challenge-header-card bg-[var(--bg-elevated)] print:bg-slate-50 border border-[var(--border-color)] print:border-slate-300 rounded-xl p-5 sm:p-6 mb-6 shadow-xs">
                  {/* Chapter index label */}
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[var(--brand)] text-white">
                        CHAPTER {chNum}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-dim)]">
                        Challenge {chNum} of {filteredAndSortedDocs.length}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-[var(--text-dim)]">
                      {doc.slug}
                    </span>
                  </div>

                  {/* Challenge Title */}
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-snug mb-4">
                    {doc.title}
                  </h2>

                  {/* Metadata Chips Bar */}
                  <div className="badge-container flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border-color)]">
                    {/* Category Chip */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${getCategoryBadgeClass(cat)}`}
                    >
                      <span>{getCategoryIcon(cat)}</span>
                      <span>Category: {cat}</span>
                    </span>

                    {/* Points Chip */}
                    {pts > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[var(--brand)]/10 text-[var(--brand)] dark:text-[var(--accent)] border border-[var(--brand)]/30">
                        <span>🎯</span>
                        <span>{pts} pts</span>
                      </span>
                    )}

                    {/* Difficulty Chip */}
                    {diff && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getDifficultyBadgeClass(diff)}`}
                      >
                        <span>Difficulty: {diff}</span>
                      </span>
                    )}

                    {/* Solved Status */}
                    {isSolved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span>✓</span>
                        <span>Solved</span>
                      </span>
                    )}

                    {/* Author Chip */}
                    {doc.author && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                        <span>👤</span>
                        <span>@{doc.author}</span>
                      </span>
                    )}

                    {/* Date Chip */}
                    {doc.updatedAt && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-dim)] font-mono">
                        <span>📅</span>
                        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </span>
                    )}

                    {/* Custom Extra Fields badges (excluding already rendered keys) */}
                    {Object.entries(extra).map(([k, v]) => {
                      const lowerKey = k.toLowerCase();
                      if (
                        [
                          "category",
                          "points",
                          "score",
                          "pts",
                          "difficulty",
                          "solved",
                          "author",
                          "event",
                        ].includes(lowerKey) ||
                        v === null ||
                        v === undefined ||
                        v === ""
                      ) {
                        return null;
                      }
                      return (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-muted)] font-mono"
                        >
                          <span className="text-[var(--text-dim)]">{k}:</span>
                          <span className="text-[var(--text-secondary)] font-semibold">
                            {String(v)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Markdown Writeup Body */}
                <div className="prose-content mb-10">
                  <Markdown source={doc.body} />
                </div>

                {/* Chapter End Divider */}
                <div className="print:hidden border-b border-[var(--border-color)] my-8" />
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
