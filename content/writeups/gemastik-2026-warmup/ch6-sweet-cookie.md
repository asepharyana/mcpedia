---
title: "Sweet Cookie — Base64 Cookie"
event: "GEMASTIK 2026 Warmup"
challenge: "Sweet Cookie"
category: "web"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{c00k13_b4s3_d3c0d3}"
---

# Sweet Cookie (500 pts) — Web

**URL:** `http://15.232.89.109:8002/`

Server mengirim cookie `session`. Nilainya cuma di-encode **Base64** (JSON):

```python
import base64

# Cookie value from Set-Cookie header
cookie = "eyJ1c2V..."  # nilai session cookie
decoded = base64.b64decode(cookie)
print(decoded)
# {"user": "guest", "flag": "GEMASTIK19{c00k13_b4s3_d3c0d3}"}
```

## Flag

`GEMASTIK19{c00k13_b4s3_d3c0d3}`
