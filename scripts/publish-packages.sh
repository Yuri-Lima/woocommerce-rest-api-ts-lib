#!/usr/bin/env bash
# Publish monorepo packages to npm as separate packages, in order:
#   1) woocommerce-rest-ts-api  (root library — admin wc/v3)
#   2) woo-store-ts-api         (Store API client — cart/checkout)
#   3) woo-mcp-server           (MCP server; depends on the admin library)
#
# Usage:
#   bash scripts/publish-packages.sh
#   DRY_RUN=1 bash scripts/publish-packages.sh
#   SKIP_LIBRARY=1 | SKIP_STORE=1 | SKIP_MCP=1 | SKIP_TESTS=1 | SKIP_BUILD=1
#
# Auth: NODE_AUTH_TOKEN or NPM_TOKEN (npm automation token for owner yurimlima).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

DRY_RUN="${DRY_RUN:-0}"
SKIP_LIBRARY="${SKIP_LIBRARY:-0}"
SKIP_STORE="${SKIP_STORE:-0}"
SKIP_MCP="${SKIP_MCP:-0}"
SKIP_TESTS="${SKIP_TESTS:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

LIBRARY_NAME="woocommerce-rest-ts-api"
STORE_NAME="woo-store-ts-api"
MCP_NAME="woo-mcp-server"

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

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
    echo "always-auth=true"
    echo "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}"
  } >"${TMP_NPMRC}"
  export NPM_CONFIG_USERCONFIG="${TMP_NPMRC}"
fi

pkg_version() {
  node -p "require(require('path').resolve(process.argv[1], 'package.json')).version" "$1"
}

already_published() {
  local name="$1"
  local version="$2"
  npm view "${name}@${version}" version --silent >/dev/null 2>&1
}

publish_library() {
  local version
  version="$(pkg_version "${ROOT}")"
  log "Package ${LIBRARY_NAME}@${version}"

  if already_published "${LIBRARY_NAME}" "${version}"; then
    warn "${LIBRARY_NAME}@${version} already on npm — skipping."
    return 0
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: npm pack (library)"
    npm pack --dry-run --registry https://registry.npmjs.org/
    return 0
  fi

  log "Publishing ${LIBRARY_NAME}@${version} …"
  # prepublishOnly → prepack rebuilds dist
  npm publish --access public --registry https://registry.npmjs.org/

  verify_published "${LIBRARY_NAME}" "${version}"
}

# Shared helper for packages/* that publish dist + package.json (no workspace rewrite).
publish_workspace_package() {
  local name="$1"
  local dir="$2"
  local version
  version="$(pkg_version "${dir}")"
  log "Package ${name}@${version}"

  if already_published "${name}" "${version}"; then
    warn "${name}@${version} already on npm — skipping."
    return 0
  fi

  if [[ ! -d "${dir}/dist" ]]; then
    pnpm --filter "${name}" build
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: pnpm pack (${name})"
    (cd "${dir}" && pnpm pack)
    local tgz
    tgz="$(ls -1 "${dir}/${name}-${version}.tgz" 2>/dev/null | head -1 || true)"
    if [[ -n "${tgz}" ]]; then
      tar -tzf "${tgz}" | head -30
      rm -f "${tgz}"
    fi
    return 0
  fi

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  cp "${dir}/package.json" "${tmp_dir}/"
  [[ -f "${dir}/README.md" ]] && cp "${dir}/README.md" "${tmp_dir}/"
  [[ -f "${dir}/LICENSE" ]] && cp "${dir}/LICENSE" "${tmp_dir}/"
  cp -R "${dir}/dist" "${tmp_dir}/"

  # Drop scripts from published package.json (prepublishOnly would re-run monorepo build)
  node -e "
const fs = require('fs');
const pkgPath = process.argv[1];
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
delete pkg.scripts;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
" "${tmp_dir}/package.json"

  log "Publishing ${name}@${version} …"
  (cd "${tmp_dir}" && npm publish --access public --registry https://registry.npmjs.org/)
  rm -rf "${tmp_dir}"

  verify_published "${name}" "${version}"
}

publish_store() {
  publish_workspace_package "${STORE_NAME}" "${ROOT}/packages/store-api"
}

publish_mcp() {
  local version lib_ver
  version="$(pkg_version "${ROOT}/packages/mcp-server")"
  lib_ver="$(pkg_version "${ROOT}")"
  log "Package ${MCP_NAME}@${version}"

  if already_published "${MCP_NAME}" "${version}"; then
    warn "${MCP_NAME}@${version} already on npm — skipping."
    return 0
  fi

  if [[ "${DRY_RUN}" != "1" ]] && ! already_published "${LIBRARY_NAME}" "${lib_ver}"; then
    die "Library ${LIBRARY_NAME}@${lib_ver} is not on npm; publish it before ${MCP_NAME}."
  fi

  # Ensure dist exists
  if [[ ! -f "${ROOT}/packages/mcp-server/dist/cli.js" ]]; then
    pnpm --filter "${MCP_NAME}" build
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN: pnpm pack (mcp rewrites workspace:^ → ^${lib_ver})"
    (cd packages/mcp-server && pnpm pack)
    tar -xOf "packages/mcp-server/${MCP_NAME}-${version}.tgz" package/package.json | node -e \
      "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const p=JSON.parse(s);console.log('deps',p.dependencies);});"
    rm -f "packages/mcp-server/${MCP_NAME}-${version}.tgz"
    return 0
  fi

  # Stage temp publish tree: rewrite workspace: for plain npm publish
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  cp "${ROOT}/packages/mcp-server/package.json" "${tmp_dir}/"
  cp "${ROOT}/packages/mcp-server/README.md" "${tmp_dir}/"
  cp "${ROOT}/packages/mcp-server/LICENSE" "${tmp_dir}/"
  cp -R "${ROOT}/packages/mcp-server/dist" "${tmp_dir}/"

  node -e "
const fs = require('fs');
const path = require('path');
const root = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const pkgPath = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
delete pkg.scripts;
const dep = pkg.dependencies && pkg.dependencies['woocommerce-rest-ts-api'];
if (dep && String(dep).startsWith('workspace:')) {
  let range = root.version;
  if (dep === 'workspace:^' || dep.startsWith('workspace:^')) range = '^' + root.version;
  else if (dep === 'workspace:~' || dep.startsWith('workspace:~')) range = '~' + root.version;
  pkg.dependencies['woocommerce-rest-ts-api'] = range;
  console.log('rewrote workspace dep →', range);
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
" "${ROOT}/package.json" "${tmp_dir}/package.json"

  log "Publishing ${MCP_NAME}@${version} …"
  (cd "${tmp_dir}" && npm publish --access public --registry https://registry.npmjs.org/)
  rm -rf "${tmp_dir}"

  verify_published "${MCP_NAME}" "${version}"
}

verify_published() {
  local name="$1"
  local version="$2"
  local remote=""
  for _ in 1 2 3 4 5 6 7 8; do
    remote="$(npm view "${name}@${version}" version 2>/dev/null || true)"
    [[ "${remote}" == "${version}" ]] && break
    sleep 2
  done
  if [[ "${remote}" != "${version}" ]]; then
    die "Publish verification failed for ${name}@${version} (got: ${remote:-none}).
If npm returned 404 on PUT, the NPM_TOKEN is usually expired or lacks publish rights
for npm user 'yurimlima' (owner of ${LIBRARY_NAME}).
Create a classic Automation token at https://www.npmjs.com/settings/~/tokens
and set the GitHub secret NPM_TOKEN."
  fi
  log "Verified ${name}@${version} on npm"
}

# ── Quality gates ──────────────────────────────────────────────────────────
if [[ "${SKIP_BUILD}" != "1" ]]; then
  log "Install (frozen)"
  pnpm install --frozen-lockfile

  log "Build library + store-api + MCP server"
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

# ── Publish order ─────────────────────────────────────────────────────────
if [[ "${SKIP_LIBRARY}" != "1" ]]; then
  publish_library
else
  warn "Skipping library publish (SKIP_LIBRARY=1)"
fi

if [[ "${SKIP_STORE}" != "1" ]]; then
  publish_store
else
  warn "Skipping Store API publish (SKIP_STORE=1)"
fi

if [[ "${SKIP_MCP}" != "1" ]]; then
  publish_mcp
else
  warn "Skipping MCP publish (SKIP_MCP=1)"
fi

log "Done."
printf '\nConsumers:\n'
printf '  npm i %s@%s\n' "${LIBRARY_NAME}" "$(pkg_version "${ROOT}")"
printf '  npm i %s@%s\n' "${STORE_NAME}" "$(pkg_version "${ROOT}/packages/store-api")"
printf '  npm i -g %s@%s\n' "${MCP_NAME}" "$(pkg_version "${ROOT}/packages/mcp-server")"
printf '  npx -y %s\n\n' "${MCP_NAME}"
