---
title: "Julius — ROT13 Caesar Cipher"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "crypto"]
path: "writeups/gemastik-2026-warmup/ch2-julius.md"
created_at: "2026-08-21T07:25:20.120Z"
updated_at: "2026-08-21T07:25:20.120Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Julius — ROT13 Caesar Cipher"
category: "crypto"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{caesar_r0t_th1rt33n_klasik}"
---
# Julius (500 pts) — Caesar / ROT13

**File:** `chall.txt` → `TRZNFGVX19{pnrfne_e0g_gu1eg33a_xynfvx}`

Caesar cipher dengan pergeseran paling populer di internet = **ROT13** (geser 13).
`TRZNFGVX19` → `GEMASTIK19`, dst.

```python
import codecs

s = "TRZNFGVX19{pnrfne_e0g_gu1eg33a_xynfvx}"
flag = codecs.encode(s, "rot_13")
print(f"Flag: {flag}")
# Output: GEMASTIK19{caesar_r0t_th1rt33n_klasik}
```

## Flag

`GEMASTIK19{caesar_r0t_th1rt33n_klasik}`