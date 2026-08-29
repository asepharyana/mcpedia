{
  description = "MCPedia — Nix-native build for api, mcp, worker. Web .next pre-built in CI.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = { allowUnfree = true; };
          overlays = [
            (self: super: {
              bun = super.bun.overrideAttrs (old: rec {
                version = "1.4.0";
                src = super.fetchzip {
                  url = "https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-linux-x64.zip";
                  sha256 = "sha256:Poy0vf7yJ/hzk33QiQj5gnshI5Q7dfbaMD7xgwiyDKw=";
                };
              });
            })
          ];
        };

        bunBin = pkgs.bun + "/bin/bun";

        mkBunApp = { pname, appName, entry, outEntry }: pkgs.stdenvNoCC.mkDerivation {
          pname = pname;
          version = "1.0.11";
          src = ./.;
          dontFixup = true;
          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile 2>&1
            # Dereference ALL symlinks in .bun cache to fix nix sandbox issues
            if [ -d node_modules/.bun ]; then
              rm -rf $TMPDIR/.bun-fixed
              mkdir -p $TMPDIR/.bun-fixed
              # Copy each .bun subpackage, dereferencing all symlinks
              for subdir in node_modules/.bun/*/; do
                cp -rL "$subdir" "$TMPDIR/.bun-fixed/" 2>/dev/null || true
              done
              rm -rf node_modules/.bun
              cp -r $TMPDIR/.bun-fixed node_modules/.bun
            fi
            bun build ${entry} --outdir apps/${appName}/dist --target bun
          '';
          installPhase = ''
            mkdir -p $out/share/${pname}
            cp -r apps/${appName}/dist $out/share/${pname}/dist

            makeBinaryWrapper ${bunBin} $out/bin/${pname} \
              --add-flags "run dist/${outEntry}" \
              --chdir $out/share/${pname}
          '';
        };

      in {
        packages = {
          api = mkBunApp {
            pname = "mcpedia-api";
            appName = "api";
            entry = "apps/api/src/index.ts";
            outEntry = "index.js";
          };

          mcp = mkBunApp {
            pname = "mcpedia-mcp";
            appName = "mcp";
            entry = "apps/mcp/src/http.ts";
            outEntry = "http.js";
          };

          worker = mkBunApp {
            pname = "mcpedia-worker";
            appName = "worker";
            entry = "apps/worker/src/index.ts";
            outEntry = "index.js";
          };
        };
      }
    );
}
