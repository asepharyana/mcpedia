import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Sidebar from "@/components/Sidebar";
import { SECTIONS } from "@mcpedia/config/sections";

export const metadata: Metadata = {
  title: "MCPedia — Knowledge base for humans and AI agents",
  description:
    "A content-first knowledge base. Humans read the Web UI; AI agents use the MCP server. Both share one Core.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-screen bg-[#08090a] text-[#e2e4e7] font-inter">
        <div hidden>
          {/* hidden aria-live container for screen readers */}
          <div id="a11y-live-region" aria-live="polite" aria-atomic="true" />
        </div>

        <header className="sticky top-0 z-20 border-b border-[#1f2022]">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-medium text-[#f7f8f8] text-lg">
              MCPedia
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`/${s.id}`}
                  className="text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
                >
                  {s.label}
                </Link>
              ))}
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
