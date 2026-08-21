"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GithubSlugger from "github-slugger";

interface TOCEntry {
  id: string;
  text: string;
  level: number;
}

export default function TOC({ source }: { source: string }) {
  const [toc, setToc] = useState<TOCEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const slugger = new GithubSlugger();
    const lines = source.split("\n");
    const entries: TOCEntry[] = [];
    for (const line of lines) {
      const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
      if (m) {
        const level = m[1].length;
        const text = m[2].trim();
        entries.push({ id: slugger.slug(text), text, level });
      }
    }
    setToc(entries);
  }, [source]);

  // Scroll spy using IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return;

    const headingElements = toc
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0.1,
      },
    );

    headingElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <nav className="text-xs">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1f2022]">
        <svg className="w-3.5 h-3.5 text-[#7170ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span className="font-semibold uppercase tracking-wider text-[#8a8f98] text-[11px]">
          On this page
        </span>
      </div>

      <ul className="space-y-1.5 border-l border-[#1f2022] pl-2.5">
        {toc.map((entry) => {
          const isActive = activeId === entry.id;
          return (
            <li
              key={entry.id}
              className={`transition-all ${entry.level === 3 ? "ml-3" : ""}`}
            >
              <Link
                href={`#${entry.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(entry.id);
                  if (target) {
                    const offset = 80;
                    const top = target.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: "smooth" });
                    setActiveId(entry.id);
                    history.pushState(null, "", `#${entry.id}`);
                  }
                }}
                className={`block py-0.5 transition-colors line-clamp-1 ${
                  isActive
                    ? "text-[#7170ff] font-medium translate-x-0.5"
                    : "text-[#8a8f98] hover:text-[#d0d6e0]"
                }`}
                title={entry.text}
              >
                {entry.text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
