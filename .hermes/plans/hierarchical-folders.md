# Phase 14 — Hierarchical Folder Structure

> User: "gk ada bedanya, maksud saya inginnya itu bisa yg bertingkat seperti github yg memiliki folder dalam folder"
> Context: after the full dynamic-custom-fields overhaul (Phase 13), the user
> wants document URLs/content organized in **nested folders** like GitHub —
> `writeups/ctf/defcon-quals-2024/pwn-100/...` with subfolders under subfolders,
> not just one level deep.

## Problem

The current URL scheme is `/<section>/<slug>` where `slug` can contain `/`
(e.g. `writeups/ctf/defcon-quals-2024/pwn-100-ret2win-alignment` →
`/writeups/ctf/defcon-quals-2024/pwn-100-ret2win-alignment`). This works for
**files** but there are no **folder-level index pages** — navigating to
`/writeups/ctf/defcon-quals-2024/` returns 404 because Next.js catch-all
`[section]/[...slug]/page.tsx` requires at least one slug segment beyond the
section, and the sidebar only shows flat doc titles (no folder tree).

GitHub's model: `github.com/org/repo/tree/main/path/to/folder/file` — every
folder has an index page (`/path/to/folder/`) listing its contents.

## Solution

### 1. Folder Index Pages

**Create `apps/web/app/[section]/[...slug]/folder.tsx`** (or a parallel route).
Actually — cleaner approach per Next.js App Router: the catch-all
`[section]/[...slug]/page.tsx` handles both. Add logic: if the slug resolves to
an actual markdown file → doc page (existing behavior). If the slug resolves to
a **directory** (folder of docs) → render a folder index listing all docs whose
`path` starts with that prefix.

**Mechanism:**
- Call `listDocuments()` to get all docs.
- The incoming URL path is `{section}/{...slug}`.
- Build the "folder prefix" = `${section}/${slug.join("/")}/` (with trailing `/`,
  or just `${section}/${slug.join("/")}` if no slug segments).
- Filter docs whose `doc.path` starts with that prefix.
- If exactly one doc matches AND its path === prefix (trimmed .md) → it's a
  doc page (existing). If zero or multiple match and they all start with the
  prefix → it's a folder index.
- Edge: a folder with exactly one doc whose path matches exactly — still a doc
  page. A folder is when there are docs at `prefix/sub/...`.

**Better heuristic:** A slug path is a "folder" if there exist docs whose `path`
is `prefix/deep/...` (i.e., the slug is a parent of other doc paths, not a
leaf itself). A slug is a "leaf doc" if `path === prefix + ".md"`.

### 2. Sidebar Tree

**Update `Sidebar.tsx`:**
- `listDocuments()` already returns all docs with their full `slug` and `path`.
- Build a **tree** from the flat list: split each slug by `/`, create nested
  folder nodes.
- Render nested `<ul>` with indentation (already done via `marginLeft` based on
  depth).
- **Folder nodes** (collapsed/expanded) get a folder icon 📁 and a CSS class.
- Clicking a folder → navigates to the folder index page `/{section}/{path}`.
- **Leaf doc nodes** → link to `/{doc.slug}` (existing behavior).
- Group by the first segment after section too (e.g. `ctf/defcon-quals-2024/`
  is a folder, then `pwn-100-...` are children).

Tree-building algorithm (from flat slugs):
```
For slug "writeups/ctf/defcon-quals-2024/pwn-100-ret2win-alignment":
  parts = ["writeups", "ctf", "defcon-quals-2024", "pwn-100-ret2win-alignment"]
  → tree: writeups → ctf → defcon-quals-2024 → pwn-100-ret2win-alignment (leaf)
```

### 3. DocForm / Folder Selection

**Update `DocForm.tsx`:**
- Add a "Parent folder" input (autocomplete or text) that shows existing folders
  for the selected section. The slug field already supports `/` but the user
  experience is better with folder picker.
- When creating, the slug becomes `{parentFolder}/{slug}` automatically.
- Show existing folder structure as `<select>` or tree picker.

### 4. Example Hierarchy

Create a real hierarchical structure to demonstrate:
```
writeups/
  ctf/
    defcon-quals-2024/
      pwn/
        pwn-100-ret2win-alignment.md
        pwn-200-bof-heap.md
      crypto/
        crypto-100-xor.md
        crypto-200-rsa.md
      template/
        writeup-template.md
      _index.md              ← folder index (optional intro)
    hackthebox/
      machine-name/
        walkthrough.md
```

For now, reorganize the existing Defcon writeup into proper subfolders + add a
folder index page. The existing `content/writeups/ctf/defcon-quals-2024/` is
already a folder — just need the folder index route to work.

### 5. Route Changes

**Current:** `[section]/[...slug]/page.tsx` — catch-all requires ≥1 slug segment.
- `/writeups` → `notFound()` (no index for bare section unless we add one)
- `/writeups/ctf` → catch-all gets `slug=["ctf"]` → currently treated as a doc
  (looks up `writeups/ctf` doc, 404 if none)
- `/writeups/ctf/defcon-quals-2024/` → catch-all `slug=["ctf","defcon-quals-2024"]`

**Plan:**
1. Add `/writeups/page.tsx` (section index) — lists top-level folders + root
   docs in that section. (Currently `/docs/page.tsx` exists but `/writeups/page.tsx`
   doesn't.)
2. In `[section]/[...slug]/page.tsx`: at the top of the page component, check if
   the slug path is a folder (has child docs). If so, render folder index instead
   of doc page.

**Section index pages:** Create `[section]/page.tsx` for all 4 sections, or a
generic one. Currently only `/docs/page.tsx` exists. Add a shared
`SectionIndex` component.

### 6. Files to Change

```
new:    apps/web/app/[section]/page.tsx               # generic section index (folder + doc listing)
mod:    apps/web/app/[section]/[...slug]/page.tsx     # add folder-index detection
mod:    apps/web/app/components/Sidebar.tsx            # tree from flat slugs
mod:    apps/web/app/components/DocForm.tsx            # parent folder picker
new:    content/writeups/ctf/defcon-quals-2024/_index.md  # folder intro (optional)
new:    content/writeups/ctf/_index.md                # CTF section intro
mod:    apps/web/app/docs/page.tsx                    # may need generic version
```

### 7. Verification

- `/writeups` → 200, shows folders: ctf/, template/
- `/writeups/ctf` → 200, folder index listing defcon-quals-2024/
- `/writeups/ctf/defcon-quals-2024` → 200, folder index listing pwn-100-...
- `/writeups/ctf/defcon-quals-2024/pwn-100-ret2win-alignment` → 200, doc page
- Sidebar shows nested tree with folder icons
- DocForm parent folder picker works
- `bun run test` green, `turbo run typecheck` green
- Live verification via curl

## Constraints
- User: "pastikan semua dinamis dan rapih untuk banyak situasi jadi tergantung
  user bukan hardcode" — folder detection must be content-driven, not config.
- No breaking existing flat slugs.
- Section icons/labels stay the same.
