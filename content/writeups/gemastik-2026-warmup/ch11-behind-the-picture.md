---
title: "Behind the Picture — PNG Strings"
event: "GEMASTIK 2026 Warmup"
challenge: "Behind the Picture"
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
