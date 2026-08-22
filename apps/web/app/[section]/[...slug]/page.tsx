import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions, listDocuments, getExportDocuments } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";
import TOC from "@/components/TOC";
import DocActions from "@/components/DocActions";
import PdfExportView from "@/components/PdfExportView";
import { classifyPath, extractFoldersForSection } from "@mcpedia/core";
import { getSectionMeta } from "@mcpedia/config";
import type { DocumentMeta } from "@mcpedia/core";
import {
  Folder,
  FileText,
  Clock,
  User,
  Tag,
  History,
  FileDown,
  ArrowLeft,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ section: string; slug: string[] }>;
  searchParams: Promise<{ edit?: string; path?: string; sort?: string }>;
}

function getSectionInfo(section: string) {
  return getSectionMeta(section);
}

function calculateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

function CustomFieldBadges({
  doc,
  standardKeys,
}: {
  doc: Record<string, unknown>;
  standardKeys: Set<string>;
}) {
  const docRecord: Record<string, unknown> = { ...doc } as Record<string, unknown>;
  const customEntries = Object.entries(docRecord).filter(
    ([k, v]) =>
      !standardKeys.has(k) && v !== undefined && v !== null && v !== "" && !k.startsWith("_"),
  );

  if (customEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border-color)]">
      {customEntries.map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        let colorClass = "bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-secondary)]";
        let displayValue: string;
        let IconComponent = Tag;

        if (typeof value === "number") {
          colorClass = "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)] dark:text-[var(--accent)]";
          IconComponent = Target;
          displayValue = `${value} pts`;
        } else if (typeof value === "boolean") {
          colorClass = value
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
          IconComponent = value ? CheckCircle2 : XCircle;
          displayValue = value ? "Solved" : "Pending";
        } else if (Array.isArray(value)) {
          colorClass = "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)] dark:text-[var(--accent)]";
          IconComponent = Folder;
          displayValue = value.join(", ");
        } else {
          const v = String(value).toLowerCase();
          if (/^(easy|simple|beginner)/i.test(v)) {
            colorClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
            displayValue = "Easy";
          } else if (/^(medium|intermediate)/i.test(v)) {
            colorClass = "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
            displayValue = "Medium";
          } else if (/^(hard|expert|advanced)/i.test(v)) {
            colorClass = "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
            displayValue = "Hard";
          } else if (/^(pwn|web|crypto|misc|forensic|reverse|binary)/i.test(v)) {
            colorClass = "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300";
            IconComponent = Zap;
            displayValue = v.toUpperCase();
          } else if (/ctf|def.?con|event/i.test(v)) {
            colorClass = "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-[var(--brand)] dark:text-[var(--accent)]";
            IconComponent = Trophy;
            displayValue = String(value);
          } else {
            displayValue = String(value);
          }
        }

        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-xs font-mono transition-colors ${colorClass}`}
          >
            <IconComponent className="w-3.5 h-3.5 opacity-80" />
            <span className="text-[var(--text-muted)] font-sans">{label}:</span>
            <span className="font-semibold">{displayValue}</span>
          </span>
        );
      })}
    </div>
  );
}

function FolderIndexPage({
  section,
  slug,
  allDocs,
}: {
  section: string;
  slug: string;
  allDocs: DocumentMeta[];
}) {
  const prefix = `${section}/${slug}/`;
  const folderDocPaths = allDocs
    .filter((d) => d.slug.startsWith(prefix))
    .map((d) => ({
      rel: d.slug.slice(prefix.length),
      doc: d,
    }))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const immediateFolders = new Map<string, { docCount: number }>();
  const immediateDocs: DocumentMeta[] = [];

  for (const { rel, doc } of folderDocPaths) {
    const parts = rel.split("/");
    if (parts.length === 1) {
      immediateDocs.push(doc);
    } else {
      const folder = parts[0];
      const existing = immediateFolders.get(folder) || { docCount: 0 };
      existing.docCount += 1;
      immediateFolders.set(folder, existing);
    }
  }

  const folders = [...immediateFolders.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sectionInfo = getSectionInfo(section);
  const folderName = slug.split("/").pop()!.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-dim)] flex-wrap">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
          MCPedia
        </Link>
        <span>/</span>
        <Link href={`/${section}`} className="hover:text-[var(--text-primary)] transition-colors">
          {sectionInfo.label}
        </Link>
        {slug.split("/").map((part, i) => {
          const path = `${section}/${slug.split("/").slice(0, i + 1).join("/")}`;
          const isLast = i === slug.split("/").length - 1;
          const label = part.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          return (
            <span key={path} className="flex items-center gap-2">
              <span>/</span>
              <span className={isLast ? "text-[var(--text-primary)] font-semibold" : "hover:text-[var(--text-primary)]"}>
                {label}
              </span>
            </span>
          );
        })}
      </nav>

      {/* Header Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--brand)] dark:text-[var(--accent)] shadow-inner">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {folderName}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                Directory: <code className="text-[var(--brand)] dark:text-[var(--accent)] font-semibold">{section}/{slug}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg">
              {immediateDocs.length + folders.length} item{folders.length + immediateDocs.length !== 1 ? "s" : ""}
            </span>
            <Link
              href={`/${section}/${slug}/export`}
              className="inline-flex items-center gap-1.5 text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-md shadow-[var(--brand)]/20"
              title={`Export all ${folderName} documents as a single PDF report`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Subfolders Grid */}
      {folders.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3.5 tracking-wider font-mono flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-[var(--brand)] dark:text-[var(--accent)]" />
            <span>Subfolders ({folders.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map(([folder, info]) => (
              <Link
                key={folder}
                href={`/${section}/${slug}/${folder}`.replace(/\/+/g, "/")}
                className="group flex items-center gap-3.5 p-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="p-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--brand)] dark:text-[var(--accent)]">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors truncate">
                    {folder.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                    {info.docCount} document{info.docCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {immediateDocs.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3.5 tracking-wider font-mono flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[var(--brand)] dark:text-[var(--accent)]" />
            <span>Documents ({immediateDocs.length})</span>
          </h2>
          <div className="space-y-2.5">
            {immediateDocs.map((doc) => (
              <Link
                key={doc.slug}
                href={`/${doc.slug}`}
                className="group flex items-center justify-between gap-4 p-4 sm:p-5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-dim)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors truncate">
                      {doc.title}
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {doc.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-md text-[var(--text-muted)] font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <time className="text-xs text-[var(--text-dim)] shrink-0 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </time>
              </Link>
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && immediateDocs.length === 0 && (
        <div className="text-center py-16 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]">
          <p className="text-sm text-[var(--text-muted)]">No documents found in this directory.</p>
        </div>
      )}
    </div>
  );
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { section, slug } = await params;
  const searchParamsObj = await searchParams;
  const { edit, path: queryPath, sort } = searchParamsObj;

  // Handle direct export views: /[section]/export, /[section]/[...folder]/export, or /export/pdf
  if (section === "export" || (slug && slug[slug.length - 1] === "export")) {
    const isTrailingExport = slug && slug[slug.length - 1] === "export";
    const targetSlug = isTrailingExport ? slug.slice(0, -1) : slug;
    const targetPath = queryPath || (targetSlug.length > 0 ? `${section}/${targetSlug.join("/")}` : section);
    const exportData = await getExportDocuments({
      path: targetPath === "export" ? queryPath : targetPath,
      section: targetPath === section ? section : undefined,
      sortBy: (sort as any) || "category_points",
    });
    const backHref = targetPath && targetPath !== "export" ? `/${targetPath}` : section !== "export" ? `/${section}` : "/";
    return <PdfExportView exportData={exportData} backHref={backHref} />;
  }

  const fullSlug = `${section}/${slug.join("/")}`;

  const allDocs = await listDocuments();
  const docSlugs = allDocs.map((d) => d.slug);
  const classification = classifyPath(docSlugs, fullSlug);

  if (classification === "folder") {
    return <FolderIndexPage section={section} slug={slug.join("/")} allDocs={allDocs} />;
  }

  const doc = await getDocument(fullSlug);
  if (!doc) notFound();

  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  const STANDARD_KEYS = new Set([
    "id", "slug", "title", "type", "section", "status",
    "author", "tags", "path", "createdAt", "updatedAt",
    "extraFields", "body",
  ]);

  if (edit === "1" && canEdit) {
    const existingFolders = extractFoldersForSection(docSlugs, doc.section);
    return (
      <div className="space-y-6">
        <Link
          href={`/${doc.slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to document</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Edit: {doc.title}
        </h1>
        <DocForm
          mode="edit"
          slug={fullSlug}
          secret={WEBHOOK_SECRET}
          existingSections={Array.from(new Set(allDocs.map((d) => d.section)))}
          existingFolders={{
            [doc.section]: existingFolders,
          }}
          initial={{
            title: doc.title,
            body: doc.body,
            section: doc.section,
            type: doc.type,
            status: doc.status,
            tags: doc.tags,
            author: doc.author,
            extraFields: doc.extraFields,
          }}
        />
      </div>
    );
  }

  const related = await getRelated(fullSlug, 4);
  const revisions = await listRevisions(fullSlug, 10);
  const sectionInfo = getSectionInfo(doc.section);
  const readingTime = calculateReadingTime(doc.body);

  return (
    <div className="flex items-start gap-8">
      {/* Main Content Column */}
      <article className="flex-1 min-w-0">
        {/* Breadcrumbs Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-dim)] mb-4 flex-wrap">
          <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
            MCPedia
          </Link>
          {doc.slug.split("/").map((part, i) => {
            const crumbPath = doc.slug.split("/").slice(0, i + 1).join("/");
            const isLast = i === doc.slug.split("/").length - 1;
            const label = i === 0
              ? sectionInfo.label
              : part.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            return (
              <span key={crumbPath} className="flex items-center gap-2">
                <span>/</span>
                <Link
                  href={`/${crumbPath}`}
                  className={isLast ? "text-[var(--text-primary)] font-semibold" : "hover:text-[var(--text-primary)] transition-colors"}
                >
                  {label}
                </Link>
              </span>
            );
          })}
        </nav>

        {/* Hero Metadata Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-7 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--brand)]/15 text-[var(--brand)] dark:text-[var(--accent)] border border-[var(--brand)]/30 uppercase">
                  <span>{sectionInfo.icon}</span>
                  <span>{sectionInfo.label}</span>
                </span>
                <span className="text-xs text-[var(--text-dim)]">·</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                </span>
                <span className="text-xs text-[var(--text-dim)]">·</span>
                <span className="text-xs text-[var(--text-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{readingTime}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                {doc.title}
              </h1>
            </div>

            {/* Quick Actions Deck */}
            <DocActions slug={doc.slug} body={doc.body} canEdit={canEdit} />
          </div>

          {/* Author, Date, and Tags */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border-color)]">
            {doc.author && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-[10px] font-bold">
                  {doc.author.charAt(0).toUpperCase()}
                </div>
                <span className="text-[var(--text-secondary)] font-medium">{doc.author}</span>
                <span className="text-[var(--text-dim)]">·</span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--text-dim)]" />
              <span>
                Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>

            {doc.tags.length > 0 && (
              <>
                <span className="text-[var(--text-dim)]">·</span>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-md text-[var(--text-muted)] text-[11px] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dynamic Badges */}
          <CustomFieldBadges doc={{ ...doc }} standardKeys={STANDARD_KEYS} />
        </div>

        {/* Mobile TOC (rendered inline on smaller screens) */}
        <div className="xl:hidden mb-6 p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
          <TOC source={doc.body} />
        </div>

        {/* Markdown Content */}
        <div className="mb-14">
          <Markdown source={doc.body} />
        </div>

        {/* Related Documents Grid */}
        {related.length > 0 && (
          <aside className="mt-14 pt-8 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
              <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Related Knowledge & Writeups
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {related.map((r) => {
                const rInfo = getSectionInfo(r.section);
                return (
                  <Link
                    key={r.slug}
                    href={`/${r.slug}`}
                    className="group block bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-[var(--brand)] dark:text-[var(--accent)] font-mono uppercase font-semibold">
                        {rInfo.icon} {r.section}
                      </span>
                      <time className="text-[11px] text-[var(--text-dim)] font-mono">
                        {new Date(r.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-1">
                      {r.title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        {/* Revision History Timeline */}
        {revisions.length > 0 && (
          <aside className="mt-10 pt-8 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
                <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Revision History ({revisions.length})
                </h2>
              </div>
            </div>
            <div className="space-y-2">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between gap-3 p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[var(--brand)] dark:text-[var(--accent)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-md border border-[var(--brand)]/30 font-bold">
                      v{rev.revisionNo}
                    </span>
                    <span className="text-[var(--text-primary)] font-medium truncate">
                      {rev.reason || "Updated document in PostgreSQL"}
                    </span>
                    <span className="text-[var(--text-dim)] hidden sm:inline font-mono">
                      · {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {canEdit && (
                    <form action="/api/revisions/restore" method="post">
                      <input type="hidden" name="id" value={rev.id} />
                      <button
                        type="submit"
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] px-3 py-1 rounded-lg border border-[var(--border-color)] hover:border-[var(--brand)] transition-colors font-semibold shadow-xs cursor-pointer"
                      >
                        Restore
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </article>

      {/* Desktop Sticky Table of Contents Column */}
      <aside className="hidden xl:block w-64 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pl-6 border-l border-[var(--border-color)]">
        <TOC source={doc.body} />
      </aside>
    </div>
  );
}
