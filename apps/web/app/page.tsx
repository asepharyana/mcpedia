import Link from "next/link";
import { listDocuments, listSections } from "@mcpedia/core";
import { getSectionMeta, type SectionConfig } from "@mcpedia/config";
import McpConfigSnippet from "@/components/McpConfigSnippet";
import InteractiveTopology from "@/components/InteractiveTopology";
import {
  Sparkles,
  Search,
  Plus,
  BookOpen,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Activity,
  Folder,
  FileText,
  Clock,
  CheckCircle2,
  Terminal,
} from "lucide-react";

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

function renderTree(nodes: TreeNode[]) {
  return (
    <ul className="space-y-1">
      {nodes.slice(0, 5).map((node) => (
        <li key={node.slug}>
          <Link
            href={`/${node.slug}`}
            className="flex items-center gap-2 text-xs py-1 px-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors group"
            title={node.title}
          >
            <span className="shrink-0 text-[var(--text-dim)] group-hover:text-[var(--brand)] transition-colors">
              {node.isLeaf && node.children.length === 0 ? (
                <FileText className="w-3 h-3" />
              ) : (
                <Folder className="w-3 h-3" />
              )}
            </span>
            <span className="truncate">{node.title || node.name}</span>
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3 border-l border-[var(--border-color)] pl-2 mt-0.5">
              {renderTree(node.children)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function SectionTree({ section, docs }: { section: string; docs: { slug: string; title: string }[] }) {
  const tree = buildFolderTree(
    docs.filter((d) => d.slug.startsWith(`${section}/`)),
    section,
  );

  return (
    <div>
      {tree.length > 0 ? (
        renderTree(tree)
      ) : (
        <p className="text-xs text-[var(--text-dim)] pl-2">No documents yet</p>
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
      <section className="relative pt-2 pb-4">
        {/* Floating status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/25 text-[var(--brand)] dark:text-[var(--accent)] text-xs font-semibold mb-6 shadow-xs animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Model Context Protocol · PostgreSQL Source of Truth</span>
        </div>

        {/* Primary Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] tracking-tight mb-5 leading-[1.12]">
          Knowledge Base for <br />
          <span className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 dark:to-cyan-400 bg-clip-text text-transparent">
            Humans and AI Agents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed mb-8">
          A high-performance technical knowledge repository. Browse structured notes and CTF writeups in your browser, or equip AI coding assistants directly via native MCP tools.
        </p>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-[var(--brand)]/25 hover:shadow-[var(--brand)]/40 hover:-translate-y-0.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Documentation</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Link>

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl font-semibold text-sm transition-all shadow-xs hover:-translate-y-0.5"
          >
            <Search className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
            <span>Hybrid Search Console</span>
          </Link>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Document</span>
          </Link>
        </div>

        {/* Live Telemetry Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{all.length}</div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">Documents in DB</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{sections.length}</div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">Active Sections</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[var(--brand)] dark:text-[var(--accent)]">RRF Hybrid</div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">FTS + Cosine Vectors</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">13 Tools</div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">Streamable HTTP :4021</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive System Architecture & Topology */}
      <section>
        <InteractiveTopology />
      </section>

      {/* Browse Knowledge by Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
              Browse Knowledge by Section
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((s) => {
            const sectionDocs = all.filter((d) => (d.section || "docs").toLowerCase() === s.id);
            return (
              <div
                key={s.id}
                className="group flex flex-col justify-between bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <Link
                      href={`/${s.id}`}
                      className="text-xs font-mono text-[var(--brand)] dark:text-[var(--accent)] hover:underline font-semibold"
                    >
                      {sectionDocs.length} docs →
                    </Link>
                  </div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors mb-1.5">
                    {s.label}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Inline folder directory preview */}
                <div className="pt-3 border-t border-[var(--border-color)]">
                  <SectionTree
                    section={s.id}
                    docs={all.map((d) => ({ slug: d.slug, title: d.title }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recently Updated Knowledge */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--brand)] dark:text-[var(--accent)]" />
              <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Recently Updated Knowledge
              </h2>
            </div>
            <Link
              href="/docs"
              className="text-xs text-[var(--brand)] dark:text-[var(--accent)] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View all ({all.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => {
              const sInfo = getSectionMeta(d.section);
              return (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group block bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-2xl p-5 transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-mono font-semibold text-[var(--brand)] dark:text-[var(--accent)] uppercase flex items-center gap-1">
                      <span>{sInfo?.icon}</span>
                      <span>{d.section}</span>
                    </span>
                    <time className="text-[11px] text-[var(--text-dim)] font-mono">
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--brand)] dark:group-hover:text-[var(--accent)] transition-colors line-clamp-1 mb-2">
                    {d.title}
                  </h3>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-md text-[var(--text-muted)] font-mono"
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

      {/* Connect AI Assistant Showcase */}
      <section className="border-t border-[var(--border-color)] pt-12 pb-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Connect Coding Assistants</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">
            Model Context Protocol Configuration
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl leading-relaxed">
            Equip Claude Desktop, Cursor, Antigravity, or custom agents with direct access to your knowledge base via semantic search, read resources, and document tools.
          </p>
        </div>

        <McpConfigSnippet />
      </section>
    </div>
  );
}
