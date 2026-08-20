"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DocFormProps {
  mode: "create" | "edit";
  slug?: string;
  secret: string;
  initial?: {
    title?: string;
    body?: string;
    section?: "docs" | "writeups" | "research" | "notes";
    type?: "documentation" | "writeup" | "research" | "note";
    status?: "published" | "draft";
    tags?: string[];
    author?: string;
  };
}

const SECTION_OPTIONS = ["docs", "writeups", "research", "notes"] as const;
const TYPE_OPTIONS = ["documentation", "writeup", "research", "note"] as const;

export default function DocForm({ mode, slug, secret, initial }: DocFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [section, setSection] = useState(initial?.section ?? "docs");
  const [type, setType] = useState(initial?.type ?? "documentation");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const baseInputCls =
    "w-full px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { title, body, section, type, status, author, tags: tagList };

    try {
      let res: Response;
      if (mode === "create") {
        const slugVal = slug ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        res = await fetch("/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
          body: JSON.stringify({ slug: slugVal, ...payload }),
        });
      } else {
        const editSlug = slug ?? "";
        res = await fetch(`/api/docs/${editSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }

      const result = await res.json();
      router.push(result.doc?.slug ? `/${result.doc.slug}` : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded border border-[#274360] text-[#fca5a5] text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={baseInputCls} required />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Slug</label>
        <input
          type="text"
          value={slug ?? ""}
          readOnly
          className="w-full px-3 py-2 bg-[#191a1b] border border-[#23252a] rounded text-[#8a8f98]"
          placeholder={section}
        />
        <p className="text-xs text-[#62666d] mt-1">URL-safe path under the section.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value as typeof section)} className={baseInputCls}>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={baseInputCls}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={baseInputCls}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Tags</label>
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={baseInputCls} placeholder="comma, separated, tags" />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Author</label>
        <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className={baseInputCls} />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Body (Markdown)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-96 px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#d0d6e0] placeholder-[#62666d] font-mono text-sm focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
          placeholder="# Heading&#10;&#10;Content here..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#5e6ad2] text-white rounded hover:bg-[#7170ff] disabled:opacity-50 font-medium text-sm"
        >
          {loading ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-[#23252a] rounded text-[#d0d6e0] hover:text-[#f7f8f8] hover:border-[#3e3e44] transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
