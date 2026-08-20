import { WEBHOOK_SECRET } from "@mcpedia/config";
import { cookies } from "next/headers";
import DocForm from "@/components/DocForm";
import Link from "next/link";

// GET /create — show the document creation form.
// Auth: requires the mcpedia_admin cookie (set via /api/auth/login).
export const dynamic = "force-dynamic";

export default async function CreateDocPage() {
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;

  if (!canEdit) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <h1 className="text-xl font-semibold mb-4">Authentication required</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          You must be logged in to create documents.
        </p>
        <Link
          href="/login"
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Create Document</h1>
      <DocForm mode="create" slug="" secret={WEBHOOK_SECRET} />
    </div>
  );
}
