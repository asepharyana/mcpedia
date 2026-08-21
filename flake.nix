{
  description = "MCPedia — Nix-native build for api, mcp, worker. Web .next pre-built in CI.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; }; in {
        packages = {
          # ─── API: Hono ────────────────────────────────────────────────
          # bun build bundles TS → JS. @mcpedia/* kept external (resolved from
          # root node_modules at runtime). We copy the ROOT node_modules (the
          # full workspace install) so all transitive deps are available.
          api = pkgs.stdenvNoCC.mkDerivation {
            pname = "mcpedia-api";
            version = "1.0.0";
            src = ./.;
            dontFixup = true;
            nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
            buildPhase = ''
              export HOME=$TMPDIR
              bun install --frozen-lockfile 2>&1
              bun build apps/api/src/index.ts \
                --outdir apps/api/dist \
                --target bun \
                --external @mcpedia/config \
                --external @mcpedia/core \
                --external @mcpedia/db \
                --external @mcpedia/queue
            '';
            installPhase = ''
              mkdir -p $out/share/mcpedia-api
              cp -r apps/api/dist $out/share/mcpedia-api/dist
              mkdir -p $out/share/mcpedia-api/node_modules
              cp -r node_modules/* $out/share/mcpedia-api/node_modules/ 2>/dev/null || true
              cp apps/api/package.json $out/share/mcpedia-api/
              makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-api \
                --add-flags "run dist/index.js" \
                --chdir $out/share/mcpedia-api
            '';
          };

          # ─── MCP: Streamable HTTP ──────────────────────────────────────
          mcp = pkgs.stdenvNoCC.mkDerivation {
            pname = "mcpedia-mcp";
            version = "1.0.0";
            src = ./.;
            dontFixup = true;
            nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
            buildPhase = ''
              export HOME=$TMPDIR
              bun install --frozen-lockfile 2>&1
              bun build apps/mcp/src/http.ts \
                --outdir apps/mcp/dist \
                --target bun \
                --external @mcpedia/config \
                --external @mcpedia/core \
                --external @mcpedia/queue \
                --external @modelcontextprotocol/sdk
            '';
            installPhase = ''
              mkdir -p $out/share/mcpedia-mcp
              cp -r apps/mcp/dist $out/share/mcpedia-mcp/dist
              mkdir -p $out/share/mcpedia-mcp/node_modules
              cp -r node_modules/* $out/share/mcpedia-mcp/node_modules/ 2>/dev/null || true
              cp apps/mcp/package.json $out/share/mcpedia-mcp/
              makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-mcp \
                --add-flags "run dist/http.js" \
                --chdir $out/share/mcpedia-mcp
            '';
          };

          # ─── Worker: BullMQ ────────────────────────────────────────────
          worker = pkgs.stdenvNoCC.mkDerivation {
            pname = "mcpedia-worker";
            version = "1.0.0";
            src = ./.;
            # The .bun cache in node_modules uses symlinks that may be
            # broken in the Nix store. Skip the fixup phase's symlink check.
            dontFixup = true;
            nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
            buildPhase = ''
              export HOME=$TMPDIR
              bun install --frozen-lockfile 2>&1
              bun build apps/worker/src/index.ts \
                --outdir apps/worker/dist \
                --target bun \
                --external @mcpedia/config \
                --external @mcpedia/core \
                --external @mcpedia/db \
                --external @mcpedia/queue
            '';
            installPhase = ''
              mkdir -p $out/share/mcpedia-worker
              cp -r apps/worker/dist $out/share/mcpedia-worker/dist
              mkdir -p $out/share/mcpedia-worker/node_modules
              cp -r node_modules/* $out/share/mcpedia-worker/node_modules/ 2>/dev/null || true
              cp apps/worker/package.json $out/share/mcpedia-worker/
              makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-worker \
                --add-flags "run dist/index.js" \
                --chdir $out/share/mcpedia-worker
            '';
          };
        };
      });
}