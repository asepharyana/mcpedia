# ─── Web: packages pre-built .next into a Nix store path ───
# Next.js 16/Turbopack has a Bun incompatibility in the Nix sandbox,
# so .next is built in CI via `bun run build` and packaged here.
{ pkgs
, stdenv
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

    mkdir -p $out/bin
    cat > $out/bin/mcpedia-web <<EOF
#!${pkgs.bash}/bin/bash
export NODE_ENV=production
export PORT=4016
cd /home/code/mcpedia
rm -rf apps/web/.next
cp -r "$out/share/mcpedia-web/.next" apps/web/.next
exec "${bun}/bin/bun" run --cwd apps/web start
EOF
    chmod +x $out/bin/mcpedia-web
  '';
}
