#!/usr/bin/env bash
# Copy files that are too large for the GitHub contents API seed from the official starter.
# Safe to re-run. Pins the same tree as the cloudflare-os submodule (starter main).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="https://raw.githubusercontent.com/cloudflare/cloudflare-os-starter/main"

curl -fsSL "$BASE/pnpm-lock.yaml" -o "$ROOT/pnpm-lock.yaml"
mkdir -p "$ROOT/packages/custom-gatekeeper"
curl -fsSL "$BASE/packages/custom-gatekeeper/worker-configuration.d.ts" \
  -o "$ROOT/packages/custom-gatekeeper/worker-configuration.d.ts"

echo "Wrote pnpm-lock.yaml and packages/custom-gatekeeper/worker-configuration.d.ts from official starter."
