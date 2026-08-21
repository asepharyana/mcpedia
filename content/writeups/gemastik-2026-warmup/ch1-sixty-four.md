---
title: "Sixty Four — Double Base64"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "crypto"]
path: "writeups/gemastik-2026-warmup/ch1-sixty-four.md"
created_at: "2026-08-21T07:25:17.079Z"
updated_at: "2026-08-21T07:25:17.079Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Sixty Four — Double Base64"
category: "crypto"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{b4s3_s1xty_f0ur_warm1ng_up}"
---
# Sixty Four (500 pts) — Encoding

**File:** `chall.txt` → `UjBWTlFWTlVTVXN4T1h0aU5ITXpYM014ZUhSNVgyWXdkWEpmZDJGeWJURnVaMTkxY0gwPQ==`

Teks di-encode **Base64 dua kali** (hint: "sixty four" = base64). Decode berlapis:

```bash
$ echo "UjBWTlFWTlVTVXN4T1h0aU5ITXpYM014ZUhSNVgyWXdkWEpmZDJGeWJURnVaMTkxY0gwPQ==" | base64 -d
R0VNQVNUSUsxOXtiNHMzX3MxeHR5X2YwdXJfd2FybTFuZ191cH0=
$ echo "R0VNQVNUSUsxOXtiNHMzX3MxeHR5X2YwdXJfd2FybTFuZ191cH0=" | base64 -d
GEMASTIK19{b4s3_s1xty_f0ur_warm1ng_up}
```

## Solusi Python

```python
import base64

with open("chall.txt") as f:
    s = f.read().strip()

# First base64 decode
decoded1 = base64.b64decode(s)
# Second base64 decode
flag = base64.b64decode(decoded1).decode()

print(f"Flag: {flag}")
# Output: GEMASTIK19{b4s3_s1xty_f0ur_warm1ng_up}
```

## Flag

`GEMASTIK19{b4s3_s1xty_f0ur_warm1ng_up}`