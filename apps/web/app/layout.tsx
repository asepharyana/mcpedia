import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "MCPedia — Knowledge base for humans and AI agents",
  description:
    "A content-first knowledge base. Humans read the Web UI; AI agents use the MCP server. Both share one Core.",
};

const SECTIONS = [
  { id: "docs", label: "Documentation", icon: "📄" },
  { id: "writeups", label: "Writeups", icon: "📝" },
  { id: "research", label: "Research", icon: "🔬" },
  { id: "notes", label: "Notes", icon: "📌" },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-screen bg-[#08090a] text-[#e2e4e7] font-inter">
        <header className="sticky top-0 z-20 border-b border-[#1f2022]">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-medium text-[#f7f8f8] text-lg">
              MCPedia
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link
                href="/docs"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/writeups"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Writeups
              </Link>
              <Link
                href="/research"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Research
              </Link>
              <Link
                href="/notes"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Notes
              </Link>
              <Link
                href="/search"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Search
              </Link>
              <Link
                href="/login"
                className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              >
                Login
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-7xl">
          <div className="flex">
            {/* Sticky sidebar for doc navigation */}
            <aside className="hidden xl:block w-64 shrink-0 border-r border-[#1f2022]">
              <Sidebar />
            </aside>

            <main className="flex-1 min-w-0">
              <div className="px-8 py-10 max-w-4xl mx-auto lg:max-w-5xl xl:max-w-6xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
