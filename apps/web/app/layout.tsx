import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "MCPedia",
  description: "Knowledge base for humans and AI agents via MCP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              MCPedia
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/search" className="hover:underline">
                Search
              </Link>
              <Link href="/docs" className="hover:underline">
                Docs
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl w-full flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
