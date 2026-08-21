import { listDocuments, extractFoldersForSection } from "@mcpedia/core";
import { SECTIONS } from "@mcpedia/config/sections";
import { WEBHOOK_SECRET } from "@mcpedia/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DocForm from "@/components/DocForm";

export default async function CreatePage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("mcpedia_admin")?.value != null;
  if (!isAdmin) redirect("/login");

  const all = await listDocuments();
  const docPaths = all.map((d) => d.path);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">✏️</span>
        <h1 className="text-2xl font-medium text-[#f7f8f8]">Create Document</h1>
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
