# Phase 15 — UI/UX Polish Pass

> User: "perbagus ui ux nya"

## Audit

### Current issues
1. **Section index** (`[section]/page.tsx`):
   - `buildFolderTree` uses path segments instead of doc titles for leaf nodes
   - Folder tree + flat list at bottom is redundant
   - No folder icons (📁), no doc type indicators, no dates
   - Tree rendering is very basic (no visual hierarchy)

2. **Doc page** (`[section]/[...slug]/page.tsx`):
   - CustomFieldBadges shows key=value but labels all badges with key name as title
   - No structured metadata card layout
   - Related docs cards are functional but visually flat

3. **Folder index** (`FolderIndexPage` in `[...slug]/page.tsx`):
   - Shows doc slug parts (e.g. "pwn-100-ret2win-alignment") instead of titles
   - No date, no tags, no description
   - Subfolders are plain text links, no folder count or doc count

4. **Homepage** (`page.tsx`):
   - Folder tree inside cards is cramped (text-xs, no spacing)
   - Section cards show "View all (N)" but folder tree duplicates that

5. **Sidebar** (`Sidebar.tsx`):
   - Tree uses indentation via inline style but no visual depth cues
   - No hover expand for folders
   - Active state only on exact match, not parent folders

## Plan

### 1. Section index — enhanced tree
- Use doc titles for leaf nodes (already have `doc` reference in tree)
- Add 📁 for folders, 📄 for docs
- Show doc count per folder
- Remove flat list (redundant with tree)
- Add "View all" link per section
- Better visual hierarchy: folder headers with counts, doc titles with dates

### 2. Doc page — metadata card
- Replace inline badge row with a structured metadata card
- Show custom fields as labeled badges (key → value with color)
- Keep CustomFieldBadges for backward compat but improve layout
- Add metadata card with: author, date, tags, and all custom fields

### 3. Folder index — rich listing
- Show doc titles (fetch from listDocuments, match by path)
- Show update date per doc
- Show tags per doc
- Add doc count for subfolders
- Better visual separation between subfolders and docs

### 4. Homepage — cleaner tree
- Increase font size for tree items
- Show section icon + label in tree header
- Better spacing between sections

### 5. Sidebar — depth cues
- Use ml-4 per level instead of inline style
- Add section divider lines
- Highlight active section + parent folders

## Files to change
```
mod: apps/web/app/[section]/page.tsx          # enhanced tree, use doc titles
mod: apps/web/app/[section]/[...slug]/page.tsx # FolderIndexPage + metadata card
mod: apps/web/app/page.tsx                    # cleaner section tree cards
mod: apps/web/app/components/Sidebar.tsx       # depth + active parent highlight
mod: apps/web/app/globals.css                 # additional CSS vars if needed
```

## Verification
- All endpoints still 200
- `bun run test` green
- `turbo run typecheck` green
- `next build` succeeds
- Live visual check of folder index, section index, doc page
