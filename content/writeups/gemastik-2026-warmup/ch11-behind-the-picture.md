---
title: "Behind the Picture — PNG Strings"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "forensics"]
path: "writeups/gemastik-2026-warmup/ch11-behind-the-picture.md"
created_at: "2026-08-21T07:25:45.672Z"
updated_at: "2026-08-21T07:25:45.672Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Behind the Picture — PNG Strings"
category: "forensics"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{c4t_g4mbar_ada_flag}"
---
# Behind the Picture (500 pts) — Steganografi / PNG

**File:** `kucing.png` (cat image)

Flag disisipkan sebagai string di dalam file PNG (bisa dilihat dengan `strings`):

```bash
strings kucing.png | grep GEMASTIK
# GEMASTIK19{c4t_g4mbar_ada_flag}
```

## Flag

`GEMASTIK19{c4t_g4mbar_ada_flag}`