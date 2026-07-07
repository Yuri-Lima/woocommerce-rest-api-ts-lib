#!/usr/bin/env bash
# Open the local coverage/bug dashboard in the default browser.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_INDEX="${ROOT}/ui/index.html"

if [[ ! -f "${UI_INDEX}" ]]; then
  echo "error: dashboard not found at ${UI_INDEX}" >&2
  exit 1
fi

# Prefer a tiny static server so Chart.js CDN + module paths work consistently;
# fall back to opening the file URL if python is unavailable.
PORT="${UI_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/"

open_browser() {
  local target="$1"
  if command -v open >/dev/null 2>&1; then
    open "${target}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${target}"
  elif command -v start >/dev/null 2>&1; then
    start "${target}"
  else
    echo "Open this URL in your browser: ${target}"
  fi
}

if command -v python3 >/dev/null 2>&1; then
  # Kill any previous server on the same port (best-effort, local only).
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT}" | xargs kill -9 2>/dev/null || true
  fi
  (
    cd "${ROOT}/ui"
    python3 -m http.server "${PORT}" --bind 127.0.0.1 >/dev/null 2>&1 &
    echo $! > "${ROOT}/ui/.server.pid"
  )
  sleep 0.4
  open_browser "${URL}"
  echo "Dashboard serving at ${URL} (pid $(cat "${ROOT}/ui/.server.pid" 2>/dev/null || echo unknown))"
else
  open_browser "file://${UI_INDEX}"
  echo "Opened file://${UI_INDEX}"
fi
