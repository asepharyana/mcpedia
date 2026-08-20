import Link from "next/link";
import { listDocuments } from "@mcpedia/core";

const SECTIONS = [
  { id: "docs", label: "Documentation" },
  { id: "writeups", label: "Writeups" },
  { id: "research", label: "Research" },
  { id: "notes", label: "Notes" },
] as const;

export default async function Sidebar() {
  const docs = await listDocuments();

  // Build a tree: section → top-level slugs + children
  const bySection: Record<string, { slug: string; title: string; depth: number }[]> = {};
  for (const doc of docs) {
    if (!bySection[doc.section]) bySection[doc.section] = [];
    // Count depth from dots in a flattened slug: docs/websocket/contract
    // We'll show all docs at their depth level
    bySection[doc.section].push({
      slug: doc.slug,
      title: doc.title,
      depth: doc.slug.split("/").length,
    });
  }

  return (
    <nav className="h-full overflow-y-auto py-6">
      <ul className="space-y-1 px-3 text-sm">
        {SECTIONS.map(({ id, label }) => {
          const sectionDocs = bySection[id] || [];
          if (sectionDocs.length === 0) return null;
          return (
            <li key={id}>
              <div className="text-xs font-medium text-[#62666d] uppercase mb-1 mt-4 first:mt-0">
                {label}
              </div>
              <ul className="space-y-0.5">
                {sectionDocs.map((doc) => {
                  const parts = doc.slug.split("/").slice(1); // remove section prefix
                  const label = parts[parts.length - 1];
                  const formatted = label
                    .split(/[-_]/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                  const indent = doc.depth - 1;
                  return (
                    <li key={doc.slug} style={{ marginLeft: `${indent * 12}px` }}>
                      <Link
                        href={`/${doc.slug}`}
                        className="block text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[#191a1b] rounded px-2 py-0.5 transition-colors"
                        title={doc.title}
                      >
                        {formatted || doc.slug}
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
