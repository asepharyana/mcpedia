---
title: "GEMASTIK 2026 Warmup — All Chapters"
event: "GEMASTIK 2026 Warmup"
category: "index"
points: 0
difficulty: "index"
---

# GEMASTIK 2026 Warmup — Chapter Index (ch1–ch14)

**Platform:** [Warmup GEMASTIK 2026](https://warmup-cybersecurity.apps.binus.ac.id) (CTFd)
**Status:** 14/14 solved — 7001 points (13×500 + 1×501)

| # | Challenge | Category | Diff | Flag |
|---|-----------|----------|------|------|
| 1 | Sixty Four | Encoding | easy | `GEMASTIK19{b4s3_s1xty_f0ur_warm1ng_up}` |
| 2 | Julius | Caesar/ROT13 | easy | `GEMASTIK19{caesar_r0t_th1rt33n_klasik}` |
| 3 | Needle | Forensics/strings | easy | `GEMASTIK19{str1ngs_c4n_f1nd_m3}` |
| 4 | Say Cheese | EXIF metadata | easy | `GEMASTIK19{h1dd3n_1n_m3tadata_exif}` |
| 5 | Nothing Here | Web comment | easy | `GEMASTIK19{v13w_s0urc3_pahlawan}` |
| 6 | Sweet Cookie | Web/cookie | easy | `GEMASTIK19{c00k13_b4s3_d3c0d3}` |
| 7 | Open Book | Source | easy | `GEMASTIK19{pyth0n_s0urc3_t3rbuka}` |
| 8 | Back and Forth | XOR | easy | `GEMASTIK19{x0r_it_back_4gain}` |
| 9 | Are You Admin? | Pwn/bof | easy | `GEMASTIK19{0v3rfl0w_ubah_var}` |
| 10 | Call Me | Pwn/ret2win | easy | `GEMASTIK19{r3t2w1n_l0mpat_k3_win}` |
| 11 | Behind the Picture | PNG stego | easy | `GEMASTIK19{c4t_g4mbar_ada_flag}` |
| 12 | Layers | Hex→B64 chain | easy | `GEMASTIK19{h3x_lQlu_b4s3_ch41n}` |
| 13 | Slopped | RSA small factors | medium | `GEMASTIK19{qu4ntum_c0mput3r_br0k3_rs4_y0u_sh0uld_us3_p4p3r_s34rch_mcp_sk1ll}` |
| 14 | Slopped wave-2 | RSA paper search | hard | `GEMASTIK19{test_vector_of_listP_on_quant}` |

## Ringkasan Metode

| Ch | Metode | Tool |
|----|--------|------|
| 1 | Double Base64 | `base64 -d` ×2 |
| 2 | ROT13 Caesar | `codecs.encode(s, "rot_13")` |
| 3 | strings | `strings secret.bin` |
| 4 | EXIF metadata | `strings photo.jpg` |
| 5 | HTML comment | `curl \| grep '<!--'` |
| 6 | Base64 cookie | `base64 -d` |
| 7 | ASCII codes | chr() decoding |
| 8 | Single-byte XOR | XOR 0x42 |
| 9 | Stack overflow | buffer > admin |
| 10 | ret2win + align | ROP chain |
| 11 | PNG strings | `strings kucing.png` |
| 12 | Hex→Base64 | `bytes.fromhex` + `b64decode` |
| 13 | RSA small factors | trial division / sympy factorint |
| 14 | RSA special integers | GCD with paper appendix primes |
