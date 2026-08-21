---
title: "Slopped wave-2 — RSA Special Integers (Paper Search)"
event: "GEMASTIK 2026 Warmup"
challenge: "Slopped wave-2"
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
- **Fermat** (close primes): gap > 1.2×10^159 — tidak dekat secara praktis
- **ECM**: tidak smooth (B1=43M, nihil)
- **Pollard p-1**: B=2M — tidak smooth
- **ROCA**: n mod M bukan pangkat 65537
- **Wiener / Boneh-Durfee**: e kecil (0x10001) berarti d besar — tidak berlaku
- **Trial division** ke 10M: bersih (bukan multi-prime)

### Hint "paper search"

Hint eksplisit dari ch13 (`"you should use paper search mcp skill"`) mengarah ke paper akademik.

Paper yang relevan: **[Wang et al., "A First Successful Factorization of RSA-2048 Integer by D-Wave Quantum Computer (TST 2024.9010028)"](https://www.sciopen.com/article/10.26599/TST.2024.9010028)**.

Paper ini mendefinisikan **"special integer"**: `n = p·q` di mana kedua prima berbeda tepat 2 bit (`popcount(p XOR q) = 2`). Appendix Table S1 berisi 10 contoh (N, p, q) yang **menggunakan kembali prima yang sama** antar contoh — inilah "sloppiness" wave-2: modulus challenge merekonstruksi ulang dua prima dari dua contoh berbeda di appendix.

## Solusi

Hitung `gcd(n, P_i)` untuk setiap prima `P_i` di 10 contoh paper:

```python
import math
from Crypto.Util.number import long_to_bytes

n = 28008898425919767630332240934016276847924805525333217832404897947939103243228972949689513688955395487968105401754937723676103157272878536809483382015109837719541333211960013523138011299545412216542446898013570476597785252956981469063935184717524421577877037626388887985915635397261217075246374491338340106204849124995802924309176528247377448309316812175371342529226561406684704206313325372391401376525872603885844315712974699164527709628131245457234730287027706472707938221683437608563129965135750890436839304592772934403034714971464599323432155893639517684854753638679922411688807574449220671893390148747041517238337

e = 0x10001
c = 0x...  # dari challenge

# Dari appendix paper: 10 contoh, setiap contoh punya p & q
paper_examples = [
    # (p_i, q_i) — faktor dari 10 contoh paper
    ... 
]

for ex in paper_examples:
    for P in (ex.p, ex.q):
        g = math.gcd(n, int(P))
        if 1 < g < n:
            p_factor = g
            q_factor = n // g
            print(f"Found factor via GCD with paper prime!")
            break

phi = (p_factor - 1) * (q_factor - 1)
d = pow(e, -1, phi)
flag = pow(c, d, n)
print(long_to_bytes(flag))
# GEMASTIK19{test_vector_of_listP_on_quant}
```

## Flag

`GEMASTIK19{test_vector_of_listP_on_quant}`
