import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { getSectionMeta } from "@mcpedia/config";
import {
  Folder,
  FileText,
  ChevronRight,
  FileDown,
  Plus,
  Compass,
  ArrowLeft,
  Clock,
  Tag,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DocMeta {
  slug: string;
  title: string;
  section: string;
  tags: string[];
  updatedAt: string;
  path: string;
}

interface TreeNode {
  name: string;
  slug: string;
  doc?: DocMeta;
  children: TreeNode[];
  docCount: number;
}

function buildFolderTree(docs: DocMeta[], section: string): TreeNode[] {
  const root: TreeNode[] = [];

  for (const doc of docs.filter((d) => (d.section || "").toLowerCase() === section.toLowerCase())) {
    const rel = doc.slug.startsWith(`${section}/`)
      ? doc.slug.slice(section.length + 1)
      : doc.slug;
    const parts = rel.split("/");

    let current = root;
    let currentPath = section;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      currentPath = `${currentPath}/${part}`;

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          slug: currentPath,
          children: [],
          docCount: 0,
        };
        current.push(node);
      }

      if (isLeaf) {
        node.doc = doc;
        node.docCount = 1;
      }
      current = node.children;
    }
  }

  function countDocs(node: TreeNode): number {
    if (node.doc) return 1;
    return node.children.reduce((sum, child) => sum + countDocs(child), 0);
  }

  for (const node of root) {
    node.docCount = countDocs(node);
  }

  return root;
}

function renderTree(nodes: TreeNode[], pathname: string) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => {
        const isFolder = node.children.length > 0;
        const isActive = pathname === `/${node.slug}`;
        const hasActiveChild = pathname.startsWith(`/${node.slug}/`);

        return (
          <li key={node.slug}>
            <Link
              href={`/${node.slug}`}
              className={`flex items-center justify-between gap-2 text-xs py-2 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-[var(--brand)] dark:text-[var(--accent)] bg-[var(--brand)]/15 font-semibold border border-[var(--brand)]/30 shadow-xs"
                  : hasActiveChild
                    ? "text-[var(--text-primary)] bg-[var(--bg-elevated)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <span className="text-[var(--text-dim)]">
                  {isFolder ? <Folder className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" /> : <FileText className="w-4 h-4" />}
                </span>
                <span className="truncate font-medium">{node.doc?.title || node.name}</span>
              </span>
              {isFolder && (
                <span className="text-[10px] text-[var(--text-dim)] bg-[var(--bg-surface)] border border-[var(--border-color)] px-2 py-0.5 rounded-md font-mono">
                  {node.docCount} docs
                </span>
              )}
            </Link>
            {node.children.length > 0 && (
              <div className="ml-4 border-l border-[var(--border-color)] pl-3 mt-1 space-y-1">
                {renderTree(node.children, pathname)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function SectionIndexPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const sectionInfo = getSectionMeta(section);

  const allDocs = await listDocuments();
  const sectionDocs = allDocs.filter((d) => (d.section || "").toLowerCase() === section.toLowerCase());
  const tree = buildFolderTree(allDocs, section);

  return (
    <div className="space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
          <span>MCPedia</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--text-muted)] font-semibold">{sectionInfo.label}</span>
      </nav>

      {/* Hero Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-3xl shadow-inner">
              {sectionInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {sectionInfo.label}
                </h1>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider mt-1">
                Section Domain: <span className="text-[var(--brand)] dark:text-[var(--accent)] font-semibold">{section}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-mono text-[var(--brand)] dark:text-[var(--accent)] bg-[var(--brand)]/10 border border-[var(--brand)]/25 px-3 py-1.5 rounded-lg font-semibold">
              {sectionDocs.length} document{sectionDocs.length !== 1 ? "s" : ""}
            </span>

            {sectionDocs.length > 0 && (
              <Link
                href={`/${section}/export`}
                className="inline-flex items-center gap-1.5 text-xs bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg font-semibold transition-all shadow-xs"
                title={`Export all ${sectionInfo.label} documents to publication-grade PDF`}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </Link>
            )}

            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-md shadow-[var(--brand)]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Doc</span>
            </Link>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl mt-3">
          {sectionInfo.desc}
        </p>
      </div>

      {/* Hierarchical Folder Directory */}
      {tree.length > 0 && (
        <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
            <Folder className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
              Folder & Chapter Directory
            </h2>
          </div>
          {renderTree(tree, section)}
        </section>
      )}

      {/* Document List */}
      {sectionDocs.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
              All Knowledge in {sectionInfo.label}
            </h2>
          </div>

          <div className="space-y-2.5">
            {[...sectionDocs]
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              )
              .map((d) => (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group flex items-center justify-between gap-4 p-4 sm:p-5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-dim)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors truncate">
                        {d.title}
                      </h3>
                      {d.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {d.tags.slice(0, 4).map((t) => (
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

                  <time className="text-xs text-[var(--text-dim)] font-mono shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </time>
                </Link>
              ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-16 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]">
          <p className="text-sm text-[var(--text-muted)]">No documents in this section yet.</p>
        </div>
      )}
    </div>
  );
}
