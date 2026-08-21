"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DocFormProps {
  mode: "create" | "edit";
  slug?: string;
  secret: string;
  existingFolders?: Record<string, string[]>;
  initial?: {
    title?: string;
    body?: string;
    section?: "docs" | "writeups" | "research" | "notes";
    type?: "documentation" | "writeup" | "research" | "note";
    status?: "published" | "draft";
    tags?: string[];
    author?: string;
    extraFields?: Record<string, unknown>;
  };
}

const SECTION_OPTIONS = ["docs", "writeups", "research", "notes"] as const;
const TYPE_OPTIONS = ["documentation", "writeup", "research", "note"] as const;

export default function DocForm({
  mode,
  slug,
  secret,
  existingFolders,
  initial,
}: DocFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugInput, setSlugInput] = useState("");
  const [body, setBody] = useState(initial?.body ?? "");
  const [section, setSection] = useState(initial?.section ?? "docs");
  const [type, setType] = useState(initial?.type ?? "documentation");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");

  // Dynamic custom fields — content creators can add any metadata they want
  const [customFields, setCustomFields] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // Parent folder selection (hierarchical structure like GitHub folders)
  const [parentFolder, setParentFolder] = useState("");

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // For edit mode, slug is fixed (full path). For create mode, build from folder + slugInput.
  const isEdit = mode === "edit";
  const effectiveSlug = isEdit ? (slug ?? "") : parentFolder
    ? `${parentFolder}/${slugInput}`.replace(/^\/+/, "").replace(/\/+/g, "/")
    : slugInput;

  const availableFolders = existingFolders?.[section] ?? [];

  const baseInputCls =
    "w-full px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]";

  function addCustomField() {
    setCustomFields([...customFields, { key: "", value: "" }]);
  }

  function updateCustomField(index: number, field: "key" | "value", value: string) {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  }

  function removeCustomField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!effectiveSlug || !title || !body) {
      setError("Slug, title, and body are required.");
      setLoading(false);
      return;
    }

    // Build payload with custom fields flattened at top level
    const payload: Record<string, unknown> = {
      title,
      body,
      slug: effectiveSlug,
      section,
      type,
      status,
      author,
      tags: tagList,
    };

    // Merge dynamic custom fields
    for (const field of customFields) {
      if (field.key.trim() && field.value.trim()) {
        payload[field.key.trim()] = field.value.trim();
      }
    }

    try {
      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/docs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": secret,
          },
          body: JSON.stringify(payload),
        });
      } else {
        const editSlug = slug ?? "";
        res = await fetch(`/api/docs/${editSlug}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": secret,
          },
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
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={baseInputCls}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Section
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as typeof section)}
            className={baseInputCls}
            disabled={isEdit}
          >
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className={baseInputCls}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={baseInputCls}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Parent folder (optional)
        </label>
        <select
          value={parentFolder}
          onChange={(e) => setParentFolder(e.target.value)}
          className={baseInputCls}
          disabled={isEdit}
        >
          <option value="">(root of section)</option>
          {availableFolders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#62666d] mt-1">
          Place this document inside an existing folder. The slug will be
          prepended with the folder path (e.g. selecting "ctf/defcon-quals-2024"
          + slug "pwn-100" → "ctf/defcon-quals-2024/pwn-100").
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          {isEdit ? "Full slug (read-only)" : "Slug (file name)"}
        </label>
        {isEdit ? (
          <input
            type="text"
            value={slug ?? ""}
            readOnly
            className="w-full px-3 py-2 bg-[#191a1b] border border-[#23252a] rounded text-[#8a8f98]"
          />
        ) : (
          <input
            type="text"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            className={baseInputCls}
            placeholder="my-document-slug"
            required
          />
        )}
        <p className="text-xs text-[#62666d] mt-1">
          Resolved path: <code>{effectiveSlug || section}</code>
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Tags
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className={baseInputCls}
          placeholder="comma, separated, tags"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={baseInputCls}
        />
      </div>

      {/* Dynamic custom fields — creators add whatever metadata they need */}
      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-2">
          Custom metadata fields
        </label>
        <p className="text-xs text-[#62666d] mb-3">
          Add extra frontmatter fields. Content creators name and define their own
          metadata here — the system auto-renders any field as a badge on the doc
          page based on its value.
        </p>
        {customFields.length > 0 && (
          <div className="space-y-3 mb-3">
            {customFields.map((field, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="field name (e.g. event)"
                  value={field.key}
                  onChange={(e) => updateCustomField(i, "key", e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
                <input
                  type="text"
                  placeholder="value"
                  value={field.value}
                  onChange={(e) => updateCustomField(i, "value", e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  className="text-xs text-[#fca5a5] hover:text-[#ff6b6b] px-2 py-1 rounded hover:bg-[#191a1b] transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addCustomField}
          className="text-xs text-[#7170ff] hover:text-[#828fff] px-3 py-1.5 rounded border border-[#5e6ad2]/30 hover:border-[#5e6ad2]/60 transition-colors"
        >
          + Add field
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Body (Markdown)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-96 px-3 py-2 bg-[#0f1011] border border-[#23252a] rounded text-[#f7f8f8] placeholder-[#62666d] font-mono text-sm focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
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
