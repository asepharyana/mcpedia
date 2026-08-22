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
  const categoriesList = summary.categories || [];
  const authorsList = summary.authors || [];

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

  return (
    <div className="pb-16 print:pb-0">
      {/* =========================================================================
          Export Control Toolbar (Screen Only — Hidden in Print)
          ========================================================================= */}
      <aside className="no-print export-toolbar sticky top-16 z-30 mb-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info & Back button */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--text-primary)] font-semibold uppercase">
                  {sectionMeta.label}
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-all shadow-xs cursor-pointer"
              title="Copy compiled markdown document"
            >
              {copiedMd ? (
                <span className="text-emerald-600 font-bold">✓ Copied</span>
              ) : (
                <span>Copy Markdown</span>
              )}
            </button>

            {/* Download Markdown */}
            <button
              onClick={handleDownloadMarkdown}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-all shadow-xs cursor-pointer"
              title="Download compiled .md file"
            >
              <span>Download .md</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-sm transition-all cursor-pointer hover:shadow"
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
              className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-md px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-slate-500"
            >
              <option value="category_points">Category & Points (Standard)</option>
              <option value="points_desc">Points (Highest First)</option>
              <option value="difficulty">Difficulty (Easy to Hard)</option>
              <option value="title">Challenge Title (A-Z)</option>
              <option value="path">Directory / Chapter Path</option>
              <option value="updated_at">Recently Updated</option>
            </select>
          </div>

          {/* Section toggles */}
          <div className="flex items-center gap-3 flex-wrap text-[var(--text-secondary)]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCover}
                onChange={(e) => setShowCover(e.target.checked)}
                className="rounded border-[var(--border-color)] text-slate-800"
              />
              <span>Cover Page</span>
            </label>

            {initialDocs.length > 1 && (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScoreboard}
                    onChange={(e) => setShowScoreboard(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-slate-800"
                  />
                  <span>Scoreboard</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTOC}
                    onChange={(e) => setShowTOC(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-slate-800"
                  />
                  <span>Table of Contents</span>
                </label>
              </>
            )}

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pageBreaks}
                onChange={(e) => setPageBreaks(e.target.checked)}
                className="rounded border-[var(--border-color)] text-slate-800"
              />
              <span>Page Break per Ch</span>
            </label>
          </div>
        </div>

        {/* Category filter pills */}
        {allCategories.length > 1 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[var(--text-muted)] mr-1">Filter:</span>
            <button
              onClick={() => setSelectedCategory("all")}
              type="button"
              className={`px-2.5 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
              }`}
            >
              All ({initialDocs.length})
            </button>
            {allCategories.map((cat) => {
              const count = initialDocs.filter(
                (d) => extractDocCategory(d).toLowerCase() === cat.toLowerCase(),
              ).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  type="button"
                  className={`px-2.5 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* =========================================================================
          Formal Printable Document Structure
          ========================================================================= */}
      <div className="print-container bg-white text-slate-900 border border-slate-200 print:border-none rounded-xl print:rounded-none p-6 sm:p-10 print:p-0 shadow-sm print:shadow-none space-y-10 print:space-y-0">
        
        {/* =======================================================================
            1. Formal Cover Page
            ======================================================================= */}
        {showCover && (
          <section className="cover-page flex flex-col justify-between min-h-[600px] print:min-h-[90vh] p-8 sm:p-12 print:p-8 border border-slate-300 print:border-slate-800 rounded-lg print:rounded-none bg-white">
            <div>
              {/* Formal Header Line */}
              <div className="border-b-2 border-slate-900 pb-3 mb-8 flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-widest text-slate-800 uppercase">
                  Technical Writeups & Solutions Report
                </span>
                <span className="text-xs font-mono text-slate-600 uppercase">
                  Scope: {summary.scope}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3 mb-10 pt-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                  {summary.title}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Official compilation of challenge solutions, vulnerability analysis, and exploitation procedures.
                </p>
              </div>

              {/* Summary Information Table */}
              <div className="my-8 border border-slate-300 rounded-md overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-2.5 px-4 font-semibold text-slate-700 w-1/3 border-r border-slate-200">
                        Event / Document Scope
                      </th>
                      <td className="py-2.5 px-4 font-mono text-slate-900">
                        {summary.scope}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <th className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">
                        Total Challenges Compiled
                      </th>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {filteredAndSortedDocs.length} challenge{filteredAndSortedDocs.length !== 1 ? "s" : ""}
                      </td>
                    </tr>
                    {currentTotalPoints > 0 && (
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">
                          Total Score / Points
                        </th>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {currentTotalPoints.toLocaleString()} pts
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-200">
                      <th className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">
                        Categories Covered
                      </th>
                      <td className="py-2.5 px-4 text-slate-900">
                        {categoriesList.length > 0
                          ? categoriesList
                              .map((c) => `${c.name} (${c.count})`)
                              .join(", ")
                          : "General"}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">
                        Author(s) / Contributors
                      </th>
                      <td className="py-2.5 px-4 text-slate-900 font-mono">
                        {authorsList.length > 0
                          ? authorsList.map((a) => `@${a}`).join(", ")
                          : "Contributors"}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-4 font-semibold text-slate-700 border-r border-slate-200">
                        Date of Compilation
                      </th>
                      <td className="py-2.5 px-4 text-slate-900">
                        {new Date(summary.generatedAt).toLocaleDateString(undefined, {
                          dateStyle: "long",
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cover Footer */}
            <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>CONFIDENTIAL & TECHNICAL REPORT</span>
              <span>
                {new Date(summary.generatedAt).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
              </span>
            </div>
          </section>
        )}

        {/* =======================================================================
            2. Scoreboard / Challenge Matrix Table
            ======================================================================= */}
        {showScoreboard && filteredAndSortedDocs.length > 1 && (
          <section className="scoreboard-page py-6 print:py-8 border-t border-slate-200 print:border-none">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold text-slate-950 uppercase tracking-tight font-mono">
                1. Challenge Overview & Scoreboard Matrix
              </h2>
              <span className="text-xs font-mono text-slate-600">
                {filteredAndSortedDocs.length} Total Challenges
              </span>
            </div>

            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-mono font-semibold uppercase">
                    <th className="py-2 px-3 w-10 text-center border-r border-slate-200">#</th>
                    <th className="py-2 px-3 border-r border-slate-200">Challenge</th>
                    <th className="py-2 px-3 border-r border-slate-200">Category</th>
                    <th className="py-2 px-3 border-r border-slate-200">Difficulty</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">Points</th>
                    <th className="py-2 px-3 border-r border-slate-200">Author</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredAndSortedDocs.map((doc, idx) => {
                    const chNum = idx + 1;
                    const cat = extractDocCategory(doc);
                    const pts = extractDocPoints(doc);
                    const diff = extractDocDifficulty(doc);
                    const isSolved = extractDocSolved(doc);

                    return (
                      <tr
                        key={doc.slug}
                        className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-200">
                          {chNum}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-200">
                          <a
                            href={`#ch-${chNum}`}
                            className="hover:underline text-slate-900 font-semibold"
                          >
                            {doc.title}
                          </a>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-800 border-r border-slate-200">
                          {cat}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                          {diff || "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-200">
                          {pts > 0 ? `${pts} pts` : "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200 font-mono">
                          {doc.author ? `@${doc.author}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-xs">
                          {isSolved ? "Solved" : "-"}
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
          <section className="toc-page py-6 print:py-8 border-t border-slate-200 print:border-none">
            <h2 className="text-base font-bold text-slate-950 uppercase tracking-tight font-mono mb-4">
              2. Table of Contents
            </h2>

            <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
              {filteredAndSortedDocs.map((doc, idx) => {
                const chNum = idx + 1;
                const cat = extractDocCategory(doc);
                const pts = extractDocPoints(doc);

                return (
                  <div
                    key={doc.slug}
                    className="flex items-center justify-between p-2.5 text-xs text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-4">
                      <span className="font-mono font-bold text-slate-700 shrink-0">
                        Chapter {chNum}:
                      </span>
                      <a
                        href={`#ch-${chNum}`}
                        className="font-medium text-slate-900 hover:underline truncate"
                      >
                        {doc.title}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-600">
                      <span>[{cat}]</span>
                      {pts > 0 && <span className="font-semibold">{pts} pts</span>}
                    </div>
                  </div>
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
                {/* Formal Chapter Header */}
                <header className="challenge-header-card border-b-2 border-slate-800 pb-3 mb-6">
                  {/* Chapter index label */}
                  <div className="flex items-center justify-between gap-3 text-xs font-mono text-slate-600 mb-1">
                    <span className="font-bold tracking-wider uppercase text-slate-800">
                      CHAPTER {chNum} · CHALLENGE {chNum} OF {filteredAndSortedDocs.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {doc.slug}
                    </span>
                  </div>

                  {/* Challenge Title */}
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight leading-snug mb-3">
                    {doc.title}
                  </h2>

                  {/* Formal Metadata Line */}
                  <div className="badge-container flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-700 pt-1">
                    <span>
                      <strong className="text-slate-900">Category:</strong> {cat}
                    </span>
                    {pts > 0 && (
                      <span>
                        <strong className="text-slate-900">Points:</strong> {pts} pts
                      </span>
                    )}
                    {diff && (
                      <span>
                        <strong className="text-slate-900">Difficulty:</strong> {diff}
                      </span>
                    )}
                    {isSolved && (
                      <span>
                        <strong className="text-slate-900">Status:</strong> Solved
                      </span>
                    )}
                    {doc.author && (
                      <span>
                        <strong className="text-slate-900">Author:</strong> @{doc.author}
                      </span>
                    )}
                    {doc.updatedAt && (
                      <span>
                        <strong className="text-slate-900">Date:</strong>{" "}
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    )}

                    {/* Extra fields */}
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
                        <span key={k}>
                          <strong className="text-slate-900">{k}:</strong> {String(v)}
                        </span>
                      );
                    })}
                  </div>
                </header>

                {/* Markdown Writeup Body */}
                <div className="prose-content mb-10 text-slate-900">
                  <Markdown source={doc.body} />
                </div>

                {/* Chapter End Divider (screen only) */}
                <div className="print:hidden border-b border-slate-200 my-8" />
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
