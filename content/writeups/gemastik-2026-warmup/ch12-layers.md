---
title: "Layers — Hex to Base64 Chain"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "crypto"]
path: "writeups/gemastik-2026-warmup/ch12-layers.md"
created_at: "2026-08-21T07:25:48.559Z"
updated_at: "2026-08-21T07:25:48.559Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Layers — Hex to Base64 Chain"
category: "crypto"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{h3x_lQlu_b4s3_ch41n}"
---
# Layers (500 pts) — Encoding chain

**File:** `chall.txt` → `5230564e51564e55535573784f58746f4d33686662464673645639694e484d7a58324e6f4e44467566513d3d`

Dua lapis encoding berturut-turut: **Hex → bytes → Base64 → flag**:

```python
import base64

s = "5230564e51564e55535573784f58746f4d33686662464673645639694e484d7a58324e6f4e44467566513d3d"

# Layer 1: hex decode
b = bytes.fromhex(s)
# b = b'R0VNQVNUSUsxOXtoM3hfbFFsdV9iNHMzX2NoNDFufQ=='

# Layer 2: base64 decode
flag = base64.b64decode(b).decode()
print(flag)
# GEMASTIK19{h3x_lQlu_b4s3_ch41n}
```

## Flag

`GEMASTIK19{h3x_lQlu_b4s3_ch41n}`