import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { SECTIONS } from "@mcpedia/config/sections";

export const dynamic = "force-dynamic";

/**
 * Build a hierarchical folder tree from a flat list of document paths.
 * Each tree node is either a folder (has children) or a leaf doc.
 */
interface TreeNode {
  name: string;
  slug: string;
  title: string;
  children: TreeNode[];
  isLeaf: boolean;
}

function buildFolderTree(paths: string[], section: string): TreeNode[] {
  const tree: TreeNode[] = [];
  const base = `${section}/`;

  const addPath = (cleanPath: string) => {
    const parts = cleanPath.split("/");
    let current = tree;
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
          title: "",
          children: [],
          isLeaf: false,
        };
        current.push(node);
      }

      if (isLeaf) {
        node.isLeaf = true;
        node.title = part
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      } else if (!node.title) {
        node.title = part
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      current = node.children;
    }
  };

  for (const docPath of paths) {
    const rel = docPath.startsWith(base) ? docPath.slice(base.length) : docPath;
    const cleanPath = rel.replace(/\.md$/, "");
    addPath(cleanPath);
  }

  return tree;
}

function renderTree(nodes: TreeNode[], pathname: string) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.slug}>
          <Link
            href={`/${node.slug}`}
            className={`flex items-center gap-1.5 text-xs py-0.5 rounded transition-all ${
              pathname === `/${node.slug}`
                ? "text-[#7170ff] bg-[#191a1b]"
                : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#191a1b]"
            }`}
            title={node.title}
          >
            <span>{node.isLeaf && node.children.length === 0 ? "📄" : "📁"}</span>
            {node.title || node.name}
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3 mt-0.5">
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
  docPaths: string[];
  pathname: string;
}

function SectionTree({ section, docPaths, pathname }: SectionTreeProps) {
  const tree = buildFolderTree(docPaths.filter((p) => p.startsWith(`${section}/`)), section);
  const sectionInfo = SECTIONS.find((s) => s.id === section);
  if (!sectionInfo) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xl">{sectionInfo.icon}</span>
        <h3 className="font-medium text-[#f7f8f8]">{sectionInfo.label}</h3>
      </div>
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
  const docPaths = all.map((d) => d.path);

  const recent = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="mb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-medium text-[#f7f8f8] mb-4 leading-tight">
            MCPedia
          </h1>
          <p className="text-xl text-[#8a8f98] mb-8 leading-relaxed max-w-2xl">
            A content-first knowledge base for humans and AI agents. Browse the
            hierarchical folder structure below, search all documents, or connect
            via the MCP server.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5e6ad2] text-white rounded-lg font-medium hover:bg-[#6a75e0] transition-colors"
            >
              Browse Documents
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#191a1b] border border-[#222] text-[#d0d6e0] rounded-lg font-medium hover:border-[#5e6ad2]/40 hover:text-[#f7f8f8] transition-colors"
            >
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Hierarchical Folder Tree */}
      <section className="mb-16">
        <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-6">
          Browse by section
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS.map((s) => {
            const sectionDocs = all.filter((d) => d.section === s.id);
            return (
              <div
                key={s.id}
                className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-5 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <Link
                    href={`/${s.id}`}
                    className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
                  >
                    View all ({sectionDocs.length})
                  </Link>
                </div>
                <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors mb-3">
                  {s.label}
                </h3>
                <p className="text-xs text-[#8a8f98] mb-3 line-clamp-2">
                  {s.desc}
                </p>
                {/* Inline folder tree */}
                <SectionTree
                  section={s.id}
                  docPaths={docPaths}
                  pathname="/"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Documents */}
      {recent.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-sm font-medium text-[#d0d6e0] uppercase">
              Recently updated
            </h2>
            <Link
              href="/docs"
              className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((d) => {
              const sInfo = SECTIONS.find((s) => s.id === d.section);
              return (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group block bg-[#0f1011] border border-[#1f2022] rounded-lg p-4 hover:border-[#5e6ad2]/40 hover:bg-[#131415] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xl">
                      {sInfo?.icon || "📄"}
                    </span>
                    <time className="text-xs text-[#62666d]">
                      {new Date(d.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors line-clamp-1">
                    {d.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.tags.slice(0, 3).map((t) => (
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
        </section>
      )}

      {/* MCP info */}
      <section className="border-t border-[#1f2022] pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-medium text-[#f7f8f8] mb-1">AI agents</h3>
            <p className="text-sm text-[#8a8f98]">
              MCP server at{" "}
              <code className="text-[#d0d6e0] bg-[#191a1b] px-1.5 py-0.5 rounded">
                mcp.asepharyana.my.id/mcp
              </code>
              . All tools available via Streamable HTTP transport.
            </p>
          </div>
          <Link
            href="https://github.com/modelcontextprotocol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#62666d] hover:text-[#7170ff] transition-colors"
          >
            MCP spec →
          </Link>
        </div>
      </section>
    </>
  );
}
