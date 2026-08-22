"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Database,
  Layers,
  Sparkles,
  Search,
  Globe,
  Terminal,
  Server,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  ShieldCheck,
} from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  badge: string;
  type: "client" | "protocol" | "core" | "storage";
  icon: any;
  desc: string;
  metrics: { label: string; value: string }[];
  features: string[];
  docLink?: string;
}

const NODES: NodeDetail[] = [
  {
    id: "ai-agents",
    title: "AI Coding Agents",
    badge: "MCP Consumer",
    type: "client",
    icon: Sparkles,
    desc: "Claude Desktop, Cursor, Antigravity, and Zed connect via Model Context Protocol to read and write technical knowledge directly.",
    metrics: [
      { label: "Transport", value: "Stdio / HTTP SSE" },
      { label: "Tools Exposed", value: "13 Native Tools" },
      { label: "Authentication", value: "x-webhook-secret" },
    ],
    features: [
      "Semantic similarity search over chunks",
      "Direct document CRUD into Postgres",
      "Context retrieval for debugging & CTF writeups",
    ],
    docLink: "/docs",
  },
  {
    id: "web-ui",
    title: "Human Web Interface",
    badge: "Next.js 16 + React 19",
    type: "client",
    icon: Globe,
    desc: "Fast, accessible, and responsive developer web interface with dark/light themes, keyboard shortcuts, and instant search.",
    metrics: [
      { label: "Framework", value: "Next.js 16.3" },
      { label: "Styling", value: "Tailwind CSS v4" },
      { label: "Command Menu", value: "⌘K Omnisearch" },
    ],
    features: [
      "Hierarchical folder directory tree",
      "Publication-grade PDF export generator",
      "Live markdown editor with revision rollback",
    ],
    docLink: "/docs",
  },
  {
    id: "mcp-server",
    title: "MCP Server Gateway",
    badge: "Streamable HTTP :4021",
    type: "protocol",
    icon: Server,
    desc: "High-throughput streamable Model Context Protocol server exposing tool endpoints and resource URIs.",
    metrics: [
      { label: "Port", value: ":4021" },
      { label: "Protocol", value: "MCP 2024-11-05" },
      { label: "Runtime", value: "Bun Engine" },
    ],
    features: [
      "get_document / create_document tools",
      "search_hybrid / search_semantic tools",
      "list_sections & list_revisions resources",
    ],
    docLink: "/api",
  },
  {
    id: "core-engine",
    title: "@mcpedia/core",
    badge: "Single Source of Truth",
    type: "core",
    icon: Layers,
    desc: "Unified business logic layer shared across Web, MCP Server, REST API, and Background Workers.",
    metrics: [
      { label: "Architecture", value: "Monorepo Package" },
      { label: "Validation", value: "Strict Type Safety" },
      { label: "Ranking", value: "RRF Hybrid Fusion" },
    ],
    features: [
      "Path classification & folder hierarchy",
      "Markdown document chunking & tokenization",
      "Drizzle ORM transactional schema mapping",
    ],
    docLink: "/research",
  },
  {
    id: "search-engine",
    title: "Multi-Modal Search Engine",
    badge: "RRF Algorithm",
    type: "core",
    icon: Search,
    desc: "Reciprocal Rank Fusion uniting Postgres Full-Text Search tsvectors with OpenAI/OpenRouter vector embeddings.",
    metrics: [
      { label: "FTS Algorithm", value: "tsvector + GIN" },
      { label: "Vector Search", value: "Cosine Similarity" },
      { label: "Fusion Constant", value: "k = 60" },
    ],
    features: [
      "Sub-millisecond keyword retrieval",
      "Conceptual similarity matching",
      "Instant snippet generation with highlight markers",
    ],
    docLink: "/search",
  },
  {
    id: "postgres-db",
    title: "PostgreSQL 16 + pgvector",
    badge: "Primary Storage",
    type: "storage",
    icon: Database,
    desc: "ACID-compliant relational database storing document bodies, revision trees, vector embeddings, and full-text indexes.",
    metrics: [
      { label: "Extension", value: "vector (1536 dim)" },
      { label: "Backups", value: "Auto .md to disk" },
      { label: "Isolation", value: "Transactional" },
    ],
    features: [
      "HNSW vector index for embeddings",
      "Complete revision history preservation",
      "Instant document schema migrations",
    ],
    docLink: "/docs",
  },
];

export default function InteractiveTopology() {
  const [activeNodeId, setActiveNodeId] = useState<string>("core-engine");

  const activeNode = NODES.find((n) => n.id === activeNodeId) || NODES[0];
  const ActiveIcon = activeNode.icon;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Interactive System Topology
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            How MCPedia Unifies Humans & AI Agents
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-color)] px-2.5 py-1 rounded-md">
            Click any node below to inspect
          </span>
        </div>
      </div>

      {/* Grid Layout: Visual Interactive Map & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Visual Map Column (Left) */}
        <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] bg-[var(--bg-app)]/50 flex flex-col justify-between space-y-6">
          {/* Layer 1: Clients */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-2 block">
              1. Ingestion & Access Layer
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NODES.filter((n) => n.type === "client").map((node) => {
                const Icon = node.icon;
                const isSelected = activeNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNodeId(node.id)}
                    type="button"
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--brand)]/15 border-[var(--brand)] shadow-md shadow-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                        : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-[var(--brand)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-color)]">
                        {node.badge}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">{node.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="flex justify-center text-[var(--text-dim)]">
            <span className="text-xs font-mono px-3 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)]">
              ↓ Secure Protocol & Gateway
            </span>
          </div>

          {/* Layer 2: Protocol & Core Services */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-2 block">
              2. Gateway & Intelligence Core
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NODES.filter((n) => n.type === "protocol" || n.type === "core").map((node) => {
                const Icon = node.icon;
                const isSelected = activeNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNodeId(node.id)}
                    type="button"
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--brand)]/15 border-[var(--brand)] shadow-md shadow-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                        : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-[var(--brand)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="font-semibold text-xs text-[var(--text-primary)] leading-tight mb-1 truncate">
                      {node.title}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                      {node.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="flex justify-center text-[var(--text-dim)]">
            <span className="text-xs font-mono px-3 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)]">
              ↓ Persistent Layer (ACID + Vectors)
            </span>
          </div>

          {/* Layer 3: Database & Vector Storage */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-2 block">
              3. Source of Truth Storage
            </span>
            {NODES.filter((n) => n.type === "storage").map((node) => {
              const Icon = node.icon;
              const isSelected = activeNodeId === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => setActiveNodeId(node.id)}
                  type="button"
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--brand)]/15 border-[var(--brand)] shadow-md shadow-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                      : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-[var(--brand)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--text-primary)]">{node.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">Source of truth for all content & embeddings</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {node.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Node Inspector Details Column (Right) */}
        <div className="lg:col-span-5 p-6 bg-[var(--bg-surface)] flex flex-col justify-between space-y-6 animate-fade-in">
          <div>
            {/* Inspector Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--brand)]/15 border border-[var(--brand)]/30 text-[var(--brand)] dark:text-[var(--accent)] flex items-center justify-center">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[var(--text-primary)]">{activeNode.title}</h4>
                  <span className="text-xs font-mono text-[var(--brand)] dark:text-[var(--accent)]">
                    {activeNode.badge}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-6">
              {activeNode.desc}
            </p>

            {/* Telemetry Metrics */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)] font-mono mb-2.5 block">
                Telemetry & Architecture
              </span>
              <div className="space-y-2">
                {activeNode.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg text-xs"
                  >
                    <span className="text-[var(--text-muted)]">{m.label}</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Capabilities */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)] font-mono mb-2.5 block">
                Key Capabilities
              </span>
              <ul className="space-y-2">
                {activeNode.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Link to Documentation */}
          {activeNode.docLink && (
            <div className="pt-4 border-t border-[var(--border-color)]">
              <Link
                href={activeNode.docLink}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] hover:border-[var(--brand)] text-xs font-semibold text-[var(--text-primary)] rounded-xl transition-all shadow-xs group"
              >
                <span>Read technical writeup in {activeNode.title}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
