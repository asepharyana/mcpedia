import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExportDocuments, formatScopeTitle, type ExportSortOption } from "@mcpedia/core";
import PdfExportView from "@/components/PdfExportView";

export const dynamic = "force-dynamic";

interface ExportPdfPageProps {
  searchParams: Promise<{
    path?: string;
    section?: string;
    slug?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ExportPdfPageProps) {
  const { path, section, slug } = await searchParams;
  const target = path || slug || section || "All Documents";
  const title = formatScopeTitle(target);
  return {
    title: `Export PDF: ${title} — MCPedia`,
    description: `Export and print documentation and CTF writeups for ${title}`,
  };
}

export default async function ExportPdfPage({
  searchParams,
}: ExportPdfPageProps) {
  const { path, section, slug, sort } = await searchParams;

  const targetPath = path || slug;
  const sortBy = (sort as ExportSortOption) || "category_points";

  const exportData = await getExportDocuments({
    path: targetPath,
    section: !targetPath ? section : undefined,
    sortBy,
  });

  const backHref = targetPath ? `/${targetPath}` : section ? `/${section}` : "/";

  if (exportData.documents.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 max-w-lg mx-auto">
        <div className="text-4xl">📄</div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          No Documents Found for Export
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Could not find any published documents matching the path{" "}
          <code className="text-[var(--brand)] font-mono">
            {targetPath || section || "root"}
          </code>
          .
        </p>
        <div className="pt-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <span>← Return to Knowledge Base</span>
          </Link>
        </div>
      </div>
    );
  }

  return <PdfExportView exportData={exportData} backHref={backHref} />;
}
