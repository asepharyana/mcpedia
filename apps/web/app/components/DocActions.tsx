"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Share2,
  FileDown,
  Edit3,
  ExternalLink,
} from "lucide-react";

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
      {/* Copy Raw Markdown */}
      <button
        onClick={handleCopyMarkdown}
        type="button"
        title="Copy raw markdown content to clipboard"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs cursor-pointer"
      >
        {copiedMd ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Copied MD</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Raw MD</span>
          </>
        )}
      </button>

      {/* Copy Share Link */}
      <button
        onClick={handleCopyLink}
        type="button"
        title="Copy link to document"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs cursor-pointer"
      >
        {copiedLink ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Copied Link</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </>
        )}
      </button>

      {/* Export PDF */}
      <Link
        href={`/${slug}/export`}
        title="Export document or parent folder to publication-grade PDF"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-all shadow-xs"
      >
        <FileDown className="w-3.5 h-3.5" />
        <span>Export PDF</span>
      </Link>

      {/* Edit Link */}
      <Link
        href={canEdit ? `/${slug}?edit=1` : `/login?redirect=/${slug}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 border border-[var(--brand)]/30 hover:border-[var(--brand)]/60 text-[var(--brand)] dark:text-[var(--accent)] rounded-lg transition-all font-medium shadow-xs"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>Edit</span>
      </Link>
    </div>
  );
}
