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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-[#23252a] bg-[#0c0d0e]">
      {/* Code block header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141517] border-b border-[#1f2022] text-[11px] text-[#8a8f98] font-mono">
        <span>{language || "text"}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 text-[#8a8f98] hover:text-[#f7f8f8] bg-[#1a1b1d] hover:bg-[#23252a] px-2 py-0.5 rounded border border-[#27292d] transition-all"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

      <pre className="!m-0 !bg-transparent p-4 overflow-x-auto text-sm text-[#e2e4e7] font-mono leading-relaxed">
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
      className="prose prose-invert max-w-none
      prose-headings:text-[#f7f8f8] prose-headings:font-medium prose-headings:tracking-tight
      prose-h1:text-2xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-2 prose-h1:border-b prose-h1:border-[#1f2022]
      prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8
      prose-h3:text-base prose-h3:mb-3 prose-h3:mt-6
      prose-p:text-[#d0d6e0] prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-[#7170ff] prose-a:no-underline hover:prose-a:underline hover:prose-a:text-[#828fff]
      prose-ul:text-[#d0d6e0] prose-ul:my-3 prose-li:my-1
      prose-ol:text-[#d0d6e0] prose-ol:my-3
      prose-strong:text-[#f7f8f8] prose-strong:font-semibold
      prose-hr:border-[#1f2022] prose-hr:my-8"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          code: CodeBlock as any,
          pre: ({ children }) => <>{children}</>,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 border border-[#1f2022] rounded-lg">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          blockquote: ({ children }) => {
            return (
              <blockquote className="border-l-4 border-[#5e6ad2] bg-[#141517]/60 pl-4 py-2 my-4 rounded-r text-[#a0a4a8] not-italic">
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
