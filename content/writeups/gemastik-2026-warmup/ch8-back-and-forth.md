---
title: "Back and Forth — XOR"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "reverse"]
path: "writeups/gemastik-2026-warmup/ch8-back-and-forth.md"
created_at: "2026-08-21T07:25:37.394Z"
updated_at: "2026-08-21T07:25:37.394Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Back and Forth — XOR"
category: "reverse"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{x0r_it_back_4gain}"
---
# Back and Forth (500 pts) — Reversing / XOR

**File:** `chall.c`

Flag di-XOR dengan kunci 1-byte `0x42`. Balikkan dengan XOR lagi:

```python
enc = [0x05, 0x07, 0x0f, 0x03, 0x11, 0x16, 0x0b, 0x09, 0x73, 0x7b, 0x39, 0x3a,
       0x72, 0x30, 0x1d, 0x2b, 0x36, 0x1d, 0x20, 0x23, 0x21, 0x29, 0x1d, 0x76,
       0x25, 0x23, 0x2b, 0x2c, 0x3f]

flag = "".join(chr(b ^ 0x42) for b in enc)
print(flag)
# GEMASTIK19{x0r_it_back_4gain}
```

## Flag

`GEMASTIK19{x0r_it_back_4gain}`