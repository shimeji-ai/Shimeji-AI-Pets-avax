#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXTJS_DIR="$ROOT_DIR/nextjs"

die() {
  echo "Error: $*" >&2
  exit 1
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    echo "==> pnpm not found. Trying to enable via corepack..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10.24.0 --activate >/dev/null 2>&1 || true
  fi

  command -v pnpm >/dev/null 2>&1 || die "pnpm is required. Install Node.js + corepack or install pnpm manually."
}

[ -d "$NEXTJS_DIR" ] || die "Missing nextjs directory: $NEXTJS_DIR"
ensure_pnpm

cd "$NEXTJS_DIR"
if [ ! -d node_modules ]; then
  echo "==> Installing frontend dependencies..."
  pnpm install
fi

echo "==> Starting frontend on http://localhost:3000"
exec pnpm dev
