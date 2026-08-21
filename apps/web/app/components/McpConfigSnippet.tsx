"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";

const CONFIGS = [
  {
    id: "claude",
    label: "Claude Desktop",
    lang: "json",
    filename: "~/Library/Application Support/Claude/claude_desktop_config.json",
    content: `{
  "mcpServers": {
    "mcpedia": {
      "command": "bun",
      "args": ["run", "/path/to/mcpedia/apps/mcp/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "OPENROUTER_API_KEY": "sk-or-v1-..."
      }
    }
  }
}`,
  },
  {
    id: "http",
    label: "Remote HTTP (SSE)",
    lang: "json",
    filename: "Streamable HTTP Endpoint",
    content: `{
  "mcpServers": {
    "mcpedia-remote": {
      "url": "https://mcp.asepharyana.my.id/mcp",
      "headers": {
        "x-webhook-secret": "your-secret-here"
      }
    }
  }
}`,
  },
  {
    id: "cli",
    label: "CLI Client",
    lang: "bash",
    filename: "Terminal One-Shot / REPL",
    content: `# One-shot question
bun run apps/mcp-client/src/ask.ts "How does ret2win stack alignment work?"

# Interactive REPL
bun run apps/mcp-client/src/index.ts`,
  },
];

export default function McpConfigSnippet() {
  const [activeTab, setActiveTab] = useState("claude");

  const current = CONFIGS.find((c) => c.id === activeTab) || CONFIGS[0];

  const markdownSnippet = `\`\`\`${current.lang}
${current.content}
\`\`\``;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
      {/* Header bar with tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-color)] flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === c.id
                  ? "bg-[var(--brand)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-[var(--text-dim)] font-mono hidden sm:block">
          {current.filename}
        </div>
      </div>

      {/* Code preview via Markdown syntax highlighter */}
      <div className="p-4 [&>.prose>.group]:my-0 [&>.prose]:max-w-none">
        <Markdown source={markdownSnippet} />
      </div>

      <div className="px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-dim)] flex items-center justify-between flex-wrap gap-2">
        <span>
          Config target: <span className="font-mono text-[var(--text-secondary)]">{current.filename}</span>
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          Format: <span className="uppercase font-mono font-semibold">{current.lang}</span>
        </span>
      </div>
    </div>
  );
}

