#!/usr/bin/env bash
# Real screenshots of the running app for a post: the desktop layout and the mobile
# layout, saved as promotions/<slug>/source/assets/img/app-desktop.png and app-mobile.png.
#   app-screenshots.sh <post-slug> [route] [text-to-wait-for]
# Each run uses a fresh browser profile, so it shows the first-launch default board.
set -euo pipefail
slug="${1:?usage: app-screenshots.sh <post-slug> [route] [text-to-wait-for]}"
ROOT="$(git rev-parse --show-toplevel)"
SKILL="$ROOT/.claude/skills/promo-poster"
OUT="$ROOT/promotions/$slug/source/assets/img"
mkdir -p "$OUT"

CHROME="$(find "$HOME/.cache/hyperframes/chrome" -type f -name chrome-headless-shell 2>/dev/null | sort | tail -1)"
PUPPETEER_CORE="$(find "$HOME/.npm/_npx" -maxdepth 4 -type d -name puppeteer-core 2>/dev/null | head -1)"
[ -n "$CHROME" ] || { echo "No headless Chrome found. Run: npx hyperframes browser ensure" >&2; exit 1; }
[ -n "$PUPPETEER_CORE" ] || { echo "puppeteer-core not found. Run any 'npx hyperframes snapshot' once so npx caches it." >&2; exit 1; }

# The browser profile must live outside the repo: Vite watches the project folder, and a
# profile written inside it triggers an endless reload loop that hangs the screenshot.
PROFILE_DIR="$(mktemp -d)"
WEB_PORT=5199
MOBILE_PORT=5198

cd "$ROOT"
# Run Vite with node directly (not through npx), so each PID is the server itself and
# the cleanup below really stops it.
VITE="$ROOT/node_modules/vite/bin/vite.js"
node "$VITE" --port "$WEB_PORT" --strictPort > "$PROFILE_DIR/web.log" 2>&1 &
web_pid=$!
node "$VITE" --config "$SKILL/scripts/vite.mobile.config.ts" --port "$MOBILE_PORT" --strictPort > "$PROFILE_DIR/mobile.log" 2>&1 &
mobile_pid=$!
cleanup() {
  kill "$web_pid" "$mobile_pid" 2>/dev/null || true
  rm -rf "$PROFILE_DIR"
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$WEB_PORT/" && curl -s -o /dev/null "http://localhost:$MOBILE_PORT/"; then break; fi
  sleep 1
done

CHROME="$CHROME" PUPPETEER_CORE="$PUPPETEER_CORE" PROFILE_DIR="$PROFILE_DIR" OUT_DIR="$OUT" \
  WEB_PORT="$WEB_PORT" MOBILE_PORT="$MOBILE_PORT" ROUTE="${2:-/}" WAIT_TEXT="${3:-Click to edit me}" \
  node "$SKILL/scripts/app-screenshots.cjs"
