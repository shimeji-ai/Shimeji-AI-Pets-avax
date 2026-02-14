#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOROBAN_DIR="$ROOT_DIR/soroban"
DEPLOY_ENV_DIR="${DEPLOY_ENV_EXPORT_DIR:-$ROOT_DIR/.deploy-env}"
ROOT_ENV_FILE="$ROOT_DIR/.env"

RUN_LOCAL=1
RUN_TESTNET=1
RUN_MAINNET=0

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

die() {
  echo "Error: $*" >&2
  exit 1
}

hash_file() {
  local file_path="$1"
  if need_cmd sha256sum; then
    sha256sum "$file_path" | awk '{print $1}'
    return
  fi
  if need_cmd shasum; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return
  fi
  die "Neither sha256sum nor shasum was found in PATH"
}

usage() {
  cat <<'HELP'
Usage: ./scripts/test-networks.sh [options]

Options:
  --local-only      Run only local tests
  --testnet-only    Run only testnet checks
  --mainnet-only    Run only mainnet checks
  --with-mainnet    Include mainnet checks in default run
  -h, --help        Show this message

Default:
  Runs local + testnet checks.
  Mainnet checks are prepared but skipped unless --with-mainnet (or --mainnet-only).
HELP
}

for arg in "$@"; do
  case "$arg" in
    --local-only)
      RUN_LOCAL=1
      RUN_TESTNET=0
      RUN_MAINNET=0
      ;;
    --testnet-only)
      RUN_LOCAL=0
      RUN_TESTNET=1
      RUN_MAINNET=0
      ;;
    --mainnet-only)
      RUN_LOCAL=0
      RUN_TESTNET=0
      RUN_MAINNET=1
      ;;
    --with-mainnet)
      RUN_MAINNET=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $arg"
      ;;
  esac
done

if [ -f "$ROOT_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ROOT_ENV_FILE"
  set +a
fi

run_local_tests() {
  echo "==> [local] Running Soroban contract unit tests..."
  (
    cd "$SOROBAN_DIR"
    cargo test -p shimeji-auction -p shimeji-escrow-vault
  )
}

load_deploy_env() {
  local network="$1"
  local env_file="$DEPLOY_ENV_DIR/$network.env"

  [ -f "$env_file" ] || die "Missing deploy env file for $network: $env_file. Run 'pnpm run deploy:$network' first."

  unset NEXT_PUBLIC_NFT_CONTRACT_ID NEXT_PUBLIC_AUCTION_CONTRACT_ID NEXT_PUBLIC_STELLAR_RPC_URL \
    NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE NEXT_PUBLIC_STELLAR_NETWORK

  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a

  [ -n "${NEXT_PUBLIC_NFT_CONTRACT_ID:-}" ] || die "NEXT_PUBLIC_NFT_CONTRACT_ID missing in $env_file"
  [ -n "${NEXT_PUBLIC_AUCTION_CONTRACT_ID:-}" ] || die "NEXT_PUBLIC_AUCTION_CONTRACT_ID missing in $env_file"
  [ -n "${NEXT_PUBLIC_STELLAR_RPC_URL:-}" ] || die "NEXT_PUBLIC_STELLAR_RPC_URL missing in $env_file"
  [ -n "${NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE:-}" ] || die "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE missing in $env_file"
}

run_remote_checks() {
  local network="$1"
  local tmp_dir nft_file auction_file nft_hash auction_hash

  load_deploy_env "$network"
  echo "==> [$network] Fetching deployed wasm contracts..."

  tmp_dir="$(mktemp -d)"
  nft_file="$tmp_dir/nft.wasm"
  auction_file="$tmp_dir/auction.wasm"

  stellar contract fetch \
    --id "$NEXT_PUBLIC_NFT_CONTRACT_ID" \
    --out-file "$nft_file" \
    --rpc-url "$NEXT_PUBLIC_STELLAR_RPC_URL" \
    --network-passphrase "$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" >/dev/null

  stellar contract fetch \
    --id "$NEXT_PUBLIC_AUCTION_CONTRACT_ID" \
    --out-file "$auction_file" \
    --rpc-url "$NEXT_PUBLIC_STELLAR_RPC_URL" \
    --network-passphrase "$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" >/dev/null

  nft_hash="$(hash_file "$nft_file")"
  auction_hash="$(hash_file "$auction_file")"
  echo "    NFT wasm hash:     $nft_hash"
  echo "    Auction wasm hash: $auction_hash"

  echo "==> [$network] Build-info query (non-fatal if unavailable)..."
  if stellar contract info build \
    --contract-id "$NEXT_PUBLIC_NFT_CONTRACT_ID" \
    --rpc-url "$NEXT_PUBLIC_STELLAR_RPC_URL" \
    --network-passphrase "$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" >/dev/null 2>&1; then
    echo "    NFT build info: available"
  else
    echo "    NFT build info: unavailable (ok for smoke test)"
  fi

  if stellar contract info build \
    --contract-id "$NEXT_PUBLIC_AUCTION_CONTRACT_ID" \
    --rpc-url "$NEXT_PUBLIC_STELLAR_RPC_URL" \
    --network-passphrase "$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" >/dev/null 2>&1; then
    echo "    Auction build info: available"
  else
    echo "    Auction build info: unavailable (ok for smoke test)"
  fi

  rm -rf "$tmp_dir"
}

need_cmd cargo || die "cargo not found in PATH"
need_cmd stellar || die "stellar CLI not found in PATH"

if [ "$RUN_LOCAL" -eq 1 ]; then
  run_local_tests
fi

if [ "$RUN_TESTNET" -eq 1 ]; then
  run_remote_checks "testnet"
fi

if [ "$RUN_MAINNET" -eq 1 ]; then
  run_remote_checks "mainnet"
else
  echo "==> [mainnet] Skipped (prepared; run with --with-mainnet or --mainnet-only)."
fi

echo "==> Network test flow completed."
