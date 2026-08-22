"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";

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
    <div className="code-block-wrapper relative group my-5 rounded-xl overflow-hidden border border-[var(--border-code)] bg-[var(--code-block-bg)] shadow-xs print:my-3 print:rounded-md print:border-slate-300 print:bg-slate-50">
      {/* Code block header bar */}
      <div className="code-block-header flex items-center justify-between px-4 py-2 bg-[var(--code-header-bg)] border-b border-[var(--border-code)] text-xs font-mono select-none print:px-3 print:py-1 print:bg-slate-100 print:border-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="no-print flex items-center gap-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 dark:bg-rose-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 dark:bg-amber-500/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 dark:bg-emerald-500/60 inline-block" />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] print:text-slate-700 group-hover:text-[var(--text-secondary)] transition-colors">
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
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="!m-0 !bg-transparent p-4 print:p-3 overflow-x-auto text-[13.5px] print:text-[8.5pt] text-[var(--pre-text)] print:text-slate-900 font-mono leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  );
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose max-w-none
      prose-headings:text-[var(--text-primary)] prose-headings:font-semibold prose-headings:tracking-tight
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
            return (
              <blockquote className="border-l-4 border-[var(--brand)] bg-[var(--brand)]/5 dark:bg-[var(--brand)]/10 pl-4 py-2.5 my-5 rounded-r-lg text-[var(--text-secondary)] not-italic">
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
