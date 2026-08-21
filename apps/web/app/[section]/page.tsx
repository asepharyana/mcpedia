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

/**
 * Build a hierarchical folder tree from a flat list of documents.
 * Each node is either a folder (has children) or a leaf doc.
 */
interface TreeNode {
  name: string;
  slug: string;
  doc?: DocMeta;
  children: TreeNode[];
  docCount: number; // total docs in subtree
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

  // Recursively compute docCount for folder nodes
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
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const isFolder = node.children.length > 0;
        const isActive = pathname === `/${node.slug}`;
        const hasActiveChild = pathname.startsWith(`/${node.slug}/`);

        return (
          <li key={node.slug}>
            <Link
              href={`/${node.slug}`}
              className={`flex items-center justify-between gap-2 text-xs py-1 px-2 rounded transition-all ${
                isActive
                  ? "text-[#7170ff] bg-[#191a1b]"
                  : hasActiveChild
                    ? "text-[#d0d6e0]"
                    : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#191a1b]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>{isFolder ? "📁" : "📄"}</span>
                {node.doc?.title || node.name}
              </span>
              {isFolder && (
                <span className="text-[#62666d] bg-[#191a1b] px-1.5 py-0.25 rounded">
                  {node.docCount}
                </span>
              )}
            </Link>
            {node.children.length > 0 && (
              <div className="ml-4 mt-0.5">
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
      <div>
        <h1 className="text-2xl font-medium text-[#f7f8f8]">Unknown section</h1>
      </div>
    );
  }

  const allDocs = await listDocuments();
  const sectionDocs = allDocs.filter((d) => d.section === section);
  const tree = buildFolderTree(allDocs, section);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">{sectionInfo.icon}</span>
        <h1 className="text-3xl font-medium text-[#f7f8f8]">{sectionInfo.label}</h1>
        <span className="text-xs text-[#62666d] bg-[#191a1b] px-2 py-0.5 rounded">
          {sectionDocs.length} document{sectionDocs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <p className="text-sm text-[#8a8f98] mb-8 max-w-2xl">
        {sectionInfo.desc}
      </p>

      {tree.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-xs font-medium text-[#8a8f98] uppercase mb-3 tracking-wider">
            Folder structure
          </h2>
          {renderTree(tree, section)}
        </div>
      ) : (
        <p className="text-sm text-[#62666d] mb-8">No documents found in this section.</p>
      )}

      {sectionDocs.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-[#8a8f98] uppercase mb-3 tracking-wider">
            Recently updated
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
                  className="group flex items-center justify-between gap-3 py-2 border-b border-[#141516] last:border-0"
                >
                  <span className="text-sm text-[#d0d6e0] group-hover:text-[#7170ff] transition-colors line-clamp-1">
                    {d.title}
                  </span>
                  <time className="text-xs text-[#62666d] flex-shrink-0">
                    {new Date(d.updatedAt).toLocaleDateString(undefined, {
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
  );
}
