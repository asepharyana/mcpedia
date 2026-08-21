"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@mcpedia/config/sections";

interface Doc {
  slug: string;
  title: string;
  section: string;
  tags: string[];
}

/**
 * Build a hierarchical folder tree from flat document slugs.
 * Each node is either a folder (has children) or a leaf doc.
 */
interface TreeNode {
  name: string;
  slug: string;
  title: string;
  children: TreeNode[];
  isLeaf: boolean;
  docCount: number; // total docs in subtree
}

function buildFolderTree(docs: Doc[], section: string): TreeNode[] {
  const root: TreeNode[] = [];

  for (const doc of docs.filter((d) => d.section === section)) {
    const parts = doc.slug.split("/");
    // parts[0] should be the section
    let current = root;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          slug: parts.slice(0, i + 1).join("/"),
          title: "",
          children: [],
          isLeaf: false,
          docCount: 0,
        };
        current.push(node);
      }

      if (isLeaf) {
        node.isLeaf = true;
        node.title = doc.title;
      } else if (!node.title) {
        node.title = part
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      current = node.children;
    }
  }

  // Recursively compute docCount
  function countDocs(node: TreeNode): number {
    if (node.isLeaf) return 1;
    return node.children.reduce((sum, child) => sum + countDocs(child), 0);
  }

  for (const node of root) {
    node.docCount = countDocs(node);
  }

  // Sort: folders first, then docs, alphabetically
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      const aFolder = a.children.length > 0 ? 0 : 1;
      const bFolder = b.children.length > 0 ? 0 : 1;
      if (aFolder !== bFolder) return aFolder - bFolder;
      return a.title.localeCompare(b.title);
    });
  }
  for (const node of root) {
    sortNodes(node.children);
  }

  return sortNodes(root);
}

/**
 * Recursively render the folder tree with proper depth styling.
 */
function renderTreeNode(
  node: TreeNode,
  depth: number,
  pathname: string,
): React.ReactElement {
  const isFolder = node.children.length > 0;
  const isActive = pathname === `/${node.slug}`;
  const hasActiveChild = pathname.startsWith(`/${node.slug}/`);
  const indent = depth * 16; // 16px per level

  return (
    <li key={node.slug}>
      <Link
        href={`/${node.slug}`}
        className={`flex items-center gap-1.5 text-xs py-1 px-2 rounded transition-all ${
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
        <span className="truncate">{node.title || node.name}</span>
        {isFolder && node.docCount > 0 && (
          <span className="ml-auto text-[#62666d] bg-[#191a1b] px-1 py-0 rounded">
            {node.docCount}
          </span>
        )}
      </Link>
      {node.children.length > 0 && (
        <ul className="mt-0.5">
          {node.children.map((child) => renderTreeNode(child, depth + 1, pathname))}
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

  return (
    <nav className="h-full overflow-y-auto py-6">
      <div className="mb-4 px-3">
        <span className="text-xs text-[#62666d] uppercase">
          {docs.length} documents
        </span>
      </div>
      <ul className="space-y-2 px-3 text-sm">
        {SECTIONS.map(({ id, label, icon }) => {
          const sectionDocs = docs.filter((d) => d.section === id);
          if (sectionDocs.length === 0) return null;

          const tree = buildFolderTree(docs, id);
          const isActive = pathname === `/${id}` || pathname.startsWith(`/${id}/`);

          return (
            <li key={id}>
              <div
                className={`flex items-center gap-1.5 mb-1 mt-4 first:mt-0 ${
                  isActive ? "text-[#7170ff]" : "text-[#62666d]"
                }`}
              >
                <span>{icon}</span>
                <span className="text-xs font-medium">{label}</span>
              </div>
              <ul className="space-y-0.5 pl-0">
                {tree.map((node) => renderTreeNode(node, 0, pathname))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
