#!/usr/bin/env bash
# Publish both monorepo packages to npm as separate packages, in order:
#   1) woocommerce-rest-ts-api  (root library)
#   2) woo-mcp-server           (MCP server; depends on the library)
#
# pnpm rewrites workspace:^ → a real semver range in the published tarball.
#
# Usage:
#   bash scripts/publish-packages.sh
#   DRY_RUN=1 bash scripts/publish-packages.sh
#   SKIP_LIBRARY=1 bash scripts/publish-packages.sh
#   SKIP_MCP=1 bash scripts/publish-packages.sh
#   SKIP_TESTS=1 bash scripts/publish-packages.sh   # CI that already tested
#
# Auth: set NODE_AUTH_TOKEN or NPM_TOKEN (npm automation token).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

DRY_RUN="${DRY_RUN:-0}"
SKIP_LIBRARY="${SKIP_LIBRARY:-0}"
SKIP_MCP="${SKIP_MCP:-0}"
SKIP_TESTS="${SKIP_TESTS:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

LIBRARY_NAME="woocommerce-rest-ts-api"
MCP_NAME="woo-mcp-server"

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

# Prefer NODE_AUTH_TOKEN (setup-node) then NPM_TOKEN
if [[ -z "${NODE_AUTH_TOKEN:-}" && -n "${NPM_TOKEN:-}" ]]; then
  export NODE_AUTH_TOKEN="${NPM_TOKEN}"
fi

if [[ -z "${NODE_AUTH_TOKEN:-}" && "${DRY_RUN}" != "1" ]]; then
  die "NODE_AUTH_TOKEN or NPM_TOKEN is required to publish (or set DRY_RUN=1)."
fi

# Ephemeral auth — never write tokens into the repo .npmrc
if [[ -n "${NODE_AUTH_TOKEN:-}" ]]; then
  TMP_NPMRC="$(mktemp)"
  cleanup_npmrc() { rm -f "${TMP_NPMRC}"; }
  trap cleanup_npmrc EXIT
  {
    echo "registry=https://registry.npmjs.org/"
    echo "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}"
  } >"${TMP_NPMRC}"
  export NPM_CONFIG_USERCONFIG="${TMP_NPMRC}"
fi

pkg_version() {
  local dir="$1"
  node -p "require('${dir}/package.json').version"
}

already_published() {
  local name="$1"
  local version="$2"
  # returns 0 if version exists on registry
  npm view "${name}@${version}" version --silent >/dev/null 2>&1
}

publish_one() {
  local filter="$1"
  local name="$2"
  local dir="$3"
  local version
  version="$(pkg_version "${dir}")"

  log "Package ${name}@${version}"

  if already_published "${name}" "${version}"; then
    warn "${name}@${version} already on npm — skipping publish."
    return 0
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: packing ${filter}"
    pnpm --filter "${filter}" exec npm pack --dry-run
    # Show how workspace protocol would resolve for MCP
    if [[ "${name}" == "${MCP_NAME}" ]]; then
      local lib_ver
      lib_ver="$(pkg_version "${ROOT}")"
      log "Published dependency rewrite (pnpm): workspace:^ → ^${lib_ver}"
    fi
    return 0
  fi

  log "Publishing ${name}@${version} …"
  # --no-git-checks: allow release from release workflow / clean CI tree
  # publishConfig.access=public is set in each package.json
  pnpm --filter "${filter}" publish --access public --no-git-checks

  # Verify
  local remote
  remote="$(npm view "${name}@${version}" version 2>/dev/null || true)"
  [[ "${remote}" == "${version}" ]] || die "Publish verification failed for ${name}@${version} (got: ${remote:-none})"
  log "Verified ${name}@${version} on npm"
}

# ── Quality gates ──────────────────────────────────────────────────────────
if [[ "${SKIP_BUILD}" != "1" ]]; then
  log "Install (frozen)"
  pnpm install --frozen-lockfile

  log "Build library + MCP server"
  pnpm run build
fi

if [[ "${SKIP_TESTS}" != "1" ]]; then
  log "Typecheck"
  pnpm run typecheck
  log "Lint"
  pnpm run lint
  log "Test"
  pnpm test
fi

# ── Publish order: library first, then MCP ────────────────────────────────
if [[ "${SKIP_LIBRARY}" != "1" ]]; then
  publish_one "${LIBRARY_NAME}" "${LIBRARY_NAME}" "${ROOT}"
else
  warn "Skipping library publish (SKIP_LIBRARY=1)"
fi

if [[ "${SKIP_MCP}" != "1" ]]; then
  # MCP must see a resolvable library version on the registry when consumers install.
  # We publish library first above; for dry-run we only warn.
  lib_ver="$(pkg_version "${ROOT}")"
  if [[ "${DRY_RUN}" != "1" ]] && ! already_published "${LIBRARY_NAME}" "${lib_ver}"; then
    die "Library ${LIBRARY_NAME}@${lib_ver} is not on npm; publish it before ${MCP_NAME}."
  fi
  publish_one "${MCP_NAME}" "${MCP_NAME}" "${ROOT}/packages/mcp-server"
else
  warn "Skipping MCP publish (SKIP_MCP=1)"
fi

log "Done."
printf '\nConsumers:\n'
printf '  npm i %s@%s\n' "${LIBRARY_NAME}" "$(pkg_version "${ROOT}")"
printf '  npm i -g %s@%s\n' "${MCP_NAME}" "$(pkg_version "${ROOT}/packages/mcp-server")"
printf '  npx %s\n\n' "${MCP_NAME}"
