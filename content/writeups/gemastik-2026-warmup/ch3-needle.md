---
title: "Needle — Strings Binary"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "forensics"]
path: "writeups/gemastik-2026-warmup/ch3-needle.md"
created_at: "2026-08-21T07:25:23.053Z"
updated_at: "2026-08-21T07:25:23.053Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Needle — Strings Binary"
category: "forensics"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{str1ngs_c4n_f1nd_m3}"
---
# Needle (500 pts) — Steganografi / Binary

**File:** `secret.bin` (748 bytes, binary)

Teks tersembunyi di antara "junk data". Cukup ekstrak **strings** yang printable:

```bash
strings secret.bin | grep GEMASTIK
# GEMASTIK19{str1ngs_c4n_f1nd_m3}
```

## Flag

`GEMASTIK19{str1ngs_c4n_f1nd_m3}`