---
title: "Say Cheese — EXIF Metadata"
event: "GEMASTIK 2026 Warmup"
challenge: "Say Cheese"
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
