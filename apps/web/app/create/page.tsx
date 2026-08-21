import { listDocuments, extractFoldersForSection } from "@mcpedia/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DocForm from "@/components/DocForm";
import { WEBHOOK_SECRET } from "@mcpedia/config";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;
  if (!canEdit) redirect("/login");

  const allDocs = await listDocuments();
  const docPaths = allDocs.map((d) => d.path);

  // Build folder suggestions per section using the shared core helper
  const sections = ["docs", "writeups", "research", "notes"];
  const foldersBySection: Record<string, string[]> = {};
  for (const sec of sections) {
    foldersBySection[sec] = extractFoldersForSection(docPaths, sec);
  }

  return (
    <div>
      <h1 className="text-3xl font-medium text-[#f7f8f8] mb-6">Create Document</h1>
      <DocForm
        mode="create"
        secret={WEBHOOK_SECRET}
        existingFolders={foldersBySection}
      />
    </div>
  );
}
