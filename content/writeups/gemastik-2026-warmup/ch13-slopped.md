---
title: "Slopped — RSA Small Factors"
event: "GEMASTIK 2026 Warmup"
challenge: "Slopped"
category: "crypto"
points: 500
difficulty: "medium"
flag: "GEMASTIK19{qu4ntum_c0mput3r_br0k3_rs4_y0u_sh0uld_us3_p4p3r_s34rch_mcp_sk1ll}"
---

# Slopped (500 pts) — Crypto / RSA small factors

**File:** `chall.py`

```python
import random
p = random.randint(1, 10**4)   # tiny prime candidates
q = random.randint(1, 10**4)
# ... find small primes, multiply
n = p * q * (big prime)
e = 0x10001
c = pow(flag, e, n)
```

## Analisis

RSA dengan `e = 0x10001`, `n` 2048-bit, `c = pow(flag, e, n)`.
`n` dibangun dari **faktor prima kecil** (sloppy primes — "my AI broke RSA with 1 billion qubits"). Faktorisasi temukan prima kecil lewat trial division, lalu `phi = prod(p_i - 1)`, `d = e⁻¹ mod phi`, dan `m = pow(c, d, n)`.

## Solusi

```python
from Crypto.Util.number import long_to_bytes
from sympy import factorint

e = 0x10001
n = 0xdb...  # 2048-bit modulus
c = 0x...

# Trial division menemukan faktor kecil
factors = factorint(n)
print(factors)
# {83: 1, 233: 1, 9679: 1, <big_prime>: 1}

phi = 1
for p, exp in factors.items():
    phi *= (p - 1) * p**(exp - 1)

d = pow(e, -1, phi)
m = pow(c, d, n)
print(long_to_bytes(m))
# GEMASTIK19{qu4ntum_c0mput3r_br0k3_rs4_y0u_sh0uld_us3_p4p3r_s34rch_mcp_sk1ll}
```

## Flag

`GEMASTIK19{qu4ntum_c0mput3r_br0k3_rs4_y0u_sh0uld_us3_p4p3r_s34rch_mcp_sk1ll}`

> Flag ini adalah petunjuk untuk ch14 ("you should use paper search").
