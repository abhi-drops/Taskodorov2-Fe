#!/usr/bin/env bash
# Captures each slide of promotions/<slug>/source/index.html as a PNG and saves them as
# promotions/<slug>/NN-<name>.png. Give one name per slide, in slide order.
# Slides are 1-second clips, so slide N is captured at N-0.5 seconds.
set -euo pipefail
slug="${1:?usage: export.sh <post-slug> <slide-name>...}"
shift
[ "$#" -ge 1 ] || { echo "give one name per slide, in order" >&2; exit 1; }
ROOT="$(git rev-parse --show-toplevel)"
POST="$ROOT/promotions/$slug"
SRC="$POST/source"

at=""
for i in $(seq 1 "$#"); do at="${at:+$at,}$((i - 1)).5"; done

cd "$SRC"
rm -rf snapshots
npx --yes hyperframes snapshot --at "$at" --no-end --describe false > snapshot.log 2>&1 || { cat snapshot.log >&2; exit 1; }

i=0
for name in "$@"; do
  frame=$(ls snapshots/frame-$(printf '%02d' "$i")-at-*.png)
  i=$((i + 1))
  cp "$frame" "$POST/$(printf '%02d' "$i")-$name.png"
done
cp snapshots/contact-sheet.jpg "$POST/source/contact-sheet.jpg"
rm -rf snapshots snapshot.log
echo "Exported $i slides to $POST (review sheet: $POST/source/contact-sheet.jpg)"
