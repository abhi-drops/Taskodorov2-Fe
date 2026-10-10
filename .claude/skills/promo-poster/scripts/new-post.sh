#!/usr/bin/env bash
# Creates promotions/<slug>/source/ with the poster template and the app's own fonts and
# images, ready to edit. Safe to re-run: it never overwrites an existing index.html.
set -euo pipefail
slug="${1:?usage: new-post.sh <post-slug>}"
ROOT="$(git rev-parse --show-toplevel)"
SKILL="$ROOT/.claude/skills/promo-poster"
SRC="$ROOT/promotions/$slug/source"

mkdir -p "$SRC/assets/fonts" "$SRC/assets/img" "$SRC/assets/vendor"
[ -f "$SRC/index.html" ] || cp "$SKILL/template/index.html" "$SRC/index.html"
cp "$SKILL/template/hyperframes.json" "$SKILL/template/package.json" "$SRC/"
printf '{\n  "id": "%s",\n  "name": "%s"\n}\n' "$slug" "$slug" > "$SRC/meta.json"

# Fonts and images come from the app itself, so posters follow any rebrand.
cp "$ROOT"/node_modules/@fontsource/geomini/files/geomini-latin-{400,700}-normal.woff2 "$SRC/assets/fonts/"
cp "$ROOT/node_modules/@fontsource-variable/google-sans-flex/files/google-sans-flex-latin-wght-normal.woff2" "$SRC/assets/fonts/"
cp "$ROOT"/src/assets/{logo,check-circle,check-tick}.png "$SRC/assets/img/"
# The grid texture is 7001px wide in the app; a 1920px copy is plenty for a 1080px poster.
ffmpeg -v error -y -i "$ROOT/src/assets/background.jpeg" -vf scale=1920:-2 -q:v 3 "$SRC/assets/img/background.jpg"
cp "$SKILL/assets/vendor/gsap.min.js" "$SRC/assets/vendor/"

echo "Ready: $SRC/index.html"
