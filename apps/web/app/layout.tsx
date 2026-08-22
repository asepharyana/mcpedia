import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Database, Activity, Sparkles, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "MCPedia — Knowledge Base for Humans and AI Agents",
  description:
    "A content-first knowledge base. Humans read the Web UI; AI agents use the MCP server. Both share one Core.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('mcpedia-theme');
                  var isDark = stored === 'dark' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-app)] text-[var(--text-secondary)] font-sans antialiased selection:bg-[var(--brand)]/30 selection:text-white flex flex-col transition-colors duration-150 tech-grid-bg relative overflow-x-hidden">
        {/* Top ambient radial glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[48rem] h-64 bg-indigo-500/10 dark:bg-indigo-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-48 left-1/4 w-80 h-80 bg-cyan-500/5 dark:bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div hidden>
          <div id="a11y-live-region" aria-live="polite" aria-atomic="true" />
        </div>

        <Header />

        <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col relative z-10">
          <div className="flex flex-1">
            <aside className="hidden lg:block w-72 shrink-0 border-r border-[var(--border-color)] sticky top-15 h-[calc(100vh-3.75rem)] overflow-y-auto bg-[var(--bg-app)]/80 backdrop-blur-md">
              <Sidebar />
            </aside>
            <main className="flex-1 min-w-0">
              <div className="px-4 sm:px-8 py-8 sm:py-10 max-w-4xl mx-auto xl:max-w-5xl">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Global Telemetry & Status Footer */}
        <footer className="no-print border-t border-[var(--border-color)] bg-[var(--bg-surface)]/60 backdrop-blur-md py-4 text-xs text-[var(--text-dim)] relative z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MCPedia Intelligence Engine</span>
              <span>·</span>
              <span className="text-[var(--text-muted)]">PostgreSQL 16 Core</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
              <Link href="/search" className="hover:text-[var(--brand)] dark:hover:text-[var(--accent)] transition-colors">
                RRF Hybrid Search
              </Link>
              <span>·</span>
              <Link href="/export/pdf" className="hover:text-[var(--brand)] dark:hover:text-[var(--accent)] transition-colors">
                Publication PDF
              </Link>
              <span>·</span>
              <span className="text-[var(--text-dim)]">Native MCP :4021</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
