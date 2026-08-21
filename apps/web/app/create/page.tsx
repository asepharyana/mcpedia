import Link from "next/link";
import { listDocuments, extractFoldersForSection } from "@mcpedia/core";
import { SECTIONS } from "@mcpedia/config/sections";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DocForm from "@/components/DocForm";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("mcpedia_admin")?.value != null;
  if (!isAdmin) redirect("/login");

  const all = await listDocuments();
  const docPaths = all.map((d) => d.path);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
          MCPedia
        </Link>
        <span>/</span>
        <span className="text-[var(--text-muted)] font-medium">Create Document</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center text-xl text-[#5e6ad2] dark:text-[#7170ff]">
            ✏️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Create Document</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Writes markdown file to disk, records revision, and computes 2048-dim vector embeddings.
            </p>
          </div>
        </div>
      </div>

      <DocForm
        mode="create"
        secret={WEBHOOK_SECRET}
        existingFolders={Object.fromEntries(
          SECTIONS.map((s) => [s.id, extractFoldersForSection(docPaths, s.id)])
        )}
      />
    </div>
  );
}
