---
title: "Slopped wave-2 — RSA Special Integers (Paper Search)"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "crypto"]
path: "writeups/gemastik-2026-warmup/ch14-slopped-wave2.md"
created_at: "2026-08-21T07:25:51.729Z"
updated_at: "2026-08-21T07:25:51.729Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Slopped wave-2 — RSA Special Integers (Paper Search)"
category: "crypto"
points: 501
difficulty: "hard"
flag: "GEMASTIK19{test_vector_of_listP_on_quant}"
---
# Slopped wave-2 (501 pts) — Crypto / RSA "special integers"

**File:** `chals.py` — Kategori: `crypto, misc`

## Challenge

```python
p = #### (hidden_length)
q = #### (hidden_length)
n = p * q
print(n)

e = 0x10001
p = bytes_to_long(b'GEMASTIK19{...}')   # flag hijacked as 'p'
c = pow(p, e, n)
print(c)
```

`c = pow(p, e, n)` dengan `p = bytes_to_long(flag)`, `e = 0x10001`, `n` 2048-bit.

## Analisis Serangan

Semua serangan standar gagal:
- **Fermat** (close primes): gap > 1.2×10^159
- **ECM**: tidak smooth (B1=43M)
- **Pollard p-1**: B=2M — tidak smooth
- **ROCA**: n mod M bukan pangkat 65537
- **Wiener / Boneh-Durfee**: e kecil berarti d besar
- **Trial division** ke 10M: bersih

### Hint "paper search"

Hint dari ch13 ("you should use paper search mcp skill") mengarah ke paper akademik.

Paper: **[Wang et al., "A First Successful Factorization of RSA-2048 Integer by D-Wave Quantum Computer (TST 2024.9010028)"](https://www.sciopen.com/article/10.26599/TST.2024.9010028)**.

Paper mendefinisikan **"special integer"**: `n = p·q` di mana kedua prima berbeda tepat 2 bit (`popcount(p XOR q) = 2`). Appendix Table S1 berisi 10 contoh (N, p, q) yang **menggunakan kembali prima yang sama** — inilah "sloppiness" wave-2: modulus challenge merekonstruksi ulang dua prima dari dua contoh berbeda.

## Solusi

Hitung `gcd(n, P_i)` untuk setiap prima `P_i` di 10 contoh paper:

```python
import math
from Crypto.Util.number import long_to_bytes

n = <2048-bit modulus from challenge>
e = 0x10001
c = <ciphertext>

# 10 contoh dari appendix paper, setiap contoh punya (p, q)
paper_examples = [...]

for ex in paper_examples:
    for P in (ex.p, ex.q):
        g = math.gcd(n, int(P))
        if 1 < g < n:
            p_factor = g
            q_factor = n // g
            break

phi = (p_factor - 1) * (q_factor - 1)
d = pow(e, -1, phi)
flag = pow(c, d, n)
print(long_to_bytes(flag))
# GEMASTIK19{test_vector_of_listP_on_quant}
```

## Flag

`GEMASTIK19{test_vector_of_listP_on_quant}`