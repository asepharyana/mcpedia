import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
// packages/config -> repo root (../../..)
export const REPO_ROOT = resolve(here, "../../..");

/**
 * Load .env (repo root) as the authoritative dev config and apply it to
 * process.env. We intentionally OVERRIDE any inherited DATABASE_URL so a stray
 * shell env var can never point the app at the wrong database. .env is
 * gitignored; for deploy, set the real vars in the environment and omit .env.
 */
function loadDotEnv() {
  const dotEnv = resolve(REPO_ROOT, ".env");
  if (!existsSync(dotEnv)) return;
  for (const line of readFileSync(dotEnv, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadDotEnv();

export const CONTENT_ROOT =
  process.env.CONTENT_ROOT ?? resolve(REPO_ROOT, "content");

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const EMBED_BASE_URL = process.env.EMBED_BASE_URL ?? "";
export const EMBED_API_KEY = process.env.EMBED_API_KEY ?? "";
export const EMBED_MODEL = process.env.EMBED_MODEL ?? "";

// Phase 3: Redis + BullMQ (shared imrnes Redis, no auth by default).
export const REDIS_URL = process.env.REDIS_URL ?? "redis://100.121.180.82:6379";
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? "";
// BullMQ key prefix to namespace jobs on the shared Redis instance.
export const QUEUE_PREFIX = process.env.QUEUE_PREFIX ?? "mcpedia";

// Phase 4: git-sync webhook shared secret. The API /hooks/* endpoints require
// this header (x-webhook-secret) to match, so an open port can't trigger reindex.
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

// NOTE: we deliberately do NOT throw here if DATABASE_URL is empty. Throwing at
// import time breaks `next build` (SSG data collection imports config before
// any .env is present) and any runtime-injected env (containers/systemd set env
// at process start, after module load). The DB driver (postgres.js) connects
// lazily on first query, so a missing DATABASE_URL surfaces as a clear connect
// error at runtime — not a cryptic build failure.
