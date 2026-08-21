import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { SECTIONS } from "@mcpedia/config/sections";
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
      return a.title.localeCompare(b.title);
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
                ? "text-[#7170ff] bg-[#5e6ad2]/15 font-medium"
                : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#141517]"
            }`}
            title={node.title}
          >
            <span className="opacity-70">{node.isLeaf && node.children.length === 0 ? "📄" : "📁"}</span>
            <span className="truncate">{node.title || node.name}</span>
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3.5 border-l border-[#1f2022] pl-2 mt-0.5">
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
  const sectionInfo = SECTIONS.find((s) => s.id === section);
  if (!sectionInfo) return null;

  return (
    <div>
      {tree.length > 0 ? (
        renderTree(tree, pathname)
      ) : (
        <p className="text-xs text-[#62666d] pl-1">No documents</p>
      )}
    </div>
  );
}

export default async function HomePage() {
  const all = await listDocuments();

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5e6ad2]/10 border border-[#5e6ad2]/25 text-[#7170ff] text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
          <span>Model Context Protocol + Unified Knowledge Base</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#f7f8f8] tracking-tight mb-5 leading-tight">
          Knowledge Base for <br />
          <span className="bg-gradient-to-r from-[#7170ff] via-[#828fff] to-white bg-clip-text text-transparent">
            Humans and AI Agents
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#8a8f98] max-w-2xl leading-relaxed mb-8">
          A high-performance, content-first documentation system. Browse hierarchical notes and CTF writeups in your browser, or connect AI coding assistants directly via native MCP tools.
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141517] hover:bg-[#1b1d20] border border-[#23252a] hover:border-[#383b42] text-[#d0d6e0] hover:text-white rounded-lg font-medium text-sm transition-all"
          >
            <svg className="w-4 h-4 text-[#8a8f98]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Hybrid Search</span>
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#141517] hover:bg-[#1b1d20] border border-[#23252a] text-[#8a8f98] hover:text-[#d0d6e0] rounded-lg text-sm transition-colors"
          >
            <span>+ Create Document</span>
          </Link>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0c0d0e] border border-[#1f2022] rounded-xl max-w-3xl">
          <div>
            <div className="text-xl font-semibold text-[#f7f8f8]">{all.length}</div>
            <div className="text-xs text-[#62666d]">Documents indexed</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-[#f7f8f8]">{SECTIONS.length}</div>
            <div className="text-xs text-[#62666d]">Core sections</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-[#7170ff]">RRF Hybrid</div>
            <div className="text-xs text-[#62666d]">FTS + 2048-dim vectors</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-emerald-400">10 MCP Tools</div>
            <div className="text-xs text-[#62666d]">Streamable HTTP :4021</div>
          </div>
        </div>
      </section>

      {/* Browse by Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
            Browse by Section
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS.map((s) => {
            const sectionDocs = all.filter((d) => d.section === s.id);
            return (
              <div
                key={s.id}
                className="group flex flex-col justify-between bg-[#0f1011] hover:bg-[#131415] border border-[#1f2022] hover:border-[#5e6ad2]/40 rounded-xl p-5 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <Link
                      href={`/${s.id}`}
                      className="text-xs font-mono text-[#7170ff] hover:underline"
                    >
                      {sectionDocs.length} docs →
                    </Link>
                  </div>
                  <h3 className="font-semibold text-base text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors mb-1.5">
                    {s.label}
                  </h3>
                  <p className="text-xs text-[#8a8f98] mb-4 line-clamp-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Inline folder tree */}
                <div className="pt-3 border-t border-[#1a1b1d]">
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
            <h2 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
              Recently Updated Knowledge
            </h2>
            <Link
              href="/docs"
              className="text-xs text-[#7170ff] hover:underline"
            >
              View all ({all.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => {
              const sInfo = SECTIONS.find((s) => s.id === d.section);
              return (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group block bg-[#0f1011] hover:bg-[#131415] border border-[#1f2022] hover:border-[#5e6ad2]/40 rounded-xl p-4 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-[#7170ff] uppercase">
                      {sInfo?.icon} {d.section}
                    </span>
                    <time className="text-[11px] text-[#62666d] font-mono">
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-medium text-sm text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1 mb-2">
                    {d.title}
                  </h3>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.25 bg-[#141517] border border-[#23252a] rounded text-[#8a8f98]"
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
      <section className="border-t border-[#1f2022] pt-12 pb-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#141517] border border-[#23252a] text-[#8a8f98] text-xs font-mono mb-2">
            <span>⚡ Native Model Context Protocol (MCP)</span>
          </div>
          <h2 className="text-2xl font-bold text-[#f7f8f8] tracking-tight mb-2">
            Connect AI Coding Assistants
          </h2>
          <p className="text-sm text-[#8a8f98] max-w-xl">
            Give Claude Desktop, Cursor, Antigravity, or Zed direct access to your knowledge base via semantic search, read resources, and document tools.
          </p>
        </div>

        <McpConfigSnippet />
      </section>
    </div>
  );
}
