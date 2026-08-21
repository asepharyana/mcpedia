"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Markdown from "./Markdown";

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

const PRESET_FIELDS = [
  { key: "difficulty", value: "medium" },
  { key: "points", value: "100" },
  { key: "category", value: "pwn" },
  { key: "event", value: "DEF CON Quals 2024" },
  { key: "solved", value: "true" },
];

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
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugInput, setSlugInput] = useState("");
  const [body, setBody] = useState(initial?.body ?? "");
  const [section, setSection] = useState(initial?.section ?? "docs");
  const [type, setType] = useState(initial?.type ?? "documentation");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [parentFolder, setParentFolder] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract existing custom fields
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>(() => {
    if (initial?.extraFields) {
      return Object.entries(initial.extraFields)
        .filter(([k, v]) => k !== "slug" && v !== undefined && v !== null)
        .map(([k, v]) => ({ key: k, value: typeof v === "string" ? v : JSON.stringify(v) }))
        .filter((f) => f.value);
    }
    return [];
  });

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const isEdit = mode === "edit";
  const effectiveSlug = isEdit
    ? (slug ?? "")
    : parentFolder
      ? `${parentFolder}/${slugInput}`.replace(/^\/+/, "").replace(/\/+/g, "/")
      : slugInput;

  const availableFolders = existingFolders?.[section] ?? [];

  const baseInputCls =
    "w-full px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--brand)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[#5e6ad2] transition-colors";

  function addCustomField(key = "", value = "") {
    setCustomFields([...customFields, { key, value }]);
  }

  function updateCustomField(index: number, field: "key" | "value", value: string) {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  }

  function removeCustomField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  function insertMarkdown(prefix: string, suffix = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = body.substring(start, end);
    const replacement = `${prefix}${selection || "text"}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
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
        <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
          Document Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. DEF CON Quals 2024 — pwn-100 Writeup"
          className={`${baseInputCls} text-base`}
          required
        />
      </div>

      {/* Section + Type + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
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

      {/* Folder + Slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Parent Folder
          </label>
          <select
            value={parentFolder}
            onChange={(e) => setParentFolder(e.target.value)}
            className={baseInputCls}
            disabled={isEdit}
          >
            <option value="">(Root of section)</option>
            {availableFolders.map((folder) => (
              <option key={folder} value={folder}>
                /{folder}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            {isEdit ? "Full Slug" : "Slug (File name) *"}
          </label>
          {isEdit ? (
            <input
              type="text"
              value={slug ?? ""}
              readOnly
              className="w-full px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-muted)] font-mono"
            />
          ) : (
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              className={`${baseInputCls} font-mono`}
              placeholder="my-new-post"
              required
            />
          )}
          <p className="text-[11px] text-[var(--text-dim)] mt-1 font-mono">
            Path: <span className="text-[#5e6ad2] dark:text-[#7170ff]">{effectiveSlug || section}</span>
          </p>
        </div>
      </div>

      {/* Tags + Author */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={baseInputCls}
            placeholder="ctf, pwn, reverse, tutorial"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Author
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={baseInputCls}
            placeholder="asep"
          />
        </div>
      </div>

      {/* Custom Metadata Fields */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Dynamic Custom Metadata
            </h3>
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
              Add custom key-values (event, difficulty, points, etc.) rendered as styled badges.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[var(--text-dim)]">Presets:</span>
            {PRESET_FIELDS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => addCustomField(preset.key, preset.value)}
                className="px-2 py-0.5 text-[11px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
              >
                +{preset.key}
              </button>
            ))}
          </div>
        </div>

        {customFields.map((field, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Field name (e.g. event)"
              value={field.key}
              onChange={(e) => updateCustomField(i, "key", e.target.value)}
              className={`${baseInputCls} text-xs font-mono`}
            />
            <input
              type="text"
              placeholder="Value (e.g. DEF CON 2024)"
              value={field.value}
              onChange={(e) => updateCustomField(i, "value", e.target.value)}
              className={`${baseInputCls} text-xs font-mono`}
            />
            <button
              type="button"
              onClick={() => removeCustomField(i)}
              className="p-2 text-rose-500 hover:text-rose-600 rounded hover:bg-[var(--bg-elevated)] transition-colors"
              title="Remove field"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addCustomField()}
          className="text-xs text-[#5e6ad2] dark:text-[#7170ff] hover:underline px-3 py-1.5 rounded-lg border border-[#5e6ad2]/30 hover:border-[#5e6ad2]/60 bg-[#5e6ad2]/5 transition-colors font-medium"
        >
          + Add Custom Field
        </button>
      </div>

      {/* Body with Write / Preview Tabs */}
      <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-color)] flex-wrap gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === "write"
                  ? "bg-[#5e6ad2] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === "preview"
                  ? "bg-[#5e6ad2] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Live Preview
            </button>
          </div>

          {/* Markdown Action Shortcuts */}
          {activeTab === "write" && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <button
                type="button"
                onClick={() => insertMarkdown("**", "**")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Bold"
              >
                <b>B</b>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("*", "*")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Italic"
              >
                <i>I</i>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("## ")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("```\n", "\n```")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono"
                title="Code Block"
              >
                {"</>"}
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("[", "](https://)")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Link"
              >
                Link
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("> [!NOTE]\n> ")}
                className="px-2 py-0.5 hover:bg-[var(--bg-surface)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Note Callout"
              >
                Note
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-96 p-4 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-dim)] font-mono text-sm focus:outline-none resize-y leading-relaxed"
            placeholder="# Write your markdown document here..."
            required
          />
        ) : (
          <div className="p-6 h-96 overflow-y-auto bg-[var(--bg-app)]">
            {body.trim() ? (
              <Markdown source={body} />
            ) : (
              <p className="text-xs text-[var(--text-dim)] italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#5e6ad2] hover:bg-[#6a75e0] text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-[#5e6ad2]/20 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{loading ? "Saving document..." : mode === "create" ? "Create Document" : "Save Changes"}</span>
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 border border-[var(--border-color)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-lg text-sm transition-colors shadow-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
