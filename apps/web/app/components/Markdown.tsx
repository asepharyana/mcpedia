"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  const textContent = String(children).replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  // If inline code
  if (!className && typeof children === "string" && !children.includes("\n")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--code-block-bg)]">
      {/* Code block header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border-color)] text-[11px] text-[var(--text-muted)] font-mono">
        <span>{language || "text"}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated-hover)] hover:bg-[var(--border-subtle)] px-2 py-0.5 rounded border border-[var(--border-color)] transition-all"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4 L19 7" />
              </svg>
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="!m-0 !bg-transparent p-4 overflow-x-auto text-sm text-[var(--pre-text)] font-mono leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose max-w-none
      prose-headings:text-[var(--text-primary)] prose-headings:font-medium prose-headings:tracking-tight
      prose-h1:text-2xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-2 prose-h1:border-b prose-h1:border-[var(--border-color)]
      prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8
      prose-h3:text-base prose-h3:mb-3 prose-h3:mt-6
      prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline hover:prose-a:text-[var(--accent-hover)]
      prose-ul:text-[var(--text-secondary)] prose-ul:my-3 prose-li:my-1
      prose-ol:text-[var(--text-secondary)] prose-ol:my-3
      prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
      prose-hr:border-[var(--border-color)] prose-hr:my-8"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          code: CodeBlock as any,
          pre: ({ children }) => <>{children}</>,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 border border-[var(--border-color)] rounded-lg">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          blockquote: ({ children }) => {
            return (
              <blockquote className="border-l-4 border-[var(--brand)] bg-[var(--bg-elevated)]/60 pl-4 py-2 my-4 rounded-r text-[var(--text-muted)] not-italic">
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
