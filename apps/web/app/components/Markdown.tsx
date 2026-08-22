"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import {
  Copy,
  Check,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from "lucide-react";

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode })?.children);
  }
  return "";
}

function PreBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const textContent = extractText(children).replace(/\n$/, "");

  let language = "text";
  if (React.isValidElement(children)) {
    const className = (children.props as { className?: string })?.className || "";
    const match = /language-(\w+)/.exec(className);
    if (match) {
      language = match[1];
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="code-block-wrapper relative group my-6 rounded-xl overflow-hidden border border-[var(--border-code)] bg-[var(--code-block-bg)] shadow-sm print:my-3 print:rounded-md print:border-slate-300 print:bg-slate-50">
      {/* Code block header bar */}
      <div className="code-block-header flex items-center justify-between px-4 py-2.5 bg-[var(--code-header-bg)] border-b border-[var(--border-code)] text-xs font-mono select-none print:px-3 print:py-1 print:bg-slate-100 print:border-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="no-print flex items-center gap-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] print:text-slate-700 group-hover:text-[var(--text-primary)] transition-colors">
            {language}
          </span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          aria-label="Copy code to clipboard"
          className="no-print flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--code-button-bg)] hover:bg-[var(--code-button-hover-bg)] px-2.5 py-1 rounded-md border border-[var(--border-code)] transition-all font-sans shadow-xs cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="!m-0 !bg-transparent p-4 sm:p-5 print:p-3 overflow-x-auto text-[13px] sm:text-[13.5px] print:text-[8.5pt] text-[var(--pre-text)] print:text-slate-900 font-mono leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  );
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose max-w-none
      prose-headings:text-[var(--text-primary)] prose-headings:font-bold prose-headings:tracking-tight
      prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-3 prose-h1:border-b prose-h1:border-[var(--border-color)]
      prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--border-subtle)]
      prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
      prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-[var(--accent)] prose-a:font-medium prose-a:no-underline hover:prose-a:underline hover:prose-a:text-[var(--accent-hover)]
      prose-ul:text-[var(--text-secondary)] prose-ul:my-4 prose-li:my-1.5
      prose-ol:text-[var(--text-secondary)] prose-ol:my-4
      prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
      prose-hr:border-[var(--border-color)] prose-hr:my-8"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          pre: PreBlock as any,
          code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
            if (className?.includes("hljs") || className?.includes("language-")) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-[var(--code-inline-bg)] text-[var(--code-inline-text)] border border-[var(--code-inline-border)] font-mono text-[0.875em] font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 border border-[var(--border-color)] rounded-xl shadow-xs">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          blockquote: ({ children }) => {
            const rawText = extractText(children).trim();
            const alertMatch = rawText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

            if (alertMatch) {
              const alertType = alertMatch[1].toUpperCase();
              let borderClass = "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200";
              let Icon = Info;
              let title = "Note";

              if (alertType === "TIP") {
                borderClass = "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
                Icon = Lightbulb;
                title = "Tip";
              } else if (alertType === "IMPORTANT") {
                borderClass = "border-violet-500 bg-violet-500/10 text-violet-900 dark:text-violet-200";
                Icon = Flame;
                title = "Important";
              } else if (alertType === "WARNING") {
                borderClass = "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200";
                Icon = AlertTriangle;
                title = "Warning";
              } else if (alertType === "CAUTION") {
                borderClass = "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200";
                Icon = ShieldAlert;
                title = "Caution";
              }

              return (
                <div className={`my-5 p-4 rounded-xl border-l-4 ${borderClass} shadow-xs`}>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1.5">
                    <Icon className="w-4 h-4" />
                    <span>{title}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--text-secondary)] [&>p]:mb-1 [&>p:last-child]:mb-0">
                    {children}
                  </div>
                </div>
              );
            }

            return (
              <blockquote className="border-l-4 border-[var(--brand)] bg-[var(--brand)]/5 dark:bg-[var(--brand)]/10 pl-4 py-2.5 my-5 rounded-r-xl text-[var(--text-secondary)] not-italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
