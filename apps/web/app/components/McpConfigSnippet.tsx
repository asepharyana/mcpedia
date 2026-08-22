"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";
import {
  Sparkles,
  Terminal,
  Server,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Cpu,
  Laptop,
} from "lucide-react";

const CONFIGS = [
  {
    id: "claude",
    label: "Claude Desktop",
    icon: Sparkles,
    lang: "json",
    filename: "~/Library/Application Support/Claude/claude_desktop_config.json",
    content: `{
  "mcpServers": {
    "mcpedia": {
      "command": "bun",
      "args": ["run", "/path/to/mcpedia/apps/mcp/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/mcpedia",
        "OPENROUTER_API_KEY": "sk-or-v1-..."
      }
    }
  }
}`,
  },
  {
    id: "cursor",
    label: "Cursor AI",
    icon: Laptop,
    lang: "json",
    filename: ".cursor/mcp.json",
    content: `{
  "mcpServers": {
    "mcpedia": {
      "command": "bun",
      "args": ["run", "/path/to/mcpedia/apps/mcp/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/mcpedia"
      }
    }
  }
}`,
  },
  {
    id: "http",
    label: "Streamable HTTP Endpoint",
    icon: Server,
    lang: "json",
    filename: "Streamable HTTP (SSE) Client Config",
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
    label: "CLI & Scripts",
    icon: Terminal,
    lang: "bash",
    filename: "Terminal / MCP Client Subprocess",
    content: `# Ask questions over semantic knowledge
bun run apps/mcp-client/src/ask.ts "How does ret2win stack alignment work in x86_64?"

# Run interactive REPL with native tool calls
bun run apps/mcp-client/src/index.ts`,
  },
];

export default function McpConfigSnippet() {
  const [activeTab, setActiveTab] = useState("claude");
  const [copied, setCopied] = useState(false);

  const current = CONFIGS.find((c) => c.id === activeTab) || CONFIGS[0];

  const markdownSnippet = `\`\`\`${current.lang}
${current.content}
\`\`\``;

  function handleCopyAll() {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header bar with tabs */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[var(--bg-elevated)]/60 border-b border-[var(--border-color)] flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {CONFIGS.map((c) => {
            const Icon = c.icon;
            const isSelected = activeTab === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCopyAll}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs cursor-pointer font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500">Copied Config</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Config</span>
            </>
          )}
        </button>
      </div>

      {/* Code preview via Markdown syntax highlighter */}
      <div className="p-4 sm:p-5 [&>.prose>.group]:my-0 [&>.prose]:max-w-none">
        <Markdown source={markdownSnippet} />
      </div>

      {/* Footer Info */}
      <div className="px-4 sm:px-6 py-3 bg-[var(--bg-elevated)]/40 border-t border-[var(--border-color)] text-xs text-[var(--text-dim)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase text-[10px] text-[var(--text-muted)] font-semibold">
            Target File:
          </span>
          <span className="font-mono text-[var(--text-secondary)] text-[11px]">
            {current.filename}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>13 MCP Tools Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
}
