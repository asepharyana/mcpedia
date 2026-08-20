import { WEBHOOK_SECRET } from "@mcpedia/config";
import { cookies } from "next/headers";
import DocForm from "@/components/DocForm";
import Link from "next/link";

// GET /create — show the document create form.
// Requires admin cookie auth.
export default async function CreatePage() {
  const cookieStore = await cookies();
  const canEdit = cookieStore.get("mcpedia_admin")?.value != null;
  if (!canEdit) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-light text-[#f7f8f8] mb-4">
          Authentication required
        </h1>
        <p className="text-[#8a8f98] mb-6">
          You must be logged in to create documents.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#5e6ad2] text-white hover:bg-[#7170ff] transition-colors font-medium text-sm"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] mb-4 inline-block"
      >
        ← Back
      </Link>
      <h1 className="text-2xl font-light text-[#f7f8f8] mb-6">
        Create Document
      </h1>
      <DocForm mode="create" secret={WEBHOOK_SECRET} />
    </div>
  );
}
