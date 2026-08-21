---
title: "Julius — ROT13 Caesar Cipher"
event: "GEMASTIK 2026 Warmup"
challenge: "Julius"
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
