"use client";

import { useState } from "react";

const CONFIGS = [
  {
    id: "claude",
    label: "Claude Desktop",
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
    filename: "Terminal One-Shot / REPL",
    content: `# One-shot question
bun run apps/mcp-client/src/ask.ts "How does ret2win stack alignment work?"

# Interactive REPL
bun run apps/mcp-client/src/index.ts`,
  },
];

export default function McpConfigSnippet() {
  const [activeTab, setActiveTab] = useState("claude");
  const [copied, setCopied] = useState(false);

  const current = CONFIGS.find((c) => c.id === activeTab) || CONFIGS[0];

  function handleCopy() {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-md">
      {/* Header bar with tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border-color)] flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === c.id
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated-hover)] px-2.5 py-1 rounded border border-[var(--border-color)] transition-all shadow-sm"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Config</span>
            </>
          )}
        </button>
      </div>

      {/* Code preview */}
      <pre className="p-4 text-xs font-mono text-[var(--pre-text)] bg-[var(--code-block-bg)] overflow-x-auto leading-relaxed">
        <code>{current.content}</code>
      </pre>

      <div className="px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border-color)] text-[11px] text-[var(--text-dim)]">
        Config location: <span className="font-mono text-[var(--text-muted)]">{current.filename}</span>
      </div>
    </div>
  );
}
