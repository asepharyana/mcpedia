---
title: "Needle — Strings Binary"
event: "GEMASTIK 2026 Warmup"
challenge: "Needle"
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
