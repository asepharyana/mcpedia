---
id: bullmq-workers
title: BullMQ Background Workers
type: documentation
tags:
  - bullmq
  - redis
  - jobs
  - queue
  - infra
status: published
author: asep
created_at: 2026-08-20
updated_at: 2026-08-20
---

# BullMQ Background Workers

BullMQ runs the async indexing/embedding pipeline. Jobs are enqueued by the CLI, the
git-sync webhook, or an MCP tool, and drained by a long-running worker connected to the
shared Redis instance.

## Connection requirements

BullMQ requires an **ioredis** connection with `maxRetriesPerRequest: null`. A finite
retry count causes the cryptic `Connection in key mode` error on blocking commands.
The shared client in `packages/queue` sets this correctly:

```ts
const opts: RedisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: true,
};
```

## Job model

Three job types flow through the `mcpedia-index` queue (prefix `mcpedia:` on Redis):

| name       | data              | action                          |
|------------|-------------------|---------------------------------|
| `index-doc`| `{ relPath, reason }` | index one content file      |
| `index-all`| `{ reason }`      | full corpus reindex            |
| `reindex`  | (legacy)          | alias of full                  |

Job IDs use a `__` separator (`doc__<slug>`, `full__<ts>`) — BullMQ reserves `:` for
repeatable jobs, so a literal `:` in a custom jobId is rejected.

## Worker lifecycle

The worker is a `Worker` with `concurrency: 4`. Each job calls the shared
`indexContentFile` / `runFullIndex` entry points in `@mcpedia/core` — the same code
path the CLI uses, so behavior never diverges. On completion it logs; on failure it
logs the reason and the job is retried per BullMQ defaults.

Graceful shutdown: `worker.close()` on `SIGINT`/`SIGTERM`. systemd sends SIGTERM on
stop, so the process exits cleanly and in-flight jobs are returned to the queue.

## Inspecting state

```bash
bun run enqueue --all          # enqueue a full reindex
curl localhost:4020/trpc/queueStatus   # waiting/active/completed/failed
```

A stuck queue (waiting > 0, active = 0) means the worker died — check
`systemctl status mcpedia-worker` and the journal.
