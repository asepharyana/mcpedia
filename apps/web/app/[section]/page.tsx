import Link from "next/link";
import { listDocuments } from "@mcpedia/core";
import { SECTIONS } from "@mcpedia/config/sections";

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

  for (const doc of docs.filter((d) => d.section === section)) {
    const rel = doc.path.startsWith(`${section}/`)
      ? doc.path.slice(section.length + 1)
      : doc.path;
    const cleanPath = rel.replace(/\.md$/, "");
    const parts = cleanPath.split("/");

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
              className={`flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg transition-all ${
                isActive
                  ? "text-[#7170ff] bg-[#5e6ad2]/15 font-medium border border-[#5e6ad2]/30"
                  : hasActiveChild
                    ? "text-[#d0d6e0] bg-[#141517]"
                    : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#141517]"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span>{isFolder ? "📁" : "📄"}</span>
                <span className="truncate">{node.doc?.title || node.name}</span>
              </span>
              {isFolder && (
                <span className="text-[10px] text-[#62666d] bg-[#191a1b] px-1.5 py-0.5 rounded font-mono">
                  {node.docCount} docs
                </span>
              )}
            </Link>
            {node.children.length > 0 && (
              <div className="ml-4 border-l border-[#1f2022] pl-2 mt-1">
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

  const sectionInfo = SECTIONS.find((s) => s.id === section);
  if (!sectionInfo) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-semibold text-[#f7f8f8]">Unknown section</h1>
        <p className="text-sm text-[#8a8f98] mt-2">Section &quot;{section}&quot; does not exist.</p>
      </div>
    );
  }

  const allDocs = await listDocuments();
  const sectionDocs = allDocs.filter((d) => d.section === section);
  const tree = buildFolderTree(allDocs, section);

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#62666d]">
        <Link href="/" className="hover:text-[#d0d6e0] transition-colors">
          MCPedia
        </Link>
        <span>/</span>
        <span className="text-[#8a8f98] font-medium">{sectionInfo.label}</span>
      </nav>

      {/* Hero Card */}
      <div className="bg-[#0f1011] border border-[#1f2022] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#141517] border border-[#23252a] flex items-center justify-center text-2xl shadow-inner">
              {sectionInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f8f8] tracking-tight">
                {sectionInfo.label}
              </h1>
              <p className="text-xs text-[#8a8f98] mt-0.5 font-mono uppercase">
                Section: {section}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#7170ff] bg-[#5e6ad2]/10 border border-[#5e6ad2]/25 px-2.5 py-1 rounded-md">
              {sectionDocs.length} document{sectionDocs.length !== 1 ? "s" : ""}
            </span>
            <Link
              href="/create"
              className="inline-flex items-center gap-1 text-xs bg-[#5e6ad2] hover:bg-[#6a75e0] text-white px-3 py-1 rounded-md font-medium transition-all"
            >
              <span>+ Create</span>
            </Link>
          </div>
        </div>

        <p className="text-sm text-[#8a8f98] leading-relaxed max-w-2xl mt-2">
          {sectionInfo.desc}
        </p>
      </div>

      {/* Hierarchical Folder Directory */}
      {tree.length > 0 && (
        <section className="bg-[#0c0d0e] border border-[#1f2022] rounded-xl p-6">
          <h2 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>Folder Structure</span>
          </h2>
          {renderTree(tree, section)}
        </section>
      )}

      {/* Document List */}
      {sectionDocs.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-4">
            All Documents in {sectionInfo.label}
          </h2>
          <div className="space-y-2">
            {[...sectionDocs]
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              )
              .map((d) => (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="group flex items-center justify-between gap-4 p-4 bg-[#0f1011] hover:bg-[#141517] border border-[#1f2022] hover:border-[#5e6ad2]/40 rounded-xl transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg opacity-70 group-hover:opacity-100">📄</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[#f7f8f8] group-hover:text-[#7170ff] transition-colors truncate">
                        {d.title}
                      </h3>
                      {d.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {d.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.25 bg-[#141517] border border-[#23252a] rounded text-[#8a8f98]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <time className="text-xs text-[#62666d] font-mono shrink-0">
                    {new Date(d.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </Link>
              ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 border border-[#1f2022] rounded-xl bg-[#0f1011]">
          <p className="text-sm text-[#8a8f98]">No documents in this section yet.</p>
        </div>
      )}
    </div>
  );
}
