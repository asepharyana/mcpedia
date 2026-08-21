---
title: "Nothing Here — Web Comment"
event: "GEMASTIK 2026 Warmup"
challenge: "Nothing Here"
category: "web"
points: 500
difficulty: "easy"
flag: "GEMASTIK19{v13w_s0urc3_pahlawan}"
---

# Nothing Here (500 pts) — Web

**URL:** `http://15.232.89.109:8001/`

Halaman bilang "tidak ada apa-apa" tapi flag ada di **HTML comment**:

```html
<!-- Catatan dev: jangan lupa hapus flag ini sebelum rilis: GEMASTIK19{v13w_s0urc3_pahlawan} -->
```

## Recon

```bash
curl -s http://15.232.89.109:8001/ | grep -i 'GEMASTIK\|<!--'
```

## Flag

`GEMASTIK19{v13w_s0urc3_pahlawan}`
