"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import {
  extractDocCategory,
  extractDocPoints,
  extractDocDifficulty,
  sortExportDocuments,
  compileExportMarkdown,
  type Document,
  type ExportData,
  type ExportSortOption,
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

  // Filter out any leftover index / meta files
  const cleanDocs = useMemo(() => {
    return initialDocs.filter((d) => {
      const slug = d.slug.toLowerCase();
      return (
        !slug.endsWith("/_index") &&
        !slug.endsWith("/index") &&
        slug !== "_index" &&
        slug !== "index" &&
        d.type !== "writeup-index"
      );
    });
  }, [initialDocs]);

  // Configuration and interactive state
  const [sortBy, setSortBy] = useState<ExportSortOption>("category_points");
  const [showTOC, setShowTOC] = useState(cleanDocs.length > 1);
  const [pageBreaks, setPageBreaks] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedMd, setCopiedMd] = useState(false);

  const sectionMeta = getSectionMeta(summary.section);
  const authorsList = summary.authors || [];

  // Available categories for filtering
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const doc of cleanDocs) {
      set.add(extractDocCategory(doc));
    }
    return Array.from(set).sort();
  }, [cleanDocs]);

  // Filtered & Sorted documents
  const filteredAndSortedDocs = useMemo(() => {
    let docs = [...cleanDocs];
    if (selectedCategory !== "all") {
      docs = docs.filter(
        (d) => extractDocCategory(d).toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    return sortExportDocuments(docs, sortBy);
  }, [cleanDocs, selectedCategory, sortBy]);

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
            {cleanDocs.length > 1 && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTOC}
                  onChange={(e) => setShowTOC(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-slate-800"
                />
                <span>Table of Contents</span>
              </label>
            )}

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pageBreaks}
                onChange={(e) => setPageBreaks(e.target.checked)}
                className="rounded border-[var(--border-color)] text-slate-800"
              />
              <span>Page Break per Challenge</span>
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
              All ({cleanDocs.length})
            </button>
            {allCategories.map((cat) => {
              const count = cleanDocs.filter(
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
          Clean, Simple, Human-Written Writeup Document Flow (No Cards)
          ========================================================================= */}
      <main className="print-container bg-white text-slate-900 max-w-4xl mx-auto px-4 sm:px-8 py-6 print:p-0 print:max-w-none">
        
        {/* Document Header */}
        <header className="mb-8 pb-4 border-b border-slate-300">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mb-2">
            {summary.title}
          </h1>
          <div className="text-xs text-slate-600 font-mono flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Scope:</strong> {summary.scope}</span>
            <span><strong>Total Challenges:</strong> {filteredAndSortedDocs.length}</span>
            {currentTotalPoints > 0 && (
              <span><strong>Total Points:</strong> {currentTotalPoints.toLocaleString()} pts</span>
            )}
            {authorsList.length > 0 && (
              <span><strong>Author(s):</strong> {authorsList.map((a) => `@${a}`).join(", ")}</span>
            )}
            <span><strong>Date:</strong> {new Date(summary.generatedAt).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
          </div>
        </header>

        {/* Table of Contents (Simple & Clean) */}
        {showTOC && filteredAndSortedDocs.length > 1 && (
          <section className="toc-section mb-10 pb-6 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase font-mono text-slate-700 mb-3 tracking-wider">
              Table of Contents
            </h2>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800">
              {filteredAndSortedDocs.map((doc, idx) => {
                const cat = extractDocCategory(doc);
                const pts = extractDocPoints(doc);

                return (
                  <li key={doc.slug}>
                    <a
                      href={`#ch-${idx + 1}`}
                      className="hover:underline font-medium text-slate-900"
                    >
                      {doc.title}
                    </a>
                    <span className="text-slate-500 font-mono ml-2">
                      [{cat}{pts > 0 ? ` · ${pts} pts` : ""}]
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Challenges / Writeups Flow ("Mirip Writeup Manusia") */}
        <div className="challenges-flow space-y-10 print:space-y-0">
          {filteredAndSortedDocs.map((doc, idx) => {
            const chNum = idx + 1;
            const cat = extractDocCategory(doc);
            const pts = extractDocPoints(doc);
            const diff = extractDocDifficulty(doc);
            const extra = doc.extraFields || {};

            return (
              <article
                key={doc.slug}
                id={`ch-${chNum}`}
                className={`challenge-entry ${
                  pageBreaks && idx > 0 ? "page-break-before" : ""
                } pt-6 first:pt-0`}
              >
                {/* Challenge Title & Metadata */}
                <div className="mb-4 pb-2 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-950 tracking-tight leading-tight mb-1.5">
                    {chNum}. {doc.title}
                  </h2>
                  <div className="text-xs font-mono text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span><strong>Category:</strong> {cat}</span>
                    {pts > 0 && <span><strong>Points:</strong> {pts} pts</span>}
                    {diff && <span><strong>Difficulty:</strong> {diff}</span>}
                    {doc.author && <span><strong>Author:</strong> @{doc.author}</span>}
                    {doc.slug && <span><strong>Slug:</strong> {doc.slug}</span>}

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
                          "challenge",
                        ].includes(lowerKey) ||
                        v === null ||
                        v === undefined ||
                        v === ""
                      ) {
                        return null;
                      }
                      return (
                        <span key={k}>
                          <strong>{k}:</strong> {String(v)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Markdown Writeup Content */}
                <div className="prose prose-slate max-w-none text-slate-900 mb-8">
                  <Markdown source={doc.body} />
                </div>

                {/* Divider between challenges (screen only) */}
                <hr className="print:hidden border-slate-200 my-8" />
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
