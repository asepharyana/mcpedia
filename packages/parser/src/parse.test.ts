import { test, expect, afterEach, beforeEach } from "bun:test";
// parseFile uses node:fs, so we test it by writing a temp file. This keeps the
// parser package dependency-free while still exercising gray-matter.
import { parseFile } from "../src/index";
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcpedia-parser-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeDoc(rel: string, frontmatter: string) {
  const p = join(tmp, rel);
  // Ensure the parent directory exists (sections like docs/, writeups/).
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, frontmatter, "utf8");
  return parseFile(p, rel);
}

test("parseFile: extracts basic frontmatter", () => {
  const { meta, body } = writeDoc(
    "docs/test.md",
    [
      "---",
      'id: test-doc',
      'title: Test Document',
      'type: documentation',
      'tags: ["docs", "test"]',
      'status: published',
      'author: asep',
      'created_at: 2026-08-19',
      'updated_at: 2026-08-19',
      "---",
      "",
      "# Hello",
      "Body text here.",
    ].join("\n"),
  );
  expect(meta.slug).toBe("docs/test");
  expect(meta.section).toBe("docs");
  expect(meta.title).toBe("Test Document");
  expect(meta.type).toBe("documentation");
  expect(meta.status).toBe("published");
  expect(meta.author).toBe("asep");
  expect(meta.tags).toEqual(["docs", "test"]);
  expect(body).toContain("# Hello");
});

test("parseFile: section derived from top-level dir", () => {
  expect(writeDoc("writeups/foo.md", "---\ntitle: A\n---\nbody").meta.section).toBe("writeups");
  expect(writeDoc("research/bar.md", "---\ntitle: B\n---\nbody").meta.section).toBe("research");
  expect(writeDoc("notes/baz.md", "---\ntitle: C\n---\nbody").meta.section).toBe("notes");
});

test("parseFile: invalid type/status fall back to defaults", () => {
  const { meta } = writeDoc(
    "docs/x.md",
    "---\ntitle: X\ntype: bogus\nstatus: bogus\n---\n",
  );
  expect(meta.type).toBe("documentation");
  expect(meta.status).toBe("published");
});

test("parseFile: missing optional fields get sane defaults", () => {
  const { meta } = writeDoc("docs/x.md", "---\ntitle: Just A Title\n---\n");
  expect(meta.author).toBe("");
  expect(meta.tags).toEqual([]);
  expect(meta.createdAt).toBeTruthy();
  expect(meta.updatedAt).toBeTruthy();
});

test("parseFile: body excludes frontmatter delimiter", () => {
  const { body } = writeDoc("docs/x.md", "---\ntitle: T\n---\n# Real body\n\nParagraph.");
  expect(body).not.toContain("---");
  expect(body).toContain("# Real body");
});
