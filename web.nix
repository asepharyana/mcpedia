# ─── Web: packages pre-built .next ──────────────────────────────────────
# Next.js 16/Turbopack has a Bun incompatibility in the Nix sandbox.
# Fix: CI builds .next with `bun run build`, then this derivation packages
# the .next + node_modules (from a full monorepo install) into a Nix store path.
#
# `webNextDir`  = Nix path to pre-built .next directory
# `webPkgDir`   = Nix path to apps/web
# `nodeModulesPath` = Nix path to monorepo node_modules (root)
#
# Usage:
#   nix-build -E 'let pkgs = import <nixpkgs> {}; in pkgs.callPackage ./web.nix { webNextDir = /abs/apps/web/.next; webPkgDir = /abs/apps/web; nodeModulesPath = /abs; }'

{ pkgs
, stdenv
, makeBinaryWrapper
, bun
, webNextDir
, webPkgDir
, nodeModulesPath
, ...
}:

stdenv.mkDerivation {
  pname = "mcpedia-web";
  version = "1.0.0";
  src = pkgs.writeText "dummy-src" "";
  nativeBuildInputs = [ pkgs.bun makeBinaryWrapper ];
  dontUnpack = true;
  buildPhase = "";
  installPhase = ''
    mkdir -p $out/share/mcpedia-web

    # Copy pre-built .next
    cp -r "${webNextDir}" $out/share/mcpedia-web/.next

    # Copy node_modules from monorepo root (preserves symlinks to workspace pkgs)
    cp -r "${nodeModulesPath}/node_modules" $out/share/mcpedia-web/node_modules

    # Fix workspace symlinks: node_modules/@mcpedia/* points to ../../packages/*
    # In the Nix store, resolve to actual package source dirs
    cd $out/share/mcpedia-web
    for ws_pkg in @mcpedia/config @mcpedia/core @mcpedia/db @mcpedia/embeddings \
                  @mcpedia/parser @mcpedia/queue @mcpedia/search @mcpedia/types; do
      link="node_modules/$ws_pkg"
      if [ -L "$link" ]; then
        target=$(readlink -f "$link")
        rm "$link"
        mkdir -p "$(dirname "$link")"
        cp -rL "$target" "$link"
      fi
    done

    cp "${webPkgDir}/package.json" $out/share/mcpedia-web/

    makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/mcpedia-web \
      --add-flags "run node_modules/.bin/next start" \
      --chdir $out/share/mcpedia-web
  '';
}
