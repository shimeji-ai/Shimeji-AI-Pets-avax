#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXTJS_DIR="$ROOT_DIR/nextjs"
DEPLOY_ENV_DIR="${DEPLOY_ENV_EXPORT_DIR:-$ROOT_DIR/.deploy-env}"

RAW_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--" ]; then
    continue
  fi
  RAW_ARGS+=("$arg")
done

NETWORK="${RAW_ARGS[0]:-${NETWORK:-}}"
TARGET_ENV="${RAW_ARGS[1]:-${VERCEL_ENVIRONMENT:-production}}"
THIRD_ARG="${RAW_ARGS[2]:-}"
DEPLOY_AFTER_SYNC=0

if [ "$THIRD_ARG" = "--deploy" ] || [ "$THIRD_ARG" = "--redeploy" ]; then
  DEPLOY_AFTER_SYNC=1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

die() {
  echo "Error: $*" >&2
  exit 1
}

if [ -z "$NETWORK" ] && [ -t 0 ]; then
  echo "Select deployment network:"
  echo "  1) testnet"
  echo "  2) mainnet"
  read -r -p "Choice [1]: " choice
  case "${choice:-1}" in
    1) NETWORK="testnet" ;;
    2) NETWORK="mainnet" ;;
    *) NETWORK="testnet" ;;
  esac
fi

NETWORK="${NETWORK:-testnet}"
case "$NETWORK" in
  testnet|mainnet) ;;
  *)
    die "Usage: ./scripts/vercel-env-sync.sh [testnet|mainnet] [production|preview|development] [--deploy]"
    ;;
esac

case "$TARGET_ENV" in
  production|preview|development) ;;
  *)
    die "Target environment must be one of: production, preview, development"
    ;;
esac

ENV_FILE="$DEPLOY_ENV_DIR/$NETWORK.env"
[ -f "$ENV_FILE" ] || die "Deploy env file not found: $ENV_FILE (run pnpm run deploy:$NETWORK first)"

if ! need_cmd vercel; then
  die "Vercel CLI not found. Install with: npm i -g vercel"
fi

if ! vercel whoami >/dev/null 2>&1; then
  if [ -t 0 ]; then
    echo "==> Vercel login required."
    vercel login
  else
    die "Not logged in to Vercel. Run: vercel login"
  fi
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${NEXT_PUBLIC_BASE_URL:-}" ] && [ -t 0 ]; then
  read -r -p "NEXT_PUBLIC_BASE_URL (e.g. https://your-domain.com) [skip]: " entered_base_url
  if [ -n "${entered_base_url:-}" ]; then
    NEXT_PUBLIC_BASE_URL="$entered_base_url"
  fi
fi

upsert_vercel_env() {
  local key="$1"
  local value="$2"
  if [ -z "$value" ]; then
    return
  fi
  vercel env rm "$key" "$TARGET_ENV" --yes >/dev/null 2>&1 || true
  printf "%s\n" "$value" | vercel env add "$key" "$TARGET_ENV" >/dev/null
  echo "  synced $key -> $TARGET_ENV"
}

cd "$NEXTJS_DIR"
echo "==> Syncing env vars from $ENV_FILE to Vercel ($TARGET_ENV)..."
upsert_vercel_env "NEXT_PUBLIC_NFT_CONTRACT_ID" "${NEXT_PUBLIC_NFT_CONTRACT_ID:-}"
upsert_vercel_env "NEXT_PUBLIC_AUCTION_CONTRACT_ID" "${NEXT_PUBLIC_AUCTION_CONTRACT_ID:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_RPC_URL" "${NEXT_PUBLIC_STELLAR_RPC_URL:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_HORIZON_URL" "${NEXT_PUBLIC_STELLAR_HORIZON_URL:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" "${NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_NETWORK" "${NEXT_PUBLIC_STELLAR_NETWORK:-}"
upsert_vercel_env "NEXT_PUBLIC_USDC_ISSUER" "${NEXT_PUBLIC_USDC_ISSUER:-}"
upsert_vercel_env "NEXT_PUBLIC_BASE_URL" "${NEXT_PUBLIC_BASE_URL:-}"

echo "==> Vercel env sync complete."
if [ "$DEPLOY_AFTER_SYNC" -eq 1 ]; then
  echo "==> Deploying frontend after env sync..."
  if [ "$TARGET_ENV" = "production" ]; then
    vercel --prod
  else
    vercel
  fi
else
  if [ "$TARGET_ENV" = "production" ]; then
    echo "Next step: cd \"$NEXTJS_DIR\" && vercel --prod"
  else
    echo "Next step: cd \"$NEXTJS_DIR\" && vercel"
  fi
fi
