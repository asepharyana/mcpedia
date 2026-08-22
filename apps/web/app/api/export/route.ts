import { NextRequest, NextResponse } from "next/server";
import { getExportDocuments, compileExportMarkdown, type ExportSortOption } from "@mcpedia/core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || undefined;
  const section = searchParams.get("section") || undefined;
  const format = searchParams.get("format") || "json";
  const sortBy = (searchParams.get("sort") as ExportSortOption) || "category_points";
  const slugsParam = searchParams.get("slugs");
  const slugs = slugsParam ? slugsParam.split(",").map((s) => s.trim()) : undefined;

  try {
    const data = await getExportDocuments({
      path,
      section,
      slugs,
      sortBy,
    });

    if (format === "markdown" || format === "md") {
      const md = compileExportMarkdown(data);
      const safeFilename = data.summary.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.md"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
