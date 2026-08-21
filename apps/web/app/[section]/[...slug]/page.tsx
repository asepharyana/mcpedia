import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDocument, getRelated, listRevisions, listDocuments } from "@mcpedia/core";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import Markdown from "@/components/Markdown";
import DocForm from "@/components/DocForm";
import TOC from "@/components/TOC";
import { classifyPath, extractFoldersForSection } from "@mcpedia/core";

// Render at request time (content in Postgres, not available at build time).
export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ section: string; slug: string[] }>;
  searchParams: Promise<{ edit?: string }>;
}

const SECTION_LABEL: Record<string, string> = {
  docs: "Documentation",
  writeups: "Writeup",
  research: "Research",
  notes: "Note",
};

const SECTION_ICON: Record<string, string> = {
  docs: "📄",
  writeups: "📝",
  research: "🔬",
  notes: "📌",
};

/**
 * Render any extra/custom frontmatter fields as badges.
 * This makes the system dynamic — the content creator decides what metadata
 * to include, not the UI template. Standard fields (title, author, tags, etc.)
 * are handled explicitly; any OTHER keys in frontmatter become badges here.
 */
function CustomFieldBadges({
  doc,
  standardKeys,
}: {
  doc: Record<string, unknown>;
  standardKeys: Set<string>;
}) {
  // Convert doc to a plain record to get index signature
  const docRecord: Record<string, unknown> = { ...doc } as Record<string, unknown>;
  const customEntries = Object.entries(docRecord).filter(
    ([k, v]) =>
      !standardKeys.has(k) && v !== undefined && v !== null && v !== "" && !k.startsWith("_"),
  );

  if (customEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {customEntries.map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        let colorClass = "bg-[#191a1b] border-[#23252a] text-[#d0d6e0]";
        let displayValue: string;

        // --- Auto-detect styling based on VALUE TYPE + VALUE CONTENTS ---
        // (NOT key name — content creators determine appearance via values,
        //  not by using specific key names)

        if (typeof value === "number") {
          // Numeric values → purple "points"-style badge with + prefix
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
          displayValue = `${value}`;
        } else if (typeof value === "boolean") {
          // Boolean values → green check/X
          colorClass = value
            ? "bg-green-500/15 border-green-500/25 text-green-400"
            : "bg-red-500/15 border-red-500/25 text-red-400";
          displayValue = value ? "Yes" : "No";
        } else if (Array.isArray(value)) {
          // Arrays → purple badge, joined values
          colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
          displayValue = value.join(", ");
        } else if (typeof value === "object" && value !== null) {
          // Objects → neutral badge, truncated JSON
          displayValue = JSON.stringify(value).slice(0, 40) +
            (JSON.stringify(value).length > 40 ? "…" : "");
        } else {
          // String values — auto-detect content type for styling
          const v = String(value).toLowerCase();

          // Difficulty-like values (easy/medium/hard/etc) OR numeric with suffix
          const diffMatch = v.match(
            /^(easy|simple|beginner)\b|^(medium|intermediate)\b|^(hard|expert|advanced)\b/i
          );
          if (diffMatch) {
            if (/^easy|simple|beginner/i.test(v))
              colorClass = "bg-green-500/10 border-green-500/30 text-green-400";
            else if (/^medium|intermediate/i.test(v))
              colorClass = "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
            else if (/^hard|expert|advanced/i.test(v))
              colorClass = "bg-red-500/10 border-red-500/30 text-red-400";
            displayValue = diffMatch[0];
          }
          // Event-like values (contains CTF, DEF CON, hack, etc.)
          else if (/ctf|def.?con|hack|game|competition|tournament|qualifier/i.test(v)) {
            colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
            displayValue = String(value);
          }
          // Points-like values (number + "pts" suffix)
          else if (/(\d+)\s*pts?$/i.test(v)) {
            const match = v.match(/(\d+)\s*pts?$/i);
            colorClass = "bg-[#5e6ad2]/10 border-[#5e6ad2]/30 text-[#7170ff]";
            displayValue = match ? `${match[1]} pts` : String(value);
          }
          // Category-like values (pwn/web/crypto/etc)
          else if (/^(pwn|web|crypto|misc|forensic|reverse|pwnable|binary|webexploit)$/i.test(v)) {
            colorClass = "bg-orange-500/15 border-orange-500/25 text-orange-400";
            displayValue = v.charAt(0).toUpperCase() + v.slice(1);
          }
          // Status-like values (solved/pending/wip)
          else if (/^(solved|pending|wip|in.?progress|completed|todo)$/i.test(v)) {
            colorClass = v.includes("solved") || v.includes("completed")
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : v.includes("wip") || v.includes("progress")
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-red-500/10 border-red-500/30 text-red-400";
            displayValue = v.charAt(0).toUpperCase() + v.slice(1);
          }
          else {
            displayValue = String(value);
          }
        }

        return (
          <span
            key={key}
            className={`px-2 py-0.5 border rounded text-xs ${colorClass}`}
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
  docPaths,
}: {
  section: string;
  slug: string;
  docPaths: string[];
}) {
  const prefix = `${section}/${slug}/`;
  const folderDocs = docPaths
    .filter((p) => p.startsWith(prefix))
    .map((p) => p.slice(prefix.length).replace(/\.md$/, ""))
    .sort();

  // Group into immediate children: folders vs leaf docs
  const immediateFolders = new Set<string>();
  const immediateDocs: { name: string; slug: string }[] = [];

  for (const relPath of folderDocs) {
    const parts = relPath.split("/");
    if (parts.length === 1) {
      // Leaf doc directly in this folder
      immediateDocs.push({ name: parts[0], slug: `${section}/${slug}/${parts[0]}`.replace(/\/+/g, "/") });
    } else {
      // Deeper — register the immediate folder
      immediateFolders.add(parts[0]);
    }
  }

  const folders = [...immediateFolders].sort();

  return (
    <div>
      <nav className="flex items-center gap-2 text-xs text-[#62666d] mb-6">
        <Link href="/" className="hover:text-[#d0d6e0] transition-colors">
          MCPedia
        </Link>
        <span>/</span>
        {slug.split("/").map((part, i) => {
          const path = `${section}/${slug.split("/").slice(0, i + 1).join("/")}`;
          const isLast = i === slug.split("/").length - 1;
          return (
            <>
              <Link
                key={path}
                href={`/${path}`}
                className={isLast ? "text-[#8a8f98]" : "hover:text-[#d0d6e0] transition-colors"}
              >
                {part}
              </Link>
              {!isLast && <span>/</span>}
            </>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">📁</span>
        <h1 className="text-3xl font-medium text-[#f7f8f8]">{slug.split("/").pop()}</h1>
      </div>

      {(folders.length > 0 || immediateDocs.length > 0) ? (
        <div>
          {folders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
                Subfolders
              </h2>
              <div className="space-y-2">
                {folders.map((folder) => (
                  <Link
                    key={folder}
                    href={`/${section}/${slug}/${folder}`.replace(/\/+/g, "/")}
                    className="flex items-center gap-2 text-sm text-[#d0d6e0] hover:text-[#7170ff] transition-colors"
                  >
                    <span>📁</span> {folder}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {immediateDocs.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
                Documents
              </h2>
              <div className="space-y-2">
                {immediateDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/${doc.slug}`}
                    className="flex items-center gap-2 text-sm text-[#d0d6e0] hover:text-[#7170ff] transition-colors line-clamp-1"
                  >
                    <span>📄</span> {doc.name}
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
    return <FolderIndexPage section={section} slug={slug.join("/")} docPaths={docPaths} />;
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
    // Load existing folders for the folder picker in edit mode
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

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#62666d] mb-6">
        <Link
          href="/"
          className="hover:text-[#d0d6e0] transition-colors"
        >
          MCPedia
        </Link>
        <span>/</span>
        <Link
          href="/docs"
          className="hover:text-[#d0d6e0] transition-colors"
        >
          Docs
        </Link>
        <span>/</span>
        <span className="text-[#8a8f98]">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">
            {SECTION_ICON[doc.section] || "📄"}
          </span>
          <span className="text-xs font-medium text-[#7170ff] uppercase">
            {SECTION_LABEL[doc.section] || doc.section}
          </span>
        </div>
        <h1 className="text-4xl font-medium text-[#f7f8f8] mb-4 leading-tight">
          {doc.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#62666d] mb-3">
          <span className="text-[#d0d6e0]">{doc.author || "unknown"}</span>
          <span>·</span>
          <time dateTime={doc.updatedAt}>
            Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          {doc.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-[#191a1b] border border-[#23252a] rounded text-[#d0d6e0]"
            >
              #{t}
            </span>
          ))}
        </div>

        {/* Dynamic custom field badges — content creator controls what shows */}
        <CustomFieldBadges doc={{ ...doc }} standardKeys={STANDARD_KEYS} />
      </div>

      {/* Content + TOC */}
      <div className="mb-8">
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
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.slug}`}
                className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">
                    {SECTION_ICON[r.section] || "📄"}
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
            ))}
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
