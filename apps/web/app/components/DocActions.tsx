"use client";

import { useState } from "react";
import Link from "next/link";

interface DocActionsProps {
  slug: string;
  body: string;
  canEdit: boolean;
}

export default function DocActions({ slug, body, canEdit }: DocActionsProps) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopyMarkdown() {
    navigator.clipboard.writeText(body);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
      {/* Copy Markdown */}
      <button
        onClick={handleCopyMarkdown}
        type="button"
        title="Copy raw markdown content"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-all shadow-sm"
      >
        {copiedMd ? (
          <>
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-500 font-medium">Copied MD</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>Raw MD</span>
          </>
        )}
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        type="button"
        title="Copy link to document"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-all shadow-sm"
      >
        {copiedLink ? (
          <>
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-500 font-medium">Copied Link</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>Share</span>
          </>
        )}
      </button>

      {/* Edit Link */}
      <Link
        href={canEdit ? `/${slug}?edit=1` : `/login?redirect=/${slug}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 border border-[var(--brand)]/30 hover:border-[var(--brand)]/60 text-[var(--brand)] dark:text-[var(--accent)] rounded-md transition-all font-medium"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Edit</span>
      </Link>
    </div>
  );
}
