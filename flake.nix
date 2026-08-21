{
  description = "MCPedia — Nix-native build for web, api, mcp, worker services";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # ─── Web: Next.js ───────────────────────────────────────────────
        web = pkgs.stdenvNoCC.mkDerivation {
          pname = "mcpedia-web";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile 2>&1
            cd apps/web
            bun run build
          '';
          installPhase = ''
            mkdir -p $out/share/mcpedia-web
            cp -rL apps/web/.next $out/share/mcpedia-web/.next
            cp -rL apps/web/node_modules $out/share/mcpedia-web/node_modules
            cp apps/web/package.json $out/share/mcpedia-web/
            makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-web \
              --add-flags "node_modules/.bin/next start" \
              --chdir $out/share/mcpedia-web
          '';
        };

        # ─── API: Hono ──────────────────────────────────────────────────
        api = pkgs.stdenvNoCC.mkDerivation {
          pname = "mcpedia-api";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile 2>&1
            cd apps/api
            bun build src/index.ts --outdir dist --external @mcpedia/*
          '';
          installPhase = ''
            mkdir -p $out/share/mcpedia-api
            cp -rL apps/api/dist $out/share/mcpedia-api/dist
            cp -rL apps/api/node_modules $out/share/mcpedia-api/node_modules
            cp apps/api/package.json $out/share/mcpedia-api/
            makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-api \
              --add-flags "run dist/index.js" \
              --chdir $out/share/mcpedia-api
          '';
        };

        # ─── MCP: Streamable HTTP ───────────────────────────────────────
        mcp = pkgs.stdenvNoCC.mkDerivation {
          pname = "mcpedia-mcp";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile 2>&1
            cd apps/mcp
            bun build src/http.ts --outdir dist --external @mcpedia/* --external @modelcontextprotocol/*
          '';
          installPhase = ''
            mkdir -p $out/share/mcpedia-mcp
            cp -rL apps/mcp/dist $out/share/mcpedia-mcp/dist
            cp -rL apps/mcp/node_modules $out/share/mcpedia-mcp/node_modules
            cp apps/mcp/package.json $out/share/mcpedia-mcp/
            makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-mcp \
              --add-flags "run dist/http.js" \
              --chdir $out/share/mcpedia-mcp
          '';
        };

        # ─── Worker: BullMQ ─────────────────────────────────────────────
        worker = pkgs.stdenvNoCC.mkDerivation {
          pname = "mcpedia-worker";
          version = "1.0.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile 2>&1
            cd apps/worker
            bun build src/index.ts --outdir dist --external @mcpedia/*
          '';
          installPhase = ''
            mkdir -p $out/share/mcpedia-worker
            cp -rL apps/worker/dist $out/share/mcpedia-worker/dist
            cp -rL apps/worker/node_modules $out/share/mcpedia-worker/node_modules
            cp apps/worker/package.json $out/share/mcpedia-worker/
            makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-worker \
              --add-flags "run dist/index.js" \
              --chdir $out/share/mcpedia-worker
          '';
        };

      in {
        packages = {
          web = web;
          api = api;
          mcp = mcp;
          worker = worker;
          default = web;  # `nix build` builds web by default
        };
      });
}
