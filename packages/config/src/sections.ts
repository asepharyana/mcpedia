/**
 * Section registry — defines all content sections for the UI.
 * This file is intentionally free of Node.js built-in imports (no fs/path)
 * so it can be safely imported by client components.
 *
 * Adding a new section is as simple as adding an entry here + creating a
 * `content/<id>/` directory with markdown files. No UI code changes needed.
 */
export interface SectionConfig {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export const SECTIONS: SectionConfig[] = [
  {
    id: "docs",
    label: "Documentation",
    icon: "📄",
    desc: "Setup guides, API references, and protocol specs.",
  },
  {
    id: "writeups",
    label: "Writeups",
    icon: "📝",
    desc: "Post-mortems, debugging stories, and case studies.",
  },
  {
    id: "research",
    label: "Research",
    icon: "🔬",
    desc: "Deep-dive analysis, architecture notes, and experiments.",
  },
  {
    id: "notes",
    label: "Notes",
    icon: "📌",
    desc: "Quick references, patterns, and gotchas.",
  },
];

export const SECTIONS_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
export const SECTION_IDS = SECTIONS.map((s) => s.id);
