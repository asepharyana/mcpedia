---
id: ctf-writeup-template
title: "CTF Writeup Template — How to Structure a Challenge Writeup"
type: writeup
tags:
  - ctf
  - template
  - methodology
status: draft
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# CTF Writeup Template

A consistent writeup structure helps reviewers and future-you reproduce the solve.
Below is the recommended template. Delete this intro paragraph and fill each
section.

## Challenge Info

| Field        | Value                |
| ------------ | -------------------- |
| **Event**    | `[Event Name]`       |
| **Challenge**| `[Challenge Name]`   |
| **Category** | `pwn` / `crypto` / `web` / `rev` / `forensics` / `misc` |
| **Difficulty**| `easy` / `medium` / `hard` |
| **Points**   | `[points at start]`  |
| **Solves**   | `[number]`           |

## Initial Recon

What you see when you download the binary/file/URL. File type, basic
inspection (`file`, `strings`, `checksec`, HTTP headers, etc.).

## Approach

Describe the high-level idea — what class of vulnerability or attack this
belongs to.

## Step-by-Step Solve

Walk through each step with commands and output. Include:

- Exact commands you ran
- Key output (truncated if long, but enough to confirm)
- Why each step works
- Tool versions / versions if relevant

### 1. Enumerate

```
$ command-here
output-here
```

### 2. Find the vulnerability

Explain what you found and how it maps to the approach.

### 3. Craft the exploit

Show the exploit script or payload, explain each part.

## Flag

```
flag{...}
```

## Summary

What you learned, what the intended solution was (if yours differed),
and any pitfalls you hit along the way (e.g., "tool X version Y breaks
on Z").
