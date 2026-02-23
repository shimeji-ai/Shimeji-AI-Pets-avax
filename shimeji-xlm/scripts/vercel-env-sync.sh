#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXTJS_DIR="$ROOT_DIR/nextjs"
DEPLOY_ENV_DIR="${DEPLOY_ENV_EXPORT_DIR:-$ROOT_DIR/.deploy-env}"
VERCEL_LINK_FILE="$NEXTJS_DIR/.vercel/project.json"

POSITIONAL_ARGS=()
DEPLOY_AFTER_SYNC=0
for arg in "$@"; do
  case "$arg" in
    --)
      ;;
    --deploy|--redeploy)
      DEPLOY_AFTER_SYNC=1
      ;;
    *)
      POSITIONAL_ARGS+=("$arg")
      ;;
  esac
done

NETWORK="${POSITIONAL_ARGS[0]:-${NETWORK:-}}"
TARGET_ENV="${POSITIONAL_ARGS[1]:-${VERCEL_ENVIRONMENT:-production}}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

vercel_cli() {
  vercel --cwd "$NEXTJS_DIR" "$@"
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

if ! vercel_cli whoami >/dev/null 2>&1; then
  if [ -t 0 ]; then
    echo "==> Vercel login required."
    vercel_cli login
  else
    die "Not logged in to Vercel. Run: vercel login"
  fi
fi

ensure_vercel_link() {
  if [ -f "$VERCEL_LINK_FILE" ]; then
    return
  fi

  if [ -n "${VERCEL_PROJECT_ID:-}" ] && [ -n "${VERCEL_ORG_ID:-}" ]; then
    mkdir -p "$(dirname "$VERCEL_LINK_FILE")"
    cat > "$VERCEL_LINK_FILE" <<EOF
{"orgId":"$VERCEL_ORG_ID","projectId":"$VERCEL_PROJECT_ID"}
EOF
    echo "==> Created $VERCEL_LINK_FILE from VERCEL_ORG_ID/VERCEL_PROJECT_ID"
    return
  fi

  if [ -t 0 ]; then
    echo "==> No Vercel link found for $NEXTJS_DIR"
    echo "==> Linking this subfolder to the Vercel project (root dir should be shimeji-xlm/nextjs)..."
    vercel_cli link
    [ -f "$VERCEL_LINK_FILE" ] || die "Vercel link did not create $VERCEL_LINK_FILE"
    return
  fi

  die "Missing $VERCEL_LINK_FILE. Run 'vercel link' in $NEXTJS_DIR once, or set VERCEL_ORG_ID and VERCEL_PROJECT_ID."
}

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

ensure_vercel_link

upsert_vercel_env() {
  local key="$1"
  local value="$2"
  if [ -z "$value" ]; then
    return
  fi
  vercel_cli env rm "$key" "$TARGET_ENV" --yes >/dev/null 2>&1 || true
  printf "%s\n" "$value" | vercel_cli env add "$key" "$TARGET_ENV" >/dev/null
  echo "  synced $key -> $TARGET_ENV"
}

remove_vercel_env() {
  local key="$1"
  vercel_cli env rm "$key" "$TARGET_ENV" --yes >/dev/null 2>&1 || true
  echo "  removed $key from $TARGET_ENV"
}

echo "==> Syncing env vars from $ENV_FILE to Vercel ($TARGET_ENV)..."
upsert_vercel_env "NEXT_PUBLIC_NFT_CONTRACT_ID" "${NEXT_PUBLIC_NFT_CONTRACT_ID:-}"
upsert_vercel_env "NEXT_PUBLIC_AUCTION_CONTRACT_ID" "${NEXT_PUBLIC_AUCTION_CONTRACT_ID:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_RPC_URL" "${NEXT_PUBLIC_STELLAR_RPC_URL:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_HORIZON_URL" "${NEXT_PUBLIC_STELLAR_HORIZON_URL:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" "${NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE:-}"
upsert_vercel_env "NEXT_PUBLIC_STELLAR_NETWORK" "${NEXT_PUBLIC_STELLAR_NETWORK:-}"
upsert_vercel_env "NEXT_PUBLIC_USDC_ISSUER" "${NEXT_PUBLIC_USDC_ISSUER:-}"
upsert_vercel_env "NEXT_PUBLIC_ESCROW_PROVIDER" "${NEXT_PUBLIC_ESCROW_PROVIDER:-}"
if [ "${NEXT_PUBLIC_ESCROW_PROVIDER:-}" = "trustless_work" ]; then
  upsert_vercel_env "NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS" "${NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS:-}"
  upsert_vercel_env "NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS" "${NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS:-}"
else
  remove_vercel_env "NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS"
  remove_vercel_env "NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS"
fi
upsert_vercel_env "NEXT_PUBLIC_BASE_URL" "${NEXT_PUBLIC_BASE_URL:-}"

echo "==> Vercel env sync complete."
if [ "$DEPLOY_AFTER_SYNC" -eq 0 ] && [ -t 0 ]; then
  if [ "$TARGET_ENV" = "production" ]; then
    read -r -p "Deploy to Vercel production now so env changes take effect? [y/N]: " deploy_choice
  else
    read -r -p "Deploy to Vercel ($TARGET_ENV) now so env changes take effect? [y/N]: " deploy_choice
  fi
  case "${deploy_choice:-N}" in
    y|Y|yes|YES)
      DEPLOY_AFTER_SYNC=1
      ;;
  esac
fi

if [ "$DEPLOY_AFTER_SYNC" -eq 1 ]; then
  echo "==> Deploying frontend after env sync..."
  if [ "$TARGET_ENV" = "production" ]; then
    vercel_cli --prod
  else
    vercel_cli
  fi
else
  if [ "$TARGET_ENV" = "production" ]; then
    echo "Next step: vercel --cwd \"$NEXTJS_DIR\" --prod"
  else
    echo "Next step: vercel --cwd \"$NEXTJS_DIR\""
  fi
fi
