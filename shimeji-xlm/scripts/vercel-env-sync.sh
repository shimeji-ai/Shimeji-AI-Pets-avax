#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXTJS_DIR="$ROOT_DIR/nextjs"
DEPLOY_ENV_DIR="${DEPLOY_ENV_EXPORT_DIR:-$ROOT_DIR/.deploy-env}"
VERCEL_LINK_FILE="$NEXTJS_DIR/.vercel/project.json"
SHIMEJI_XLM_ENV_FILE="$ROOT_DIR/.env"
NEXTJS_ENV_LOCAL_FILE="$NEXTJS_DIR/.env.local"
NEXTJS_ENV_FILE="$NEXTJS_DIR/.env"

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

read_env_key_from_file() {
  local file="$1"
  local key="$2"
  [ -f "$file" ] || return 0
  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "", $0)
      gsub(/\r/, "", $0)
      gsub(/^"/, "", $0)
      gsub(/"$/, "", $0)
      print $0
      exit
    }
  ' "$file"
}

resolve_env_key() {
  local key="$1"
  shift
  local file value
  for file in "$@"; do
    [ -n "$file" ] || continue
    value="$(read_env_key_from_file "$file" "$key")"
    if [ -n "${value:-}" ]; then
      printf "%s" "$value"
      return 0
    fi
  done
  return 0
}

vercel_cli() {
  vercel --cwd "$NEXTJS_DIR" "$@"
}

vercel_deploy_cli() {
  # Always deploy from shimeji-xlm/nextjs to avoid uploading the entire monorepo.
  vercel_cli "$@"
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

# Deploy exports contain network/contract envs in .deploy-env/<network>.env.
# Additional app/server secrets are resolved from subapp-scoped env files:
# - Next.js app runtime: shimeji-xlm/nextjs/.env.local, then nextjs/.env
# - Shared shimeji-xlm deploy/runtime secrets: shimeji-xlm/.env
NEXTJS_LOOKUP_FILES=("$NEXTJS_ENV_LOCAL_FILE" "$NEXTJS_ENV_FILE")
PINATA_LOOKUP_FILES=("$SHIMEJI_XLM_ENV_FILE" "$NEXTJS_ENV_LOCAL_FILE" "$NEXTJS_ENV_FILE")
PAIRING_LOOKUP_FILES=("$NEXTJS_ENV_LOCAL_FILE" "$NEXTJS_ENV_FILE" "$SHIMEJI_XLM_ENV_FILE")

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(resolve_env_key "DATABASE_URL" "${NEXTJS_LOOKUP_FILES[@]}")"
fi
if [ -z "${DIRECT_URL:-}" ]; then
  DIRECT_URL="$(resolve_env_key "DIRECT_URL" "${NEXTJS_LOOKUP_FILES[@]}")"
fi
if [ -z "${NEXT_PUBLIC_BASE_URL:-}" ]; then
  NEXT_PUBLIC_BASE_URL="$(resolve_env_key "NEXT_PUBLIC_BASE_URL" "${NEXTJS_LOOKUP_FILES[@]}")"
fi

# Optional Next.js server-side secrets/settings (sync if present).
# PINATA_JWT is shared: deploy script can use shimeji-xlm/.env, and web app can use Vercel.
PINATA_JWT="${PINATA_JWT:-$(resolve_env_key "PINATA_JWT" "${PINATA_LOOKUP_FILES[@]}")}"
RESEND_API_KEY="${RESEND_API_KEY:-$(resolve_env_key "RESEND_API_KEY" "${NEXTJS_LOOKUP_FILES[@]}")}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-$(resolve_env_key "RESEND_FROM_EMAIL" "${NEXTJS_LOOKUP_FILES[@]}")}"
FEEDBACK_TO_EMAIL="${FEEDBACK_TO_EMAIL:-$(resolve_env_key "FEEDBACK_TO_EMAIL" "${NEXTJS_LOOKUP_FILES[@]}")}"
EGG_REQUEST_TO_EMAIL="${EGG_REQUEST_TO_EMAIL:-$(resolve_env_key "EGG_REQUEST_TO_EMAIL" "${NEXTJS_LOOKUP_FILES[@]}")}"
RESEND_AUDIENCE_UPDATES="${RESEND_AUDIENCE_UPDATES:-$(resolve_env_key "RESEND_AUDIENCE_UPDATES" "${NEXTJS_LOOKUP_FILES[@]}")}"
RESEND_AUDIENCE_SHIMEJI="${RESEND_AUDIENCE_SHIMEJI:-$(resolve_env_key "RESEND_AUDIENCE_SHIMEJI" "${NEXTJS_LOOKUP_FILES[@]}")}"
RESEND_AUDIENCE_COLLECTION="${RESEND_AUDIENCE_COLLECTION:-$(resolve_env_key "RESEND_AUDIENCE_COLLECTION" "${NEXTJS_LOOKUP_FILES[@]}")}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-$(resolve_env_key "OPENROUTER_API_KEY" "${NEXTJS_LOOKUP_FILES[@]}")}"
OPENROUTER_MODEL="${OPENROUTER_MODEL:-$(resolve_env_key "OPENROUTER_MODEL" "${NEXTJS_LOOKUP_FILES[@]}")}"
SUBSCRIBE_SIGNING_SECRET="${SUBSCRIBE_SIGNING_SECRET:-$(resolve_env_key "SUBSCRIBE_SIGNING_SECRET" "${NEXTJS_LOOKUP_FILES[@]}")}"
ELEVENLABS_DEFAULT_TTS_MODEL="${ELEVENLABS_DEFAULT_TTS_MODEL:-$(resolve_env_key "ELEVENLABS_DEFAULT_TTS_MODEL" "${NEXTJS_LOOKUP_FILES[@]}")}"
ELEVENLABS_DEFAULT_VOICE_ID="${ELEVENLABS_DEFAULT_VOICE_ID:-$(resolve_env_key "ELEVENLABS_DEFAULT_VOICE_ID" "${NEXTJS_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_SECRET="${OPENCLAW_PAIRING_SECRET:-$(resolve_env_key "OPENCLAW_PAIRING_SECRET" "${PAIRING_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_ADMIN_TOKEN="${OPENCLAW_PAIRING_ADMIN_TOKEN:-$(resolve_env_key "OPENCLAW_PAIRING_ADMIN_TOKEN" "${PAIRING_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_ISSUER_TOKEN="${OPENCLAW_PAIRING_ISSUER_TOKEN:-$(resolve_env_key "OPENCLAW_PAIRING_ISSUER_TOKEN" "${PAIRING_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL="${OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL:-$(resolve_env_key "OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL" "${PAIRING_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN="${OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN:-$(resolve_env_key "OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN" "${PAIRING_LOOKUP_FILES[@]}")}"
OPENCLAW_PAIRING_DEFAULT_AGENT_NAME="${OPENCLAW_PAIRING_DEFAULT_AGENT_NAME:-$(resolve_env_key "OPENCLAW_PAIRING_DEFAULT_AGENT_NAME" "${PAIRING_LOOKUP_FILES[@]}")}"

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
  printf "%s" "$value" | vercel_cli env add "$key" "$TARGET_ENV" >/dev/null
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
upsert_vercel_env "NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID" "${NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID:-}"
upsert_vercel_env "NEXT_PUBLIC_COMMISSION_CONTRACT_ID" "${NEXT_PUBLIC_COMMISSION_CONTRACT_ID:-}"
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
upsert_vercel_env "DATABASE_URL" "${DATABASE_URL:-}"
upsert_vercel_env "DIRECT_URL" "${DIRECT_URL:-}"
upsert_vercel_env "PINATA_JWT" "${PINATA_JWT:-}"
upsert_vercel_env "RESEND_API_KEY" "${RESEND_API_KEY:-}"
upsert_vercel_env "RESEND_FROM_EMAIL" "${RESEND_FROM_EMAIL:-}"
upsert_vercel_env "FEEDBACK_TO_EMAIL" "${FEEDBACK_TO_EMAIL:-}"
upsert_vercel_env "EGG_REQUEST_TO_EMAIL" "${EGG_REQUEST_TO_EMAIL:-}"
upsert_vercel_env "RESEND_AUDIENCE_UPDATES" "${RESEND_AUDIENCE_UPDATES:-}"
upsert_vercel_env "RESEND_AUDIENCE_SHIMEJI" "${RESEND_AUDIENCE_SHIMEJI:-}"
upsert_vercel_env "RESEND_AUDIENCE_COLLECTION" "${RESEND_AUDIENCE_COLLECTION:-}"
upsert_vercel_env "OPENROUTER_API_KEY" "${OPENROUTER_API_KEY:-}"
upsert_vercel_env "OPENROUTER_MODEL" "${OPENROUTER_MODEL:-}"
upsert_vercel_env "SUBSCRIBE_SIGNING_SECRET" "${SUBSCRIBE_SIGNING_SECRET:-}"
upsert_vercel_env "ELEVENLABS_DEFAULT_TTS_MODEL" "${ELEVENLABS_DEFAULT_TTS_MODEL:-}"
upsert_vercel_env "ELEVENLABS_DEFAULT_VOICE_ID" "${ELEVENLABS_DEFAULT_VOICE_ID:-}"
upsert_vercel_env "OPENCLAW_PAIRING_SECRET" "${OPENCLAW_PAIRING_SECRET:-}"
upsert_vercel_env "OPENCLAW_PAIRING_ADMIN_TOKEN" "${OPENCLAW_PAIRING_ADMIN_TOKEN:-}"
upsert_vercel_env "OPENCLAW_PAIRING_ISSUER_TOKEN" "${OPENCLAW_PAIRING_ISSUER_TOKEN:-}"
upsert_vercel_env "OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL" "${OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL:-}"
upsert_vercel_env "OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN" "${OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN:-}"
upsert_vercel_env "OPENCLAW_PAIRING_DEFAULT_AGENT_NAME" "${OPENCLAW_PAIRING_DEFAULT_AGENT_NAME:-}"
# Reflector oracle address (deploy-time config for marketplace contract; also stored in Vercel for reference)
if [ -z "${REFLECTOR_ORACLE_ADDRESS:-}" ]; then
  REFLECTOR_ORACLE_ADDRESS="$(resolve_env_key "REFLECTOR_ORACLE_ADDRESS" "${NEXTJS_LOOKUP_FILES[@]}")"
fi
upsert_vercel_env "REFLECTOR_ORACLE_ADDRESS" "${REFLECTOR_ORACLE_ADDRESS:-}"

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
    vercel_deploy_cli --prod
  else
    vercel_deploy_cli
  fi
else
  if [ "$TARGET_ENV" = "production" ]; then
    echo "Next step: vercel --cwd \"$NEXTJS_DIR\" --prod (or repo root if Vercel Root Directory is already shimeji-xlm/nextjs)"
  else
    echo "Next step: vercel --cwd \"$NEXTJS_DIR\""
  fi
fi
