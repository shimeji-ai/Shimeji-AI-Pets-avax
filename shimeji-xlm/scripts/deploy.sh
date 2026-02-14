#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOROBAN_DIR="$ROOT_DIR/soroban"

die() {
  echo "Error: $*" >&2
  exit 1
}

NETWORK="${1:-}"

if [ -z "$NETWORK" ] && [ -t 0 ]; then
  echo "Select deployment target:"
  echo "  1) local"
  echo "  2) testnet"
  echo "  3) mainnet"
  read -r -p "Choice [1]: " choice
  case "${choice:-1}" in
    1) NETWORK="local" ;;
    2) NETWORK="testnet" ;;
    3) NETWORK="mainnet" ;;
    *) NETWORK="local" ;;
  esac
fi

NETWORK="${NETWORK:-local}"
case "$NETWORK" in
  local|testnet|mainnet) ;;
  *)
    die "Usage: ./scripts/deploy.sh [local|testnet|mainnet]"
    ;;
esac

cd "$SOROBAN_DIR"
./scripts/install_prereqs.sh

echo "==> Deploy target: $NETWORK"
NETWORK="$NETWORK" ./scripts/deploy.sh
