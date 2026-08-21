---
title: "Open Book — Python Source"
event: "GEMASTIK 2026 Warmup"
challenge: "Open Book"
category: "misc"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{pyth0n_s0urc3_t3rbuka}"
---

# Open Book (500 pts) — Misc / Source

**File:** `chall.py`

Password yang benar **langsung dicetak dari array `SECRET`** (ASCII codes):

```python
SECRET = [71, 69, 77, 65, 83, 84, 73, 75, 49, 57, 123, 112, 121, 116, 104, 48, 110, 95,
          115, 48, 117, 114, 99, 51, 95, 116, 51, 114, 98, 117, 107, 97, 125]

flag = "".join(chr(c) for c in SECRET)
print(flag)
# GEMASTIK19{pyth0n_s0urc3_t3rbuka}
```

## Flag

`GEMASTIK19{pyth0n_s0urc3_t3rbuka}`
