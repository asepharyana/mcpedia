import Link from "next/link";
import { listDocuments, listSections } from "@mcpedia/core";
import { getSectionMeta, type SectionConfig } from "@mcpedia/config";
import McpConfigSnippet from "@/components/McpConfigSnippet";

export const dynamic = "force-dynamic";

interface TreeNode {
  name: string;
  slug: string;
  title: string;
  children: TreeNode[];
  isLeaf: boolean;
}

function slugToTitle(segment: string): string {
  return segment
    .split(/[-_]/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function buildFolderTree(docs: { slug: string; title: string }[], section: string): TreeNode[] {
  const tree: TreeNode[] = [];
  const treeIndex = new Map<string, TreeNode>();

  for (const doc of docs) {
    const parts = doc.slug.split("/");
    let current = tree;
    let currentPath = section;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      currentPath = `${currentPath}/${part}`;

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          slug: currentPath,
          title: isLeaf ? doc.title : slugToTitle(part),
          children: [],
          isLeaf: false,
        };
        current.push(node);
        treeIndex.set(currentPath, node);
      }

      if (isLeaf) {
        node.isLeaf = true;
        node.title = doc.title;
      } else if (!node.title) {
        node.title = slugToTitle(part);
      }
      current = node.children;
    }
  }

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      const aFolder = a.children.length > 0 ? 0 : 1;
      const bFolder = b.children.length > 0 ? 0 : 1;
      if (aFolder !== bFolder) return aFolder - bFolder;
      return (a.title || a.name).localeCompare(b.title || b.name);
    });
  }

  function sortAll(nodes: TreeNode[]): TreeNode[] {
    const sorted = sortNodes(nodes);
    for (const node of sorted) {
      if (node.children.length > 0) sortAll(node.children);
    }
    return sorted;
  }

  return sortAll(tree);
}

function renderTree(nodes: TreeNode[], pathname: string) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <li key={node.slug}>
          <Link
            href={`/${node.slug}`}
            className={`flex items-center gap-1.5 text-xs py-1 px-1.5 rounded transition-all ${
              pathname === `/${node.slug}`
                ? "text-[#5e6ad2] dark:text-[#7170ff] bg-[#5e6ad2]/15 font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
            title={node.title}
          >
            <span className="opacity-80">{node.isLeaf && node.children.length === 0 ? "📄" : "📁"}</span>
            <span className="truncate">{node.title || node.name}</span>
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3.5 border-l border-[var(--border-color)] pl-2 mt-0.5">
              {renderTree(node.children, pathname)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

interface SectionTreeProps {
  section: string;
  docs: { slug: string; title: string }[];
  pathname: string;
}

function SectionTree({ section, docs, pathname }: SectionTreeProps) {
  const tree = buildFolderTree(
    docs.filter((d) => d.slug.startsWith(`${section}/`)),
    section,
  );

  return (
    <div>
      {tree.length > 0 ? (
        renderTree(tree, pathname)
      ) : (
        <p className="text-xs text-[var(--text-dim)] pl-1">No documents</p>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [all, sections] = await Promise.all([
    listDocuments(),
    listSections(),
  ]);

  const recent = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5e6ad2]/10 border border-[#5e6ad2]/25 text-[#5e6ad2] dark:text-[#7170ff] text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
          <span>Model Context Protocol + PostgreSQL Core</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] tracking-tight mb-5 leading-tight">
          Knowledge Base for <br />
          <span className="bg-gradient-to-r from-[#5e6ad2] via-[#7170ff] to-[#4338ca] dark:to-white bg-clip-text text-transparent">
            Humans and AI Agents
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed mb-8">
          A high-performance, database-backed documentation system. Browse hierarchical notes and technical writeups in your browser, or connect AI coding assistants directly via native MCP tools.
        </p>

        {/* Quick action buttons & stats */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5e6ad2] hover:bg-[#6a75e0] text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-[#5e6ad2]/20"
          >
            <span>Browse Documentation</span>
            <span>→</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Hybrid Search</span>
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors shadow-sm"
          >
            <span>+ Create Document</span>
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl max-w-3xl shadow-sm">
          <div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{all.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Documents in DB</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{sections.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Active sections</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#5e6ad2] dark:text-[#7170ff]">RRF Hybrid</div>
            <div className="text-xs text-[var(--text-muted)]">FTS + Cosine Vectors</div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">13 MCP Tools</div>
            <div className="text-xs text-[var(--text-muted)]">Streamable HTTP :4021</div>
          </div>
        </div>
      </section>

      {/* Browse by Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Browse by Section
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((s) => {
            const sectionDocs = all.filter((d) => (d.section || "docs").toLowerCase() === s.id);
            return (
              <div
                key={s.id}
                className="group flex flex-col justify-between bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-xl p-5 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <Link
                      href={`/${s.id}`}
                      className="text-xs font-mono text-[#5e6ad2] dark:text-[#7170ff] hover:underline"
                    >
                      {sectionDocs.length} docs →
                    </Link>
                  </div>
                  <h3 className="font-semibold text-base text-[var(--text-primary)] group-hover:text-[#5e6ad2] dark:group-hover:text-[#7170ff] transition-colors mb-1.5">
                    {s.label}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Inline folder tree */}
                <div className="pt-3 border-t border-[var(--border-color)]">
                  <SectionTree
                    section={s.id}
                    docs={all.map((d) => ({ slug: d.slug, title: d.title }))}
                    pathname="/"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Documents */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Recently Updated Knowledge
            </h2>
            <Link
              href="/docs"
              className="text-xs text-[#5e6ad2] dark:text-[#7170ff] hover:underline font-medium"
            >
              View all ({all.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => {
              const sInfo = getSectionMeta(d.section);
              return (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group block bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-xl p-4 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-[#5e6ad2] dark:text-[#7170ff] uppercase">
                      {sInfo?.icon} {d.section}
                    </span>
                    <time className="text-[11px] text-[var(--text-dim)] font-mono">
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-medium text-sm text-[var(--text-primary)] group-hover:text-[#5e6ad2] dark:group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-2">
                    {d.title}
                  </h3>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.25 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded text-[var(--text-muted)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* MCP Agent Integration Showcase */}
      <section className="border-t border-[var(--border-color)] pt-12 pb-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] text-xs font-mono mb-2">
            <span>⚡ Native Model Context Protocol (MCP)</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            Connect AI Coding Assistants
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">
            Give Claude Desktop, Cursor, Antigravity, or Zed direct access to your knowledge base via semantic search, read resources, and document tools.
          </p>
        </div>

        <McpConfigSnippet />
      </section>
    </div>
  );
}
