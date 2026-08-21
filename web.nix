# ─── Web: packages pre-built .next into a Nix store path ───
# Next.js 16/Turbopack has a Bun incompatibility in the Nix sandbox,
# so .next is built in CI via `bun run build` and packaged here.
{ pkgs
, stdenv
, writeShellScriptBin
, bun
, webNextDir
, ...
}:

let
  mcpedia-web-script = writeShellScriptBin "mcpedia-web" ''
    #!${pkgs.bash}/bin/bash
    export NODE_ENV=production
    export PORT=4016
    cd /home/code/mcpedia/apps/web
    rm -f .next
    ln -s "${webNextDir}" .next
    exec "${bun}/bin/bun" x next start -p 4016
  '';
in
stdenv.mkDerivation {
  pname = "mcpedia-web";
  version = "1.0.0";
  src = webNextDir;
  dontUnpack = true;
  buildPhase = "";
  installPhase = ''
    mkdir -p $out/share/mcpedia-web/.next
    cp -r "${webNextDir}/." $out/share/mcpedia-web/.next/

    mkdir -p $out/bin
    cp ${mcpedia-web-script}/bin/mcpedia-web $out/bin/mcpedia-web
  '';
}
