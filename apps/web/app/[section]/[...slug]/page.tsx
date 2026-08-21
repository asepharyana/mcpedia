import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions, listDocuments } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";
import TOC from "@/components/TOC";
import DocActions from "@/components/DocActions";
import { classifyPath, extractFoldersForSection } from "@mcpedia/core";
import { getSectionMeta } from "@mcpedia/config";
import type { DocumentMeta } from "@mcpedia/core";

export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ section: string; slug: string[] }>;
  searchParams: Promise<{ edit?: string }>;
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
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-[var(--border-color)]">
      {customEntries.map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        let colorClass = "bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-secondary)]";
        let icon = "🏷️";
        let displayValue: string;

        if (typeof value === "number") {
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#5e6ad2] dark:text-[#7170ff]";
          icon = "🎯";
          displayValue = `${value} pts`;
        } else if (typeof value === "boolean") {
          colorClass = value
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
          icon = value ? "✓" : "✕";
          displayValue = value ? "Solved" : "Pending";
        } else if (Array.isArray(value)) {
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#5e6ad2] dark:text-[#7170ff]";
          icon = "🗂️";
          displayValue = value.join(", ");
        } else {
          const v = String(value).toLowerCase();
          if (/^(easy|simple|beginner)/i.test(v)) {
            colorClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
            icon = "🟢";
            displayValue = "Easy";
          } else if (/^(medium|intermediate)/i.test(v)) {
            colorClass = "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
            icon = "🟡";
            displayValue = "Medium";
          } else if (/^(hard|expert|advanced)/i.test(v)) {
            colorClass = "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
            icon = "🔴";
            displayValue = "Hard";
          } else if (/^(pwn|web|crypto|misc|forensic|reverse|binary)/i.test(v)) {
            colorClass = "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300";
            icon = "⚡";
            displayValue = v.toUpperCase();
          } else if (/ctf|def.?con|event/i.test(v)) {
            colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#5e6ad2] dark:text-[#7170ff]";
            icon = "🏆";
            displayValue = String(value);
          } else {
            displayValue = String(value);
          }
        }

        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-xs font-mono transition-colors ${colorClass}`}
          >
            <span className="text-[10px] opacity-70">{icon}</span>
            <span className="text-[var(--text-muted)] font-sans">{label}:</span>
            <span className="font-medium">{displayValue}</span>
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
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-dim)] mb-6 flex-wrap">
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

      {/* Header card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-xl">
              📁
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {folderName}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Directory path: <code className="text-[#5e6ad2] dark:text-[#7170ff] font-mono">{section}/{slug}</code>
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-color)] px-2.5 py-1 rounded-md">
            {immediateDocs.length + folders.length} item{folders.length + immediateDocs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Subfolders */}
      {folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-3 tracking-wider flex items-center gap-2">
            <span>Subfolders</span>
            <span className="text-[10px] text-[var(--text-dim)]">({folders.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map(([folder, info]) => (
              <Link
                key={folder}
                href={`/${section}/${slug}/${folder}`.replace(/\/+/g, "/")}
                className="group flex items-center gap-3 p-3.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-lg transition-all shadow-sm"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#5e6ad2] dark:group-hover:text-[#7170ff] transition-colors truncate">
                    {folder.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                    {info.docCount} document{info.docCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {immediateDocs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-3 tracking-wider flex items-center gap-2">
            <span>Documents</span>
            <span className="text-[10px] text-[var(--text-dim)]">({immediateDocs.length})</span>
          </h2>
          <div className="space-y-2">
            {immediateDocs.map((doc) => (
              <Link
                key={doc.slug}
                href={`/${doc.slug}`}
                className="group flex items-center justify-between gap-4 p-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-lg transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl opacity-70 group-hover:opacity-100">📄</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#5e6ad2] dark:group-hover:text-[#7170ff] transition-colors truncate">
                      {doc.title}
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {doc.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-1.5 py-0.25 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded text-[var(--text-muted)]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <time className="text-xs text-[var(--text-dim)] shrink-0 font-mono">
                  {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </Link>
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && immediateDocs.length === 0 && (
        <div className="text-center py-12 border border-[var(--border-color)] rounded-xl bg-[var(--bg-surface)]">
          <p className="text-sm text-[var(--text-muted)]">No documents found in this directory.</p>
        </div>
      )}
    </div>
  );
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { section, slug } = await params;
  const { edit } = await searchParams;
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
      <div>
        <Link
          href={`/${doc.slug}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors"
        >
          <span>← Back to document</span>
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
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
        {/* Breadcrumb */}
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
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#5e6ad2]/15 text-[#5e6ad2] dark:text-[#7170ff] border border-[#5e6ad2]/30">
                  <span>{sectionInfo.icon}</span>
                  <span className="uppercase">{sectionInfo.label}</span>
                </span>
                <span className="text-xs text-[var(--text-dim)]">·</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                </span>
                <span className="text-xs text-[var(--text-dim)]">·</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {readingTime}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                {doc.title}
              </h1>
            </div>

            {/* Quick Actions */}
            <DocActions slug={doc.slug} body={doc.body} canEdit={canEdit} />
          </div>

          {/* Author + Date + Tags */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
            {doc.author && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#5e6ad2] text-white flex items-center justify-center text-[10px] font-bold">
                  {doc.author.charAt(0).toUpperCase()}
                </div>
                <span className="text-[var(--text-secondary)]">{doc.author}</span>
                <span className="text-[var(--text-dim)]">·</span>
              </div>
            )}
            <span>
              Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {doc.tags.length > 0 && (
              <>
                <span className="text-[var(--text-dim)]">·</span>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded text-[var(--text-muted)] text-[11px]"
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
        <div className="xl:hidden mb-6 p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-sm">
          <TOC source={doc.body} />
        </div>

        {/* Markdown content */}
        <div className="mb-14">
          <Markdown source={doc.body} />
        </div>

        {/* Related Documents */}
        {related.length > 0 && (
          <aside className="mt-12 pt-8 border-t border-[var(--border-color)]">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>Related Knowledge</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => {
                const rInfo = getSectionInfo(r.section);
                return (
                  <Link
                    key={r.slug}
                    href={`/${r.slug}`}
                    className="group block bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-lg p-4 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-[#5e6ad2] dark:text-[#7170ff] font-mono uppercase">
                        {rInfo.icon} {r.section}
                      </span>
                      <time className="text-[11px] text-[var(--text-dim)] font-mono">
                        {new Date(r.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#5e6ad2] dark:group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-1">
                      {r.title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        {/* Revision History */}
        {revisions.length > 0 && (
          <aside className="mt-10 pt-8 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Revision History ({revisions.length})
              </h2>
            </div>
            <div className="space-y-2">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[#5e6ad2] dark:text-[#7170ff] bg-[#5e6ad2]/10 px-1.5 py-0.5 rounded border border-[#5e6ad2]/30 font-semibold">
                      v{rev.revisionNo}
                    </span>
                    <span className="text-[var(--text-primary)] truncate">
                      {rev.reason || "Updated document"}
                    </span>
                    <span className="text-[var(--text-dim)] hidden sm:inline">
                      · {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {canEdit && (
                    <form action="/api/revisions/restore" method="post">
                      <input type="hidden" name="id" value={rev.id} />
                      <button
                        type="submit"
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] px-2.5 py-1 rounded border border-[var(--border-color)] hover:border-[var(--brand)] transition-colors font-medium shadow-sm"
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
