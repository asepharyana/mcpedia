"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Doc {
  slug: string;
  title: string;
  section: string;
  tags: string[];
}

const SECTIONS = [
  { id: "docs", label: "Documentation" },
  { id: "writeups", label: "Writeups" },
  { id: "research", label: "Research" },
  { id: "notes", label: "Notes" },
] as const;

/** Client-side sidebar (fetches doc list via /api/docs at runtime).
 *  Client component so `next build` SSG doesn't hit Postgres (CI has no DB). */
export default function Sidebar() {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
        else if (data?.docs) setDocs(data.docs);
      })
      .catch(() => setDocs([]));
  }, []);

  const bySection: Record<string, Doc[]> = {};
  for (const doc of docs) {
    if (!bySection[doc.section]) bySection[doc.section] = [];
    bySection[doc.section].push(doc);
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
                  const parts = doc.slug.split("/").slice(1);
                  const label = parts[parts.length - 1];
                  const formatted = label
                    .split(/[-_]/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                  const depth = doc.slug.split("/").length;
                  const indent = depth - 1;
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
