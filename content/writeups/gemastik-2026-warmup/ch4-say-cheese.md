---
title: "Say Cheese — EXIF Metadata"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "forensics"]
path: "writeups/gemastik-2026-warmup/ch4-say-cheese.md"
created_at: "2026-08-21T07:25:25.953Z"
updated_at: "2026-08-21T07:25:25.953Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Say Cheese — EXIF Metadata"
category: "forensics"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{h1dd3n_1n_m3tadata_exif}"
---
# Say Cheese (500 pts) — Steganografi / Metadata

**File:** `photo.jpg`

Flag disimpan di **metadata EXIF** foto. Cek dengan `exiftool` / `strings`:

```bash
strings photo.jpg | grep GEMASTIK
# GEMASTIK19{h1dd3n_1n_m3tadata_exif}
```

## Flag

`GEMASTIK19{h1dd3n_1n_m3tadata_exif}`