---
id: postgres-full-text-search
title: PostgreSQL Full-Text Search
type: documentation
tags:
  - postgres
  - fts
  - tsvector
  - search
status: published
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# PostgreSQL Full-Text Search

MCPedia's keyword search is backed by PostgreSQL's native full-text search (FTS), not
an external engine. The `documents` table carries a generated `tsvector` column that
combines the title (weight `A`) and body (weight `B`).

## Generated search vector

The column is `generatedAlwaysAs`, so it is always consistent with the row and needs
no trigger:

```ts
searchVector: tsvector("search_vector")
  .notNull()
  .generatedAlwaysAs(
    sql`setweight(to_tsvector('simple', coalesce(${documents.title}, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(${documents.body}, '')), 'B')`,
  ),
```

The `'simple'` config disables stemming, so mixed identifier/English queries (e.g.
`websocket`, `tsvector`) match literally. A GIN index on `searchVector` keeps lookups
fast.

## Query + ranking

Search parses the user query with `websearch_to_tsquery` (or `plainto_tsquery`), then
ranks with `ts_rank`:

```sql
SELECT *, ts_rank(search_vector, q) AS rank
FROM documents, websearch_to_tsquery('simple', $1) q
WHERE search_vector @@ q
ORDER BY rank DESC;
```

| Config       | Stemming | Use case                         |
| ------------ | -------- | -------------------------------- |
| `simple`     | none     | Identifiers, ports, exact codes  |
| `english`    | yes      | Natural-language body text       |
| `websearch`  | yes      | Google-like queries (`"a" OR b`) |

A headline snippet for the UI comes from `ts_headline`, which bolds the matched lexemes.

## Hybrid fusion

Semantic search (embedding cosine) and FTS are fused with **Reciprocal Rank Fusion**
(RRF) in `packages/search`. Each result set is ranked, scored `1/(k + rank)`, and the
summed scores re-rank the union — no cross-score normalization needed, which is robust
when the two signals live on different scales.
