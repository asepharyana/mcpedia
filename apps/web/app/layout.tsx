import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

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
      <body className="min-h-screen bg-[#08090a] text-[#e2e4e7] font-sans antialiased selection:bg-[#5e6ad2]/30 selection:text-white flex flex-col">
        <div hidden>
          <div id="a11y-live-region" aria-live="polite" aria-atomic="true" />
        </div>

        <Header />

        <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col">
          <div className="flex flex-1">
            <aside className="hidden lg:block w-72 shrink-0 border-r border-[#1f2022] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
              <Sidebar />
            </aside>
            <main className="flex-1 min-w-0">
              <div className="px-4 sm:px-8 py-8 sm:py-10 max-w-4xl mx-auto xl:max-w-5xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
