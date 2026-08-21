"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Doc {
  slug: string;
  title: string;
  section: string;
  tags: string[];
}

const SECTIONS = [
  { id: "docs", label: "Documentation", icon: "📄" },
  { id: "writeups", label: "Writeups", icon: "📝" },
  { id: "research", label: "Research", icon: "🔬" },
  { id: "notes", label: "Notes", icon: "📌" },
] as const;

/**
 * Build a hierarchical folder tree from a flat list of documents.
 * Each doc's slug is like "section/sub/sub2/leaf-name".
 * The tree groups by path segments so the sidebar shows nested folders
 * with proper indentation (like GitHub's file tree).
 */
interface TreeNode {
  name: string;
  slug: string;
  title: string;
  children: TreeNode[];
}

function buildFolderTree(docs: Doc[]): Record<string, TreeNode> {
  // Returns a map from section id → tree root for that section.
  const result: Record<string, TreeNode> = {};

  for (const section of SECTIONS) {
    const sectionDocs = docs.filter((d) => d.section === section.id);
    const root: TreeNode = {
      name: section.id,
      slug: section.id,
      title: section.label,
      children: [],
    };
    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set(section.id, root);

    for (const doc of sectionDocs) {
      // slug is like "docs/websocket/contract" → parts after section
      const parts = doc.slug.split("/");
      // parts[0] should be the section
      let current = root;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const path = parts.slice(0, i + 1).join("/");
        const isLeaf = i === parts.length - 1;

        let child = current.children.find((n) => n.name === part);
        if (!child) {
          child = {
            name: part,
            slug: path,
            title: isLeaf ? doc.title : part,
            children: [],
          };
          current.children.push(child);
          nodeMap.set(path, child);
        } else if (isLeaf) {
          child.title = doc.title;
        }
        current = child;
      }
    }

    root.children.sort((a, b) => {
      // Folders first, then docs
      const aFolder = a.children.length > 0 ? 0 : 1;
      const bFolder = b.children.length > 0 ? 0 : 1;
      if (aFolder !== bFolder) return aFolder - bFolder;
      return a.name.localeCompare(b.name);
    });

    result[section.id] = root;
  }

  return result;
}

/**
 * Recursively render the folder tree with indentation.
 * depth = 0 is the top-level items under a section.
 */
function renderTreeNode(node: TreeNode, depth: number, pathname: string) {
  const isFolder = node.children.length > 0;
  const isActive = pathname === `/${node.slug}`;
  const hasActiveChild = pathname.startsWith(`/${node.slug}/`);

  const indent = depth * 12; // 12px per level

  return (
    <li key={node.slug}>
      <Link
        href={`/${node.slug}`}
        className={`flex items-center gap-1.5 text-xs py-0.5 rounded transition-all ${
          isActive
            ? "text-[#7170ff] bg-[#191a1b]"
            : hasActiveChild
              ? "text-[#d0d6e0]"
              : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#191a1b]"
        }`}
        style={{ marginLeft: `${indent}px` }}
        title={node.title}
      >
        <span>{isFolder ? "📁" : "📄"}</span>
        {node.title || node.name}
      </Link>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => renderTreeNode(child, 0, pathname))}
        </ul>
      )}
    </li>
  );
}

/** Client-side sidebar (fetches doc list via /api/docs at runtime).
 *  Client component so `next build` SSG doesn't hit Postgres (CI has no DB). */
export default function Sidebar() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
        else if (data?.docs) setDocs(data.docs);
      })
      .catch(() => setDocs([]));
  }, []);

  const tree = buildFolderTree(docs);

  // Flatten all docs count for display
  const totalDocs = docs.length;

  return (
    <nav className="h-full overflow-y-auto py-6">
      <div className="mb-4 px-3">
        <span className="text-xs text-[#62666d] uppercase">
          {totalDocs} documents · {SECTIONS.length} sections
        </span>
      </div>
      <ul className="space-y-0.5 px-3">
        {SECTIONS.map(({ id, label, icon }) => {
          const treeRoot = tree[id];
          const sectionDocs = docs.filter((d) => d.section === id);
          if (sectionDocs.length === 0) return null;

          const isActive = pathname.startsWith(`/${id}`);
          return (
            <li key={id}>
              <div
                className={`text-xs font-medium mb-1 flex items-center gap-1.5 ${
                  isActive ? "text-[#7170ff]" : "text-[#62666d]"
                }`}
              >
                <span>{icon}</span>
                {label}
              </div>
              <ul className="space-y-0.5">
                {treeRoot && treeRoot.children.length > 0
                  ? treeRoot.children.map((node) =>
                      renderTreeNode(node, 0, pathname),
                    )
                  : sectionDocs.map((doc) => {
                      const parts = doc.slug.split("/").slice(1);
                      const label = parts[parts.length - 1]
                        .split(/[-_]/)
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ");
                      const isDocActive = pathname === `/${doc.slug}`;
                      return (
                        <li key={doc.slug}>
                          <Link
                            href={`/${doc.slug}`}
                            className={`flex items-center gap-1.5 text-xs py-0.5 rounded transition-all ${
                              isDocActive
                                ? "text-[#7170ff] bg-[#191a1b]"
                                : "text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[#191a1b]"
                            }`}
                            title={doc.title}
                          >
                            <span>📄</span>
                            {label}
                          </Link>
                        </li>
                      );
                    })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
