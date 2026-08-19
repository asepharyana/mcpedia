---
id: typescript-patterns
title: TypeScript Patterns
type: note
tags:
  - typescript
  - patterns
status: published
author: asep
created_at: 2026-08-19
updated_at: 2026-08-19
---

# TypeScript Patterns

A notebook of small, reusable TypeScript patterns that keep code honest.

## Branded types for ids

```ts
type DocId = string & { readonly __brand: "DocId" };
const asDocId = (s: string) => s as DocId;
```

Branding prevents passing an arbitrary string where a document id is expected.

## Discriminated unions over inheritance

Prefer a closed set of variants with a `kind` field. Exhaustiveness checks with
`switch` catch missing cases at compile time instead of at runtime.

## Prefer composition

When two modules share behavior, extract a function. Avoid inheritance trees
that couple unrelated code. This matches the MCPedia Core principle: one layer
owns the logic, interfaces only call into it.
