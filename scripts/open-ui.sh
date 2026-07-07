#!/usr/bin/env bash
# Open the local coverage/bug dashboard in the default browser.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_DIR="${ROOT}/ui"
UI_INDEX="${UI_DIR}/index.html"
# Optional first arg: presentation | index (default index)
PAGE="${1:-index}"
case "${PAGE}" in
  presentation|deck|slides)
    UI_FILE="${UI_DIR}/presentation.html"
    PATH_SUFFIX="presentation.html"
    ;;
  *)
    UI_FILE="${UI_INDEX}"
    PATH_SUFFIX=""
    ;;
esac

if [[ ! -f "${UI_FILE}" ]]; then
  echo "error: UI page not found at ${UI_FILE}" >&2
  exit 1
fi

# Prefer a tiny static server so Chart.js CDN + module paths work consistently;
# fall back to opening the file URL if python is unavailable.
PORT="${UI_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/${PATH_SUFFIX}"

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
  # Reuse existing server on the same port when possible; otherwise start one.
  NEED_START=1
  if command -v lsof >/dev/null 2>&1; then
    if lsof -ti tcp:"${PORT}" >/dev/null 2>&1; then
      NEED_START=0
    fi
  fi
  if [[ "${NEED_START}" -eq 1 ]]; then
    (
      cd "${UI_DIR}"
      python3 -m http.server "${PORT}" --bind 127.0.0.1 >/dev/null 2>&1 &
      echo $! > "${UI_DIR}/.server.pid"
    )
    sleep 0.4
  fi
  open_browser "${URL}"
  echo "UI serving at ${URL} (pid $(cat "${UI_DIR}/.server.pid" 2>/dev/null || echo unknown))"
else
  open_browser "file://${UI_FILE}"
  echo "Opened file://${UI_FILE}"
fi
