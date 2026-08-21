import Link from "next/link";
import { listDocuments, type DocumentMeta } from "@mcpedia/core";
import type { DocSection } from "@mcpedia/core";

export const dynamic = "force-dynamic";

const SECTIONS: { id: DocSection; label: string; icon: string; desc: string }[] = [
  {
    id: "docs",
    label: "Documentation",
    icon: "📄",
    desc: "Setup guides, API references, and protocol specs.",
  },
  { id: "writeups", label: "Writeups", icon: "📝", desc: "Post-mortems, debugging stories, and case studies." },
  { id: "research", label: "Research", icon: "🔬", desc: "Deep-dive analysis, architecture notes, and experiments." },
  { id: "notes", label: "Notes", icon: "📌", desc: "Quick references, patterns, and gotchas." },
];

/**
 * Group documents into a folder tree. Returns nodes where each node is either:
 *  - a folder (has `children`) or
 *  - a leaf doc (has `doc`)
 * The tree is built from the path segments of each document's `path`.
 */
interface TreeNode {
  name: string;
  slug: string;
  doc?: DocumentMeta;
  children?: TreeNode[];
}

function buildFolderTree(docs: DocumentMeta[], section: string): TreeNode[] {
  const root: TreeNode[] = [];
  const rootMap = new Map<string, TreeNode>();

  for (const doc of docs.filter((d) => d.section === section)) {
    // path is like "docs/websocket/contract.md" → strip section prefix + .md
    const rel = doc.path.startsWith(`${section}/`)
      ? doc.path.slice(section.length + 1)
      : doc.path;
    const cleanPath = rel.replace(/\.md$/, "");
    const parts = cleanPath.split("/");

    let currentLevel = root;
    let currentPath = section;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = `${currentPath}/${part}`;
      const isLeaf = i === parts.length - 1;

      let node = currentLevel.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part === "" ? section : part,
          slug: currentPath,
          children: isLeaf ? undefined : [],
        };
        currentLevel.push(node);
      }

      if (isLeaf) {
        node.doc = doc;
      } else {
        if (!node.children) node.children = [];
        currentLevel = node.children;
      }
    }
  }

  return root;
}

function renderTree(nodes: TreeNode[], section: DocSection) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const isFolder = !!node.children;
        const isDoc = !!node.doc;
        return (
          <li key={node.slug}>
            {isFolder ? (
              <Link
                href={`/${node.slug}`}
                className="flex items-center gap-1.5 text-xs py-0.5 rounded hover:bg-[#191a1b] text-[#d0d6e0] hover:text-[#f7f8f8]"
              >
                <span>📁</span>
                {node.name}
              </Link>
            ) : isDoc ? (
              <Link
                href={`/${node.slug}`}
                className="flex items-center gap-1.5 text-xs py-0.5 rounded hover:bg-[#191a1b] text-[#d0d6e0] hover:text-[#f7f8f8] line-clamp-1"
              >
                <span>📄</span>
                {node.doc?.title || node.name}
              </Link>
            ) : null}
            {node.children && node.children.length > 0 && (
              <div className="ml-3 mt-0.5">
                {renderTree(node.children, section)}
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

  if (!SECTIONS.some((s) => s.id === section)) {
    return (
      <div>
        <h1 className="text-2xl font-medium text-[#f7f8f8]">Unknown section</h1>
      </div>
    );
  }

  const all = await listDocuments();
  const sectionDocs = all.filter((d) => d.section === section);
  const tree = buildFolderTree(all, section as DocSection);
  const sectionInfo = SECTIONS.find((s) => s.id === section)!;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">{sectionInfo.icon}</span>
        <h1 className="text-3xl font-medium text-[#f7f8f8]">{sectionInfo.label}</h1>
      </div>
      <p className="text-sm text-[#8a8f98] mb-6 max-w-2xl">
        {sectionInfo.desc}
      </p>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
          Folder structure
        </h2>
        {tree.length > 0 ? (
          renderTree(tree, section as DocSection)
        ) : (
          <p className="text-xs text-[#62666d]">No documents found.</p>
        )}
      </div>

      {sectionDocs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#d0d6e0] uppercase mb-3">
            All documents ({sectionDocs.length})
          </h2>
          <div className="space-y-2">
            {sectionDocs
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              )
              .map((d) => (
                <Link
                  key={d.slug}
                  href={`/${d.slug}`}
                  className="block text-sm text-[#d0d6e0] hover:text-[#7170ff] transition-colors line-clamp-1"
                  title={d.title}
                >
                  {d.title}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
