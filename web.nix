# ─── Web: packages pre-built .next into a Nix store path ──────────────────
# Next.js 16/Turbopack has a Bun incompatibility in the Nix sandbox,
# so .next is built in CI via `bun run build` and packaged here.
#
# Usage:
#   nix-build -E 'with import <nixpkgs> {}; callPackage ./web.nix { webNextDir = /abs/apps/web/.next; }'
#
# The wrapper symlinks .next from the Nix store (read-only, instant),
# then runs `bunx next start` from the repo checkout.
{ pkgs
, stdenv
, writeShellScriptBin
, bun
, webNextDir
, ...
}:

stdenv.mkDerivation {
  pname = "mcpedia-web";
  version = "1.0.0";
  src = webNextDir;
  dontUnpack = true;
  buildPhase = "";
  installPhase = ''
    mkdir -p $out/share/mcpedia-web/.next
    cp -r "${webNextDir}/." $out/share/mcpedia-web/.next/

    NEXT_DIR="$out/share/mcpedia-web/.next"
    BUN_BIN="${bun}/bin/bun"

    mkdir -p $out/bin
    cat > $out/bin/mcpedia-web <<WRAPPER
      #!/usr/bin/env bash
      export NODE_ENV=production
      export PORT=4016
      cd /home/code/mcpedia/apps/web
      rm -f .next
      ln -s "$NEXT_DIR" .next
      exec "$BUN_BIN" x next start -p 4016
    WRAPPER
    chmod +x $out/bin/mcpedia-web
  '';
}
