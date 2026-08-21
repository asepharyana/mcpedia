# Phase 15 — Nix-based CI/CD for mcpedia-web

> User: "ci nya juga benarkan lah masa build di vps,harusnya kan di vps hanya deploy, dan seharusnya pakai nix"

## Current State
- Deploy workflow builds the web app ON the VPS via SSH (`cd apps/web && bun run build`)
- mcpedia-web service runs directly from git checkout (`/home/code/mcpedia/apps/web/.next`)
- No flake.nix in the repo
- Other services (zeavis-*, gmw-*) are nix-deployed via `/nix/var/nix/profiles/<name>`

## Goal
- **CI**: builds the web app into a Nix store path
- **Deploy**: VPS only copies + switches profiles (no build on VPS)

## Approach: `nix build` + `nix copy` (push deployment)

### 1. Add flake.nix to mcpedia repo
Build the Next.js production output into a Nix package:
- `next build` outputs to `.next/`
- Package: a shell script that runs `next start` with the `.next` dir + `node_modules`

### 2. CI workflow (`ci.yml`)
- Add a `nix build` step after typecheck/test
- Push the result to the VPS via `nix copy --ssh`

### 3. Deploy workflow (`deploy.yml`)
- Trigger on CI success
- `nix copy` the built package to VPS
- `nix profile install` / `systemctl restart` on VPS
- No `bun run build` on VPS

## Files to create/modify
- `flake.nix` (new) — builds @mcpedia/web as a Nix package
- `.github/workflows/ci.yml` — add nix build step
- `.github/workflows/deploy.yml` — nix copy + profile switch instead of SSH build
