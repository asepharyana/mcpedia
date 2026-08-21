import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions, listDocuments } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";
import TOC from "@/components/TOC";
import { classifyPath, extractFoldersForSection } from "@mcpedia/core";
import { SECTIONS_BY_ID } from "@mcpedia/config/sections";
import type { DocumentMeta } from "@mcpedia/core";

// Render at request time (content in Postgres, not available at build time).
export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ section: string; slug: string[] }>;
  searchParams: Promise<{ edit?: string }>;
}

/**
 * Get section label and icon from the centralized config.
 */
function getSectionInfo(section: string) {
  const info = SECTIONS_BY_ID.get(section);
  if (!info) {
    return {
      label: section.charAt(0).toUpperCase() + section.slice(1),
      icon: "📄",
    };
  }
  return {
    label: info.label,
    icon: info.icon,
  };
}

/**
 * Render any extra/custom frontmatter fields as labeled badges.
 * This makes the system dynamic — the content creator decides what metadata
 * to include. Standard fields (title, author, tags, etc.) are handled
 * explicitly; any OTHER keys in frontmatter become badges here.
 */
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
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#1f2022]">
      {customEntries.map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        let colorClass = "bg-[#191a1b] border-[#23252a] text-[#d0d6e0]";
        let displayValue: string;

        // --- Auto-detect styling based on VALUE TYPE + VALUE CONTENTS ---
        // (NOT key name — content creators determine appearance via values,
        //  not by using specific key names)

        if (typeof value === "number") {
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
          displayValue = `${value}`;
        } else if (typeof value === "boolean") {
          colorClass = value
            ? "bg-green-500/15 border-green-500/25 text-green-400"
            : "bg-red-500/15 border-red-500/25 text-red-400";
          displayValue = value ? "Yes" : "No";
        } else if (Array.isArray(value)) {
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
          displayValue = value.join(", ");
        } else if (typeof value === "object" && value !== null) {
          displayValue = JSON.stringify(value).slice(0, 40) +
            (JSON.stringify(value).length > 40 ? "…" : "");
        } else {
          const v = String(value).toLowerCase();

          const diffMatch = v.match(
            /^(easy|simple|beginner)\b|^(medium|intermediate)\b|^(hard|expert|advanced)\b/i,
          );
          if (diffMatch) {
            if (/^easy|simple|beginner/i.test(v))
              colorClass = "bg-green-500/10 border-green-500/30 text-green-400";
            else if (/^medium|intermediate/i.test(v))
              colorClass = "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
            else if (/^hard|expert|advanced/i.test(v))
              colorClass = "bg-red-500/10 border-red-500/30 text-red-400";
            displayValue = diffMatch[0];
          } else if (/ctf|def.?con|hack|game|competition|tournament|qualifier/i.test(v)) {
            colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
            displayValue = String(value);
          } else if (/(\d+)\s*pts?$/i.test(v)) {
            const match = v.match(/(\d+)\s*pts?$/i);
            colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
            displayValue = match ? `${match[1]} pts` : String(value);
          } else if (/^(pwn|web|crypto|misc|forensic|reverse|pwnable|binary|webexploit)$/i.test(v)) {
            colorClass = "bg-orange-500/15 border-orange-500/25 text-orange-400";
            displayValue = v.charAt(0).toUpperCase() + v.slice(1);
          } else if (/^(solved|pending|wip|in.?progress|completed|todo)$/i.test(v)) {
            colorClass = v.includes("solved") || v.includes("completed")
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : v.includes("wip") || v.includes("progress")
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-red-500/10 border-red-500/30 text-red-400";
            displayValue = v.charAt(0).toUpperCase() + v.slice(1);
          } else {
            displayValue = String(value);
          }
        }

        return (
          <span
            key={key}
            className={`px-2 py-0.5 border rounded text-xs ${colorClass}`}
            title={label}
          >
            {displayValue}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Folder index page — lists all docs (and subfolders) whose path starts with
 * the given prefix. This enables GitHub-style nested folder browsing.
 */
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
    .filter((d) => d.path.startsWith(prefix))
    .map((d) => ({
      rel: d.path.slice(prefix.length).replace(/\.md$/, ""),
      doc: d,
    }))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  // Group into immediate children: folders vs leaf docs
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

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#62666d] mb-6">
        <Link href="/" className="hover:text-[#d0d6e0] transition-colors">
          MCPedia
        </Link>
        <span>/</span>
        <Link
          href={`/${section}`}
          className="hover:text-[#d0d6e0] transition-colors"
        >
          {sectionInfo.label}
        </Link>
        {slug.split("/").map((part, i) => {
          const path = `${section}/${slug.split("/").slice(0, i + 1).join("/")}`;
          const isLast = i === slug.split("/").length - 1;
          const label = part
            .split(/[-_]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return (
            <>
              <span>/</span>
              <span
                key={path}
                className={isLast ? "text-[#8a8f98]" : "hover:text-[#d0d6e0]"}
              >
                {label}
              </span>
            </>
          );
        })}
      </nav>

      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl">📁</span>
        <h1 className="text-3xl font-medium text-[#f7f8f8]">
          {slug.split("/").pop()!.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
        </h1>
        <span className="text-xs text-[#62666d] bg-[#191a1b] px-2 py-0.5 rounded">
          {immediateDocs.length + folders.length} item{folders.length + immediateDocs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {(folders.length > 0 || immediateDocs.length > 0) ? (
        <div>
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-medium text-[#8a8f98] uppercase mb-3 tracking-wider">
                Subfolders
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {folders.map(([folder, info]) => (
                  <Link
                    key={folder}
                    href={`/${section}/${slug}/${folder}`.replace(/\/+/g, "/")}
                    className="group flex items-center gap-3 p-3 bg-[#0f1011] border border-[#1f2022] rounded-lg hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all"
                  >
                    <span className="text-2xl">📁</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors">
                        {folder.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </div>
                      <div className="text-xs text-[#62666d] mt-0.5">
                        {info.docCount} document{info.docCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {immediateDocs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-[#8a8f98] uppercase mb-3 tracking-wider">
                Documents
              </h2>
              <div className="space-y-2">
                {immediateDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/${doc.slug}`}
                    className="group flex items-center justify-between gap-3 p-3 bg-[#0f1011] border border-[#1f2022] rounded-lg hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">📄</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1">
                          {doc.title}
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-xs px-1.5 py-0.25 bg-[#191a1b] border border-[#23252a] rounded text-[#8a8f98]"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <time className="text-xs text-[#62666d] flex-shrink-0">
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
        </div>
      ) : (
        <p className="text-sm text-[#62666d]">No documents found in this folder.</p>
      )}
    </div>
  );
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { section, slug } = await params;
  const { edit } = await searchParams;
  const fullSlug = `${section}/${slug.join("/")}`;

  // Fetch all docs to classify the path as "doc" or "folder"
  const allDocs = await listDocuments();
  const docPaths = allDocs.map((d) => d.path);

  const classification = classifyPath(docPaths, fullSlug);

  // If the slug path is a folder (not a leaf doc), render the folder index
  if (classification === "folder") {
    return <FolderIndexPage section={section} slug={slug.join("/")} allDocs={allDocs} />;
  }

  // Otherwise, treat as a document (existing behavior)
  const doc = await getDocument(fullSlug);
  if (!doc) notFound();

  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  // Standard frontmatter keys that are rendered explicitly in the template.
  // Any other key in the document metadata becomes a dynamic badge.
  const STANDARD_KEYS = new Set([
    "id", "slug", "title", "type", "section", "status",
    "author", "tags", "path", "createdAt", "updatedAt", "extraFields",
  ]);

  // Edit mode: inline form
  if (edit === "1" && canEdit) {
    const existingFolders = extractFoldersForSection(docPaths, doc.section);
    return (
      <div>
        <Link
          href={`/${doc.slug}`}
          className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] mb-4 inline-block"
        >
          ← Back to {doc.title}
        </Link>
        <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">
          Edit: {doc.title}
        </h1>
        <DocForm
          mode="edit"
          slug={fullSlug}
          secret={WEBHOOK_SECRET}
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

  const related = await getRelated(fullSlug, 5);
  const revisions = await listRevisions(fullSlug, 10);

  const sectionInfo = getSectionInfo(doc.section);

  return (
    <article>
      {/* Breadcrumb — dynamic based on the doc's actual path */}
      <nav className="flex items-center gap-2 text-xs text-[#62666d] mb-6">
        <Link
          href="/"
          className="hover:text-[#d0d6e0] transition-colors"
        >
          MCPedia
        </Link>
        {doc.slug.split("/").map((part, i) => {
          const crumbPath = doc.slug.split("/").slice(0, i + 1).join("/");
          const isLast = i === doc.slug.split("/").length - 1;
          const label = i === 0
            ? sectionInfo.label
            : part
                .split(/[-_]/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
          return (
            <>
              <span>/</span>
              <Link
                key={crumbPath}
                href={`/${crumbPath}`}
                className={
                  isLast
                    ? "text-[#8a8f98]"
                    : "hover:text-[#d0d6e0] transition-colors"
                }
              >
                {label}
              </Link>
            </>
          );
        })}
      </nav>

      {/* Metadata Card */}
      <div className="bg-[#0f1011] border border-[#1f2022] rounded-lg p-6 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">
            {sectionInfo.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-[#7170ff] uppercase">
                {sectionInfo.label}
              </span>
              <span className="text-xs text-[#62666d]">·</span>
              <span className="text-xs text-[#62666d]">
                {doc.type}
              </span>
            </div>
            <h1 className="text-3xl font-medium text-[#f7f8f8] leading-tight">
              {doc.title}
            </h1>
          </div>
        </div>

        {/* Author + date + tags */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#62666d] mb-3">
          {doc.author && (
            <>
              <span className="text-[#d0d6e0]">by {doc.author}</span>
              <span>·</span>
            </>
          )}
          <span className="text-[#d0d6e0]">
            updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {doc.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dynamic custom field badges — content creator controls what shows */}
        <CustomFieldBadges doc={{ ...doc }} standardKeys={STANDARD_KEYS} />
      </div>

      {/* Content + TOC */}
      <div className="mb-12">
        <TOC source={doc.body} />
        <Markdown source={doc.body} />
      </div>

      {/* Related docs (card-style) */}
      {related.length > 0 && (
        <aside className="mt-12 pt-8 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-5">
            Related Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => {
              const rInfo = getSectionInfo(r.section);
              return (
                <Link
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xl">
                      {rInfo.icon}
                    </span>
                    <time className="text-xs text-[#62666d]">
                      {new Date(r.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-1">
                    {r.title}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      )}

      {/* History */}
      {revisions.length > 0 && (
        <aside className="mt-12 pt-8 border-t border-[#1f2022]">
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-4">
            Revision History
          </h2>
          <ul className="space-y-2 text-sm">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[#141516] last:border-0"
              >
                <span className="text-[#8a8f98]">
                  #{rev.revisionNo} · {rev.reason} ·{" "}
                  {new Date(rev.createdAt).toLocaleString()}
                </span>
                <form action="/api/revisions/restore" method="post">
                  <input type="hidden" name="id" value={rev.id} />
                  <button
                    type="submit"
                    className="text-xs text-[#d0d6e0] hover:text-[#7170ff] px-2 py-0.5 rounded border border-[#1f2022] hover:border-[#7170ff] transition-colors"
                  >
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
