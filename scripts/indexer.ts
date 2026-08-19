import { db } from "@mcpedia/db";
import { documents } from "@mcpedia/db/schema";
import { parseFile } from "@mcpedia/parser";
import { CONTENT_ROOT } from "@mcpedia/config";
import { listContentFiles, indexChunks } from "@mcpedia/core";
import { join } from "node:path";

async function main() {
  const files = listContentFiles();
  let indexed = 0;
  let chunked = 0;
  for (const rel of files) {
    const abs = join(CONTENT_ROOT, rel);
    const { meta, body } = parseFile(abs, rel);
    const nowIso =
      meta.updatedAt && meta.updatedAt !== ""
        ? meta.updatedAt
        : new Date().toISOString();
    await db
      .insert(documents)
      .values({
        id: meta.id,
        slug: meta.slug,
        title: meta.title,
        type: meta.type,
        section: meta.section,
        status: meta.status,
        author: meta.author,
        tags: meta.tags,
        path: meta.path,
        body,
        createdAt: new Date(meta.createdAt || nowIso),
        updatedAt: new Date(nowIso),
      })
      .onConflictDoUpdate({
        target: documents.slug,
        set: {
          title: meta.title,
          type: meta.type,
          section: meta.section,
          status: meta.status,
          author: meta.author,
          tags: meta.tags,
          path: meta.path,
          body,
          updatedAt: new Date(nowIso),
        },
      });
    indexed++;
    console.log(`  indexed ${rel}`);

    // Phase 2: chunk + embed for semantic search.
    try {
      const n = await indexChunks(meta.slug, body);
      chunked += n;
      console.log(`    embedded ${n} chunks`);
    } catch (err) {
      console.error(
        `    embed FAILED for ${meta.slug}: ${err instanceof Error ? err.message : err}`,
      );
      // Don't abort the whole index over one doc's embedding failure.
    }
  }
  console.log(`indexed ${indexed} documents, ${chunked} chunks embedded`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
