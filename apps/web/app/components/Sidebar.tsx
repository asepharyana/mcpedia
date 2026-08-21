"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@mcpedia/config/sections";

interface Doc {
  slug: string;
  title: string;
  section: string;
  tags: string[];
}

interface TreeNode {
  name: string;
  slug: string;
  title: string;
  children: TreeNode[];
  isLeaf: boolean;
  docCount: number;
}

function buildFolderTree(docs: Doc[], section: string): TreeNode[] {
  const root: TreeNode[] = [];

  for (const doc of docs.filter((d) => d.section === section)) {
    const parts = doc.slug.split("/");
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
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
          .join(" ");
      }
      current = node.children;
    }
  }

  function countDocs(node: TreeNode): number {
    if (node.isLeaf) return 1;
    return node.children.reduce((sum, child) => sum + countDocs(child), 0);
  }

  for (const node of root) {
    node.docCount = countDocs(node);
  }

  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      const aFolder = a.children.length > 0 ? 0 : 1;
      const bFolder = b.children.length > 0 ? 0 : 1;
      if (aFolder !== bFolder) return aFolder - bFolder;
      return (a.title || a.name).localeCompare(b.title || b.name);
    });
  }

  for (const node of root) {
    sortNodes(node.children);
  }

  return sortNodes(root);
}

function TreeNodeItem({
  node,
  depth,
  pathname,
  collapsedMap,
  toggleCollapse,
}: {
  node: TreeNode;
  depth: number;
  pathname: string;
  collapsedMap: Record<string, boolean>;
  toggleCollapse: (slug: string) => void;
}) {
  const isFolder = node.children.length > 0;
  const isActive = pathname === `/${node.slug}`;
  const isParentOfActive = pathname.startsWith(`/${node.slug}/`);
  const isCollapsed = collapsedMap[node.slug] ?? false;

  return (
    <li className={`select-none ${depth > 0 ? "ml-3 pl-2 border-l border-[#1f2022]" : ""}`}>
      <div
        className={`group flex items-center justify-between gap-1.5 text-xs py-1.5 px-2 rounded-md transition-all ${
          isActive
            ? "text-[#7170ff] bg-[#5e6ad2]/15 font-medium border border-[#5e6ad2]/30 shadow-sm"
            : isParentOfActive
              ? "text-[#d0d6e0] bg-[#141517]/80"
              : "text-[#8a8f98] hover:text-[#d0d6e0] hover:bg-[#141517]"
        }`}
      >
        <Link
          href={`/${node.slug}`}
          className="flex items-center gap-2 min-w-0 flex-1 py-0.5"
          title={node.title || node.name}
        >
          <span className="text-xs shrink-0 opacity-80 group-hover:opacity-100">
            {isFolder ? "📁" : "📄"}
          </span>
          <span className="truncate">{node.title || node.name}</span>
        </Link>

        {isFolder && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#62666d] bg-[#191a1b] px-1 py-0.2 rounded font-mono">
              {node.docCount}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCollapse(node.slug);
              }}
              className="p-0.5 text-[#62666d] hover:text-[#d0d6e0] rounded hover:bg-[#23252a] transition-transform"
              aria-label={isCollapsed ? "Expand folder" : "Collapse folder"}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {isFolder && !isCollapsed && (
        <ul className="mt-0.5 space-y-0.5 animate-fade-in">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.slug}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              collapsedMap={collapsedMap}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filterText, setFilterText] = useState("");
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
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

  function toggleCollapse(slug: string) {
    setCollapsedMap((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  const filteredDocs = useMemo(() => {
    if (!filterText.trim()) return docs;
    const lower = filterText.toLowerCase();
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(lower) ||
        d.slug.toLowerCase().includes(lower) ||
        d.tags.some((t) => t.toLowerCase().includes(lower)),
    );
  }, [docs, filterText]);

  return (
    <nav className="h-full flex flex-col py-4 px-3">
      {/* Sidebar search filter */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter docs..."
            className="w-full pl-7 pr-3 py-1.5 bg-[#141517] border border-[#23252a] hover:border-[#383b42] rounded-md text-xs text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 text-[#62666d] absolute left-2 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {filterText && (
            <button
              onClick={() => setFilterText("")}
              className="absolute right-2 top-2 text-xs text-[#62666d] hover:text-[#d0d6e0]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary count */}
      <div className="flex items-center justify-between px-1 mb-3 text-[11px] text-[#62666d]">
        <span className="uppercase tracking-wider font-mono">Documentation</span>
        <span>{filteredDocs.length} items</span>
      </div>

      {/* Section Trees */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {SECTIONS.map(({ id, label, icon }) => {
          const sectionDocs = filteredDocs.filter((d) => d.section === id);
          if (sectionDocs.length === 0) return null;

          const tree = buildFolderTree(filteredDocs, id);
          const isSectionActive = pathname === `/${id}` || pathname.startsWith(`/${id}/`);

          return (
            <div key={id} className="border-b border-[#141516] pb-3 last:border-0">
              <Link
                href={`/${id}`}
                className={`flex items-center justify-between gap-1.5 px-1 py-1 mb-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isSectionActive
                    ? "text-[#7170ff]"
                    : "text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <span className="text-[10px] text-[#62666d] font-normal font-mono">
                  {sectionDocs.length}
                </span>
              </Link>

              <ul className="space-y-0.5 mt-1">
                {tree.map((node) => (
                  <TreeNodeItem
                    key={node.slug}
                    node={node}
                    depth={0}
                    pathname={pathname}
                    collapsedMap={collapsedMap}
                    toggleCollapse={toggleCollapse}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom quick links */}
      <div className="pt-3 border-t border-[#1f2022] mt-auto">
        <Link
          href="/create"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs bg-[#141517] hover:bg-[#1b1d20] border border-[#23252a] text-[#d0d6e0] hover:text-white rounded-md transition-colors font-medium"
        >
          <span>+ Create New Document</span>
        </Link>
      </div>
    </nav>
  );
}
