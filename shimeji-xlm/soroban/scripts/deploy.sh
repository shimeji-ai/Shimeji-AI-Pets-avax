#!/usr/bin/env bash
set -euo pipefail

# Deploy Shimeji Soroban contracts with guided UX.
#
# Highlights:
# - Can run with no env vars (interactive wallet setup)
# - Testnet: auto-funds account via friendbot
# - Mainnet: shows funding address + QR and waits for funds
# - Prints exact frontend/Vercel linkage steps on success
#
# Optional env vars:
#   NETWORK=local|testnet|mainnet
#   STELLAR_SECRET_KEY / STELLAR_SECRET_SEED / STELLAR_SEED
#   STELLAR_MNEMONIC / STELLAR_SEED_PHRASE
#   STELLAR_IDENTITY_ALIAS=shimeji-deployer
#   FORCE_IDENTITY_REIMPORT=1
#   MIN_MAINNET_XLM=2
#   SECRET_BACKUP_PATH=./secret.txt
#   DISABLE_SECRET_BACKUP=1
#   FRONTEND_ENV_FILE=../nextjs/.env.local
#   SYNC_FRONTEND_ENV=1
#   SYNC_FRONTEND_ENV_NON_LOCAL=0|1
#   TESTNET_USDC_ISSUER=GBBD...
#   MAINNET_USDC_ISSUER=GA5Z...
#   ENABLE_TRUSTLESS_ESCROW=1|0 (default 1)
#   TRUSTLESS_ESCROW_XLM_ADDRESS=G...|C...
#   TRUSTLESS_ESCROW_USDC_ADDRESS=G...|C...
#   LOCAL_TRUSTLESS_ESCROW_ALIAS=shimeji-local-trustless-escrow
#   AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL=1|0 (default 1 for testnet fallback vault)
#   ENABLE_ONCHAIN_SOURCE_VERIFICATION=1|0 (default 1)
#   REQUIRE_ONCHAIN_SOURCE_VERIFICATION=1|0 (default 0)
#   CONTRACT_SOURCE_REPO=github:<owner>/<repo>
#   CONTRACT_SOURCE_COMMIT=<git-sha>
#   CONTRACT_SOURCE_SUBPATH=shimeji-xlm/soroban
#   STELLAR_RPC_HEADERS="X-API-Key: <value>" (optional for private RPC providers)
#   AUTO_CREATE_INITIAL_AUCTION=1|0 (default 1)
#   INITIAL_AUCTION_MIN_CURRENCY=usdc|xlm (default usdc)
#   INITIAL_AUCTION_MIN_AMOUNT=50 (human amount for selected currency)
#   INITIAL_AUCTION_XLM_USDC_RATE=1600000 (7 decimals; auto-fetched from CoinGecko/SDEX if available)
#   INITIAL_AUCTION_TOKEN_URI=ipfs://...

NETWORK="${NETWORK:-}"
SECRET="${STELLAR_SECRET_KEY:-${STELLAR_SECRET_SEED:-${STELLAR_SEED:-}}}"
MNEMONIC="${STELLAR_MNEMONIC:-${STELLAR_SEED_PHRASE:-}}"
IDENTITY="${STELLAR_IDENTITY_ALIAS:-shimeji-deployer}"
LOCAL_USDC_ISSUER="${LOCAL_USDC_ISSUER:-}"
LOCAL_USDC_ISSUER_ALIAS="${LOCAL_USDC_ISSUER_ALIAS:-shimeji-local-usdc-issuer}"
LOCAL_USDC_ISSUER_SECRET="${LOCAL_USDC_ISSUER_SECRET:-}"
LOCAL_USDC_ASSET_CODE="${LOCAL_USDC_ASSET_CODE:-USDC}"
TESTNET_USDC_ISSUER="${TESTNET_USDC_ISSUER:-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5}"
MAINNET_USDC_ISSUER="${MAINNET_USDC_ISSUER:-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN}"
ENABLE_TRUSTLESS_ESCROW="${ENABLE_TRUSTLESS_ESCROW:-1}"
TRUSTLESS_ESCROW_XLM_ADDRESS="${TRUSTLESS_ESCROW_XLM_ADDRESS:-}"
TRUSTLESS_ESCROW_USDC_ADDRESS="${TRUSTLESS_ESCROW_USDC_ADDRESS:-$TRUSTLESS_ESCROW_XLM_ADDRESS}"
LOCAL_TRUSTLESS_ESCROW_ALIAS="${LOCAL_TRUSTLESS_ESCROW_ALIAS:-shimeji-local-trustless-escrow}"
LOCAL_TRUSTLESS_ESCROW_ADDRESS="${LOCAL_TRUSTLESS_ESCROW_ADDRESS:-}"
AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL="${AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL:-1}"
FORCE_IDENTITY_REIMPORT="${FORCE_IDENTITY_REIMPORT:-0}"
MIN_MAINNET_XLM="${MIN_MAINNET_XLM:-2}"
SECRET_BACKUP_PATH="${SECRET_BACKUP_PATH:-}"
DISABLE_SECRET_BACKUP="${DISABLE_SECRET_BACKUP:-0}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-}"
SYNC_FRONTEND_ENV="${SYNC_FRONTEND_ENV:-1}"
SYNC_FRONTEND_ENV_NON_LOCAL="${SYNC_FRONTEND_ENV_NON_LOCAL:-0}"
ENABLE_ONCHAIN_SOURCE_VERIFICATION="${ENABLE_ONCHAIN_SOURCE_VERIFICATION:-1}"
REQUIRE_ONCHAIN_SOURCE_VERIFICATION="${REQUIRE_ONCHAIN_SOURCE_VERIFICATION:-0}"
CONTRACT_SOURCE_REPO="${CONTRACT_SOURCE_REPO:-}"
CONTRACT_SOURCE_COMMIT="${CONTRACT_SOURCE_COMMIT:-}"
CONTRACT_SOURCE_SUBPATH="${CONTRACT_SOURCE_SUBPATH:-shimeji-xlm/soroban}"
STELLAR_RPC_HEADERS="${STELLAR_RPC_HEADERS:-}"
AUTO_CREATE_INITIAL_AUCTION="${AUTO_CREATE_INITIAL_AUCTION:-1}"
INITIAL_AUCTION_MIN_CURRENCY="${INITIAL_AUCTION_MIN_CURRENCY:-usdc}"
INITIAL_AUCTION_MIN_AMOUNT="${INITIAL_AUCTION_MIN_AMOUNT:-50}"
INITIAL_AUCTION_XLM_USDC_RATE="${INITIAL_AUCTION_XLM_USDC_RATE:-1600000}"
INITIAL_AUCTION_TOKEN_URI="${INITIAL_AUCTION_TOKEN_URI:-ipfs://shimeji/default-auction.json}"

if [ -z "$NETWORK" ] && [ $# -ge 1 ]; then
  NETWORK="$1"
  shift
fi

if [ $# -gt 0 ]; then
  echo "Error: unexpected argument(s): $*" >&2
  echo "Usage: ./scripts/deploy.sh [local|testnet|mainnet]" >&2
  exit 1
fi

INTERACTIVE=0
if [ -t 0 ] && [ -t 1 ]; then
  INTERACTIVE=1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
PROJECT_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
ENV_CREDENTIALS_FILE="${ENV_CREDENTIALS_FILE:-$PROJECT_ROOT/.env}"
DEPLOY_ENV_EXPORT_DIR="${DEPLOY_ENV_EXPORT_DIR:-$PROJECT_ROOT/.deploy-env}"

if [ -z "$SECRET_BACKUP_PATH" ]; then
  SECRET_BACKUP_PATH="$PROJECT_ROOT/secret.txt"
fi
if [ -z "$FRONTEND_ENV_FILE" ]; then
  FRONTEND_ENV_FILE="$PROJECT_ROOT/nextjs/.env.local"
fi

SECRET_BACKUP_STATUS="not-written"
FRONTEND_ENV_STATUS="not-synced"
DEPLOY_ENV_EXPORT_STATUS="not-written"
TRUSTLESS_ESCROW_STATUS="disabled"
SOURCE_META_STATUS="not-set"
SOURCE_PUBLICATION_STATUS="not-run"
SOURCE_WASM_VERIFY_STATUS="not-run"
SOURCE_BUILD_INFO_STATUS="not-run"
SOURCE_VERIFICATION_STATUS="not-run"
RPC_API_KEY_STATUS="not-used"
NFT_WASM_HASH_ONCHAIN=""
AUCTION_WASM_HASH_ONCHAIN=""
MARKETPLACE_WASM_HASH_ONCHAIN=""
INITIAL_AUCTION_STATUS="not-run"
INITIAL_AUCTION_ID=""
INITIAL_AUCTION_STARTING_XLM=""
INITIAL_AUCTION_STARTING_USDC=""

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

die() {
  echo "Error: $*" >&2
  exit 1
}

normalize_secret() {
  local raw="${1:-}"
  printf "%s" "$raw" | tr -d '[:space:]'
}

normalize_mnemonic() {
  local raw="${1:-}"
  printf "%s" "$raw" | tr '\r\n\t' '   ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//'
}

# Tolerate wrapped/copy-pasted values from terminals or env files.
SECRET="$(normalize_secret "$SECRET")"
MNEMONIC="$(normalize_mnemonic "$MNEMONIC")"

read_masked_line() {
  local prompt_text="$1"
  local value=""
  local ch=""

  if [ "$INTERACTIVE" -ne 1 ]; then
    printf ""
    return 0
  fi

  printf "%s" "$prompt_text"
  while IFS= read -rsn1 ch < /dev/tty; do
    case "$ch" in
      $'\n'|$'\r')
        printf "\n"
        break
        ;;
      $'\177'|$'\b')
        if [ -n "$value" ]; then
          value="${value%?}"
          printf "\b \b"
        fi
        ;;
      *)
        value+="$ch"
        printf "*"
        ;;
    esac
  done
  printf "%s" "$value"
}

load_credentials_from_env_file() {
  local loaded_secret loaded_mnemonic

  if [ ! -f "$ENV_CREDENTIALS_FILE" ]; then
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  . "$ENV_CREDENTIALS_FILE"
  set +a

  loaded_secret="${STELLAR_SECRET_KEY:-${STELLAR_SECRET_SEED:-${STELLAR_SEED:-}}}"
  loaded_mnemonic="${STELLAR_MNEMONIC:-${STELLAR_SEED_PHRASE:-}}"

  loaded_secret="$(normalize_secret "$loaded_secret")"
  loaded_mnemonic="$(normalize_mnemonic "$loaded_mnemonic")"

  if [ -n "$loaded_secret" ]; then
    SECRET="$loaded_secret"
    MNEMONIC=""
    return 0
  fi

  if [ -n "$loaded_mnemonic" ]; then
    MNEMONIC="$loaded_mnemonic"
    SECRET=""
    return 0
  fi

  return 1
}

import_credentials_interactive() {
  local choice
  local secret_input mnemonic_input answer

  while true; do
    echo "Choose credential input method:"
    echo "  1) Load from .env file (and wait until it is filled)"
    echo "  2) Paste secret key now (masked with *)"
    echo "  3) Paste seed phrase now (masked with *)"
    echo "  4) Back"
    echo "Examples:"
    echo "  Secret key: SHJKFDSFKL..."
    echo "  Seed phrase: cannon bridge local ..."
    read -r -p "Choice [1]: " choice

    case "${choice:-1}" in
      1)
        echo "Open and edit: $ENV_CREDENTIALS_FILE"
        echo "Add one of:"
        echo "  STELLAR_SECRET_SEED=\"SHJKFDSFKL...\""
        echo "  STELLAR_MNEMONIC=\"cannon bridge local ...\""
        while true; do
          if load_credentials_from_env_file; then
            if [ -n "$SECRET" ]; then
              echo "==> Loaded secret key from .env."
              import_secret "$SECRET"
            else
              echo "==> Loaded seed phrase from .env."
              import_mnemonic "$MNEMONIC"
            fi
            return 0
          fi
          read -r -p "Credentials not found yet. Press [Enter] to re-check .env or type 'cancel': " answer
          if [ "$answer" = "cancel" ]; then
            break
          fi
        done
        ;;
      2)
        secret_input="$(read_masked_line "Paste secret key (S...) > ")"
        secret_input="$(normalize_secret "$secret_input")"
        [ -z "$secret_input" ] && { echo "Secret key cannot be empty."; continue; }
        SECRET="$secret_input"
        MNEMONIC=""
        echo "==> Importing secret key into alias '$IDENTITY'..."
        import_secret "$SECRET"
        return 0
        ;;
      3)
        mnemonic_input="$(read_masked_line "Paste 12/24-word seed phrase > ")"
        mnemonic_input="$(normalize_mnemonic "$mnemonic_input")"
        [ -z "$mnemonic_input" ] && { echo "Seed phrase cannot be empty."; continue; }
        MNEMONIC="$mnemonic_input"
        SECRET=""
        echo "==> Importing mnemonic into alias '$IDENTITY'..."
        import_mnemonic "$MNEMONIC"
        return 0
        ;;
      4)
        return 1
        ;;
      *)
        echo "Invalid choice."
        ;;
    esac
  done
}

prompt_default() {
  local message="$1"
  local default_value="$2"
  local reply

  if [ "$INTERACTIVE" -ne 1 ]; then
    echo "$default_value"
    return
  fi

  read -r -p "$message [$default_value]: " reply
  if [ -z "$reply" ]; then
    echo "$default_value"
  else
    echo "$reply"
  fi
}

confirm() {
  local message="$1"
  local default_answer="${2:-y}"
  local reply

  if [ "$INTERACTIVE" -ne 1 ]; then
    if [ "$default_answer" = "y" ]; then
      return 0
    fi
    return 1
  fi

  if [ "$default_answer" = "y" ]; then
    read -r -p "$message [Y/n]: " reply
    reply="${reply:-y}"
  else
    read -r -p "$message [y/N]: " reply
    reply="${reply:-n}"
  fi

  case "$reply" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

select_network() {
  if [ -n "$NETWORK" ]; then
    case "$NETWORK" in
      local|testnet|mainnet) ;;
      *) die "NETWORK must be 'local', 'testnet' or 'mainnet'" ;;
    esac
    return
  fi

  if [ "$INTERACTIVE" -eq 1 ]; then
    echo "Select network:"
    echo "  1) local"
    echo "  2) testnet (recommended)"
    echo "  3) mainnet"
    local choice
    read -r -p "Choice [2]: " choice
    case "${choice:-2}" in
      1) NETWORK="local" ;;
      2) NETWORK="testnet" ;;
      3) NETWORK="mainnet" ;;
      *) NETWORK="testnet" ;;
    esac
  else
    NETWORK="testnet"
  fi
}

configure_network() {
  if [ "$NETWORK" = "local" ]; then
    RPC_URL="${STELLAR_RPC_URL:-http://localhost:8000/rpc}"
    PASSPHRASE="Standalone Network ; February 2017"
    USDC_ISSUER="${LOCAL_USDC_ISSUER:-$TESTNET_USDC_ISSUER}"
    HORIZON_URL="http://localhost:8000"
    LOCAL_FRIENDBOT_URL="${LOCAL_FRIENDBOT_URL:-http://localhost:8000/friendbot}"
    EXPLORER_ROOT="(local network - no public explorer)"
  elif [ "$NETWORK" = "mainnet" ]; then
    RPC_URL="${STELLAR_RPC_URL:-https://mainnet.sorobanrpc.com}"
    PASSPHRASE="Public Global Stellar Network ; September 2015"
    USDC_ISSUER="$MAINNET_USDC_ISSUER"
    HORIZON_URL="https://horizon.stellar.org"
    EXPLORER_ROOT="https://stellar.expert/explorer/public"
  else
    RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
    PASSPHRASE="Test SDF Network ; September 2015"
    USDC_ISSUER="$TESTNET_USDC_ISSUER"
    HORIZON_URL="https://horizon-testnet.stellar.org"
    EXPLORER_ROOT="https://stellar.expert/explorer/testnet"
  fi
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

escape_for_double_quotes() {
  local raw="${1:-}"
  printf "%s" "$raw" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

extract_github_slug_from_remote() {
  local remote_url="$1"
  local slug=""

  case "$remote_url" in
    https://github.com/*)
      slug="${remote_url#https://github.com/}"
      ;;
    git@github.com:*)
      slug="${remote_url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      slug="${remote_url#ssh://git@github.com/}"
      ;;
  esac

  slug="${slug%.git}"
  slug="${slug#/}"
  if [[ "$slug" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    printf "github:%s" "$slug"
  fi
}

detect_contract_source_repo() {
  local remote_url
  remote_url="$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || true)"
  if [ -z "$remote_url" ]; then
    return 0
  fi
  extract_github_slug_from_remote "$remote_url"
}

detect_contract_source_commit() {
  git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || true
}

valid_source_repo_value() {
  local value="$1"
  [[ "$value" =~ ^github:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]
}

normalize_currency() {
  local raw="$1"
  printf "%s" "$raw" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'
}

human_amount_to_stroops() {
  local amount="$1"
  local parsed=""

  parsed="$(awk -v v="$amount" '
    BEGIN {
      if (v !~ /^[0-9]+([.][0-9]+)?$/) { exit 1 }
      split(v, parts, ".")
      intp = parts[1]
      frac = (length(parts) >= 2 ? parts[2] : "")
      if (length(frac) > 7) { frac = substr(frac, 1, 7) }
      while (length(frac) < 7) { frac = frac "0" }
      gsub(/^0+/, "", intp)
      if (intp == "") { intp = "0" }
      out = intp frac
      gsub(/^0+/, "", out)
      if (out == "") { out = "0" }
      print out
    }
  ' 2>/dev/null)" || true

  if [ -z "$parsed" ] || [ "$parsed" = "0" ]; then
    return 1
  fi

  printf "%s" "$parsed"
}

fetch_xlm_usdc_rate() {
  local price rate

  # Try CoinGecko first
  if need_cmd curl && need_cmd jq; then
    price="$(curl -sf --max-time 10 \
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd' \
      2>/dev/null | jq -r '.stellar.usd // empty' 2>/dev/null)" || true

    if [ -n "$price" ] && [ "$price" != "null" ]; then
      rate="$(echo "$price * 10000000" | bc 2>/dev/null | sed 's/\..*//')" || true
      if [ -n "$rate" ] && [ "$rate" -gt 0 ] 2>/dev/null; then
        echo "Fetched XLM/USD rate from CoinGecko: \$${price} (${rate} stroops)" >&2
        printf "%s" "$rate"
        return 0
      fi
    fi
  fi

  # Fallback: Stellar SDEX (Horizon orderbook)
  if need_cmd curl && need_cmd jq; then
    local horizon_base
    case "$NETWORK" in
      mainnet) horizon_base="https://horizon.stellar.org" ;;
      *)       horizon_base="https://horizon-testnet.stellar.org" ;;
    esac
    local usdc_issuer
    case "$NETWORK" in
      mainnet) usdc_issuer="$MAINNET_USDC_ISSUER" ;;
      *)       usdc_issuer="$TESTNET_USDC_ISSUER" ;;
    esac
    price="$(curl -sf --max-time 10 \
      "${horizon_base}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${usdc_issuer}&limit=1" \
      2>/dev/null | jq -r '.asks[0].price // empty' 2>/dev/null)" || true

    if [ -n "$price" ] && [ "$price" != "null" ]; then
      rate="$(echo "$price * 10000000" | bc 2>/dev/null | sed 's/\..*//')" || true
      if [ -n "$rate" ] && [ "$rate" -gt 0 ] 2>/dev/null; then
        echo "Fetched XLM/USDC rate from Stellar DEX: ${price} (${rate} stroops)" >&2
        printf "%s" "$rate"
        return 0
      fi
    fi
  fi

  echo "Could not fetch live XLM rate, using env/default value." >&2
  return 1
}

prepare_initial_auction_config() {
  local default_amount
  local choice

  INITIAL_AUCTION_MIN_CURRENCY="$(normalize_currency "$INITIAL_AUCTION_MIN_CURRENCY")"

  if [ "$AUTO_CREATE_INITIAL_AUCTION" != "1" ]; then
    INITIAL_AUCTION_STATUS="disabled"
    return
  fi

  if [ "$INTERACTIVE" -eq 1 ]; then
    if ! confirm "Create initial auction automatically right after deploy?" "y"; then
      AUTO_CREATE_INITIAL_AUCTION="0"
      INITIAL_AUCTION_STATUS="disabled-by-user"
      return
    fi

    echo "Set minimum bid currency for initial auction:"
    echo "  1) USDC"
    echo "  2) XLM"
    if [ "$INITIAL_AUCTION_MIN_CURRENCY" = "xlm" ]; then
      read -r -p "Choice [2]: " choice
      choice="${choice:-2}"
    else
      read -r -p "Choice [1]: " choice
      choice="${choice:-1}"
    fi
    case "$choice" in
      2) INITIAL_AUCTION_MIN_CURRENCY="xlm" ;;
      *) INITIAL_AUCTION_MIN_CURRENCY="usdc" ;;
    esac

    if [ "$INITIAL_AUCTION_MIN_CURRENCY" = "xlm" ]; then
      default_amount="500"
    else
      default_amount="50"
    fi
    INITIAL_AUCTION_MIN_AMOUNT="$(prompt_default "Initial minimum amount (${INITIAL_AUCTION_MIN_CURRENCY^^})" "${INITIAL_AUCTION_MIN_AMOUNT:-$default_amount}")"
    local live_rate
    live_rate="$(fetch_xlm_usdc_rate)" || true
    if [ -n "$live_rate" ]; then
      INITIAL_AUCTION_XLM_USDC_RATE="$live_rate"
    fi
    INITIAL_AUCTION_XLM_USDC_RATE="$(prompt_default "XLM/USDC rate (7 decimals, 1600000 = 0.16)" "$INITIAL_AUCTION_XLM_USDC_RATE")"
    INITIAL_AUCTION_TOKEN_URI="$(prompt_default "Initial auction token URI" "$INITIAL_AUCTION_TOKEN_URI")"
  fi

  case "$INITIAL_AUCTION_MIN_CURRENCY" in
    usdc|xlm) ;;
    *) die "INITIAL_AUCTION_MIN_CURRENCY must be usdc or xlm. Current value: $INITIAL_AUCTION_MIN_CURRENCY" ;;
  esac

  # Auto-fetch rate if still at default value in non-interactive mode
  if [ "$INTERACTIVE" -ne 1 ] && [ "$INITIAL_AUCTION_XLM_USDC_RATE" = "1000000" ]; then
    local live_rate
    live_rate="$(fetch_xlm_usdc_rate)" || true
    if [ -n "$live_rate" ]; then
      INITIAL_AUCTION_XLM_USDC_RATE="$live_rate"
    fi
  fi

  if ! [[ "$INITIAL_AUCTION_XLM_USDC_RATE" =~ ^[0-9]+$ ]] || [ "$INITIAL_AUCTION_XLM_USDC_RATE" -le 0 ]; then
    die "INITIAL_AUCTION_XLM_USDC_RATE must be a positive integer (7 decimals)."
  fi

  local min_amount_stroops
  min_amount_stroops="$(human_amount_to_stroops "$INITIAL_AUCTION_MIN_AMOUNT")" || die "INITIAL_AUCTION_MIN_AMOUNT must be a positive number (up to 7 decimals)."

  if [ "$INITIAL_AUCTION_MIN_CURRENCY" = "usdc" ]; then
    INITIAL_AUCTION_STARTING_USDC="$min_amount_stroops"
    INITIAL_AUCTION_STARTING_XLM="$(( (min_amount_stroops * 10000000 + INITIAL_AUCTION_XLM_USDC_RATE - 1) / INITIAL_AUCTION_XLM_USDC_RATE ))"
  else
    INITIAL_AUCTION_STARTING_XLM="$min_amount_stroops"
    INITIAL_AUCTION_STARTING_USDC="$(( (min_amount_stroops * INITIAL_AUCTION_XLM_USDC_RATE + 10000000 - 1) / 10000000 ))"
  fi

  if [ -z "$INITIAL_AUCTION_TOKEN_URI" ]; then
    die "INITIAL_AUCTION_TOKEN_URI cannot be empty when AUTO_CREATE_INITIAL_AUCTION=1."
  fi

  INITIAL_AUCTION_STATUS="ready"
}

is_api_key_error_output() {
  local output_file="$1"
  grep -Eqi "(401|403|forbidden|unauthorized|api[ _-]?key|access denied)" "$output_file"
}

prompt_and_configure_rpc_api_key() {
  local verify_target="$1"
  local header_name api_key escaped_headers

  if [ "$INTERACTIVE" -ne 1 ]; then
    return 1
  fi
  if [ "$NETWORK" = "local" ]; then
    return 1
  fi
  if ! confirm "Verification for ${verify_target} may require an RPC API key. Configure now?" "y"; then
    RPC_API_KEY_STATUS="skipped"
    return 1
  fi

  read -r -p "RPC API header name [X-API-Key]: " header_name
  header_name="${header_name:-X-API-Key}"

  api_key="$(read_masked_line "RPC API key value > ")"
  api_key="$(printf "%s" "$api_key" | tr -d '\r\n')"
  if [ -z "$api_key" ]; then
    echo "Empty API key. Skipping API header setup."
    RPC_API_KEY_STATUS="empty"
    return 1
  fi

  STELLAR_RPC_HEADERS="$header_name: $api_key"
  export STELLAR_RPC_HEADERS
  RPC_API_KEY_STATUS="session-only"
  echo "==> Using RPC header for this session: $header_name"

  if confirm "Save STELLAR_RPC_HEADERS to $ENV_CREDENTIALS_FILE for future deploys?" "n"; then
    touch "$ENV_CREDENTIALS_FILE"
    escaped_headers="$(escape_for_double_quotes "$STELLAR_RPC_HEADERS")"
    upsert_env_value "$ENV_CREDENTIALS_FILE" "STELLAR_RPC_HEADERS" "\"$escaped_headers\""
    RPC_API_KEY_STATUS="saved-to-env"
    echo "==> Saved STELLAR_RPC_HEADERS in $ENV_CREDENTIALS_FILE"
  fi

  return 0
}

prepare_source_verification() {
  local prompted_repo
  local escaped_repo escaped_commit escaped_subpath

  if [ "$ENABLE_ONCHAIN_SOURCE_VERIFICATION" != "1" ]; then
    SOURCE_META_STATUS="disabled"
    SOURCE_PUBLICATION_STATUS="disabled"
    return
  fi

  if [ -z "$CONTRACT_SOURCE_REPO" ]; then
    CONTRACT_SOURCE_REPO="$(detect_contract_source_repo)"
    if [ -n "$CONTRACT_SOURCE_REPO" ]; then
      SOURCE_META_STATUS="auto-repo"
    fi
  fi

  if [ -z "$CONTRACT_SOURCE_COMMIT" ]; then
    CONTRACT_SOURCE_COMMIT="$(detect_contract_source_commit)"
    if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
      SOURCE_META_STATUS="auto-repo+commit"
    fi
  fi

  if [ -n "$CONTRACT_SOURCE_REPO" ] && ! valid_source_repo_value "$CONTRACT_SOURCE_REPO"; then
    die "CONTRACT_SOURCE_REPO must use format github:<owner>/<repo>. Current value: $CONTRACT_SOURCE_REPO"
  fi

  if [ "$NETWORK" != "local" ] && [ -z "$CONTRACT_SOURCE_REPO" ] && [ "$INTERACTIVE" -eq 1 ]; then
    echo "No source repository metadata detected for explorer publication."
    if confirm "Set CONTRACT_SOURCE_REPO now (recommended so explorer can show source links)?" "y"; then
      read -r -p "CONTRACT_SOURCE_REPO (github:<owner>/<repo>) > " prompted_repo
      prompted_repo="$(printf "%s" "$prompted_repo" | tr -d '[:space:]')"
      if [ -n "$prompted_repo" ]; then
        if ! valid_source_repo_value "$prompted_repo"; then
          die "Invalid CONTRACT_SOURCE_REPO format: $prompted_repo (expected github:<owner>/<repo>)"
        fi
        CONTRACT_SOURCE_REPO="$prompted_repo"
        SOURCE_META_STATUS="prompted-repo"
      fi
    fi
  fi

  if [ -n "$CONTRACT_SOURCE_REPO" ] && [ "$INTERACTIVE" -eq 1 ] && [ "$NETWORK" != "local" ]; then
    if confirm "Persist source verification defaults in $ENV_CREDENTIALS_FILE?" "n"; then
      touch "$ENV_CREDENTIALS_FILE"
      escaped_repo="$(escape_for_double_quotes "$CONTRACT_SOURCE_REPO")"
      escaped_commit="$(escape_for_double_quotes "$CONTRACT_SOURCE_COMMIT")"
      escaped_subpath="$(escape_for_double_quotes "$CONTRACT_SOURCE_SUBPATH")"
      upsert_env_value "$ENV_CREDENTIALS_FILE" "CONTRACT_SOURCE_REPO" "\"$escaped_repo\""
      if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
        upsert_env_value "$ENV_CREDENTIALS_FILE" "CONTRACT_SOURCE_COMMIT" "\"$escaped_commit\""
      fi
      upsert_env_value "$ENV_CREDENTIALS_FILE" "CONTRACT_SOURCE_SUBPATH" "\"$escaped_subpath\""
      echo "==> Saved source verification defaults to $ENV_CREDENTIALS_FILE"
    fi
  fi

  if [ -n "$CONTRACT_SOURCE_REPO" ] && [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
    if [ "$SOURCE_META_STATUS" = "not-set" ]; then
      SOURCE_META_STATUS="configured"
    fi
  elif [ -n "$CONTRACT_SOURCE_REPO" ]; then
    SOURCE_META_STATUS="repo-only"
  else
    SOURCE_META_STATUS="missing-repo"
  fi
}

identity_exists() {
  stellar keys address "$IDENTITY" >/dev/null 2>&1
}

import_secret() {
  local secret_value="$1"
  printf "%s\n" "$secret_value" | stellar keys add "$IDENTITY" --secret-key --overwrite >/dev/null
}

import_mnemonic() {
  local mnemonic_value="$1"
  printf "%s\n" "$mnemonic_value" | stellar keys add "$IDENTITY" --seed-phrase --overwrite >/dev/null
}

generate_identity() {
  if [ "$NETWORK" = "testnet" ]; then
    # --fund helps first-time UX on testnet; we also run explicit funding afterwards.
    stellar keys generate "$IDENTITY" --overwrite --fund \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$PASSPHRASE" >/dev/null
  else
    stellar keys generate "$IDENTITY" --overwrite >/dev/null
  fi

  echo "Created identity alias '$IDENTITY'."

  if [ "$INTERACTIVE" -eq 1 ] && confirm "Show seed phrase now for backup?" "n"; then
    echo "Seed phrase for '$IDENTITY':"
    stellar keys secret "$IDENTITY" --phrase
  fi
}

choose_identity_setup_interactive() {
  local choice
  echo "Identity alias '$IDENTITY' is not ready yet."
  echo "Choose how to continue:"
  echo "  1) Create new wallet (recommended)"
  echo "  2) Use existing wallet (import credentials)"
  echo "  3) Abort"
  read -r -p "Choice [1]: " choice

  case "${choice:-1}" in
    1)
      echo "==> Generating wallet alias '$IDENTITY'..."
      generate_identity
      ;;
    2)
      import_credentials_interactive || choose_identity_setup_interactive
      ;;
    3)
      die "Deployment cancelled by user"
      ;;
    *)
      die "Invalid choice"
      ;;
  esac
}

choose_existing_identity_interactive() {
  echo "Identity alias '$IDENTITY' already exists."
  if confirm "Overwrite local wallet alias '$IDENTITY' with a new wallet?" "n"; then
    echo "==> Generating new wallet for alias '$IDENTITY'..."
    generate_identity
    return
  fi

  echo "==> Using existing alias '$IDENTITY'."
}

setup_identity() {
  if [ "$INTERACTIVE" -eq 1 ] && [ -z "${STELLAR_IDENTITY_ALIAS:-}" ]; then
    IDENTITY="$(prompt_default "Identity alias" "$IDENTITY")"
  fi

  local have_alias=0
  if identity_exists; then
    have_alias=1
  fi

  local have_creds=0
  if [ -n "$SECRET" ] || [ -n "$MNEMONIC" ]; then
    have_creds=1
  fi

  if [ "$have_alias" -eq 1 ]; then
    if [ "$FORCE_IDENTITY_REIMPORT" = "1" ]; then
      echo "==> FORCE_IDENTITY_REIMPORT=1, replacing alias '$IDENTITY'."
      if [ -n "$SECRET" ]; then
        import_secret "$SECRET"
      elif [ -n "$MNEMONIC" ]; then
        import_mnemonic "$MNEMONIC"
      elif [ "$INTERACTIVE" -eq 1 ]; then
        choose_identity_setup_interactive
      else
        die "FORCE_IDENTITY_REIMPORT=1 set but no credentials provided in non-interactive mode"
      fi
    elif [ "$have_creds" -eq 1 ]; then
      # If credentials were explicitly passed, prefer using them.
      if [ "$INTERACTIVE" -eq 1 ] && ! confirm "Credentials were provided and alias already exists. Replace alias '$IDENTITY'?" "y"; then
        echo "==> Keeping existing alias '$IDENTITY'."
      else
        echo "==> Replacing alias '$IDENTITY' with provided credentials..."
        if [ -n "$SECRET" ]; then
          import_secret "$SECRET"
        else
          import_mnemonic "$MNEMONIC"
        fi
      fi
    elif [ "$INTERACTIVE" -eq 1 ]; then
      choose_existing_identity_interactive
    else
      echo "==> Using existing alias '$IDENTITY'."
    fi
  else
    if [ "$have_creds" -eq 1 ]; then
      echo "==> Importing provided credentials into new alias '$IDENTITY'..."
      if [ -n "$SECRET" ]; then
        import_secret "$SECRET"
      else
        import_mnemonic "$MNEMONIC"
      fi
    elif [ "$INTERACTIVE" -eq 1 ]; then
      choose_identity_setup_interactive
    else
      die "No identity alias found and no credentials provided. Run interactively or pass STELLAR_MNEMONIC / STELLAR_SECRET_SEED."
    fi
  fi

  ADMIN="$(stellar keys address "$IDENTITY")"
  echo "  Admin:      $ADMIN"
}

get_identity_secret_key() {
  local key_value
  key_value="$(stellar -q keys secret "$IDENTITY" 2>/dev/null || true)"
  key_value="$(printf "%s" "$key_value" | tr -d '\r\n\t ')"
  if [[ "$key_value" =~ ^S[A-Z2-7]+$ ]]; then
    printf "%s" "$key_value"
  fi
}

get_alias_secret_key() {
  local alias_name="$1"
  local key_value
  key_value="$(stellar -q keys secret "$alias_name" 2>/dev/null || true)"
  key_value="$(printf "%s" "$key_value" | tr -d '\r\n\t ')"
  if [[ "$key_value" =~ ^S[A-Z2-7]+$ ]]; then
    printf "%s" "$key_value"
  fi
}

get_identity_seed_phrase() {
  local phrase_value
  local words_count

  phrase_value="$(stellar -q keys secret "$IDENTITY" --phrase 2>/dev/null || true)"
  phrase_value="$(printf "%s" "$phrase_value" | tr '\r\n\t' '   ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
  words_count="$(printf "%s\n" "$phrase_value" | awk '{print NF}')"

  if [ "$words_count" = "12" ] || [ "$words_count" = "24" ]; then
    printf "%s" "$phrase_value"
  fi
}

write_secret_backup_file() {
  local secret_value
  local phrase_value
  local backup_dir

  if [ "$DISABLE_SECRET_BACKUP" = "1" ]; then
    SECRET_BACKUP_STATUS="disabled"
    return
  fi

  if [ -f "$SECRET_BACKUP_PATH" ]; then
    SECRET_BACKUP_STATUS="existing"
    echo "==> Secret backup already exists at: $SECRET_BACKUP_PATH"
    return
  fi

  secret_value="$(get_identity_secret_key)"
  phrase_value="$(get_identity_seed_phrase)"

  if [ -z "$secret_value" ] && [ -z "$phrase_value" ]; then
    SECRET_BACKUP_STATUS="unavailable"
    echo "==> Could not export secret/seed phrase from identity '$IDENTITY'."
    return
  fi

  backup_dir="$(dirname "$SECRET_BACKUP_PATH")"
  mkdir -p "$backup_dir"

  umask 077
  {
    echo "# Shimeji Soroban wallet backup (local file)"
    echo "# Created (UTC): $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "identity_alias=$IDENTITY"
    echo "network_last_used=$NETWORK"
    echo "public_key=$ADMIN"
    if [ -n "$secret_value" ]; then
      echo "secret_key=$secret_value"
    else
      echo "secret_key=(unavailable)"
    fi
    if [ -n "$phrase_value" ]; then
      echo "seed_phrase=\"$phrase_value\""
    else
      echo "seed_phrase=(unavailable)"
    fi
  } > "$SECRET_BACKUP_PATH"

  chmod 600 "$SECRET_BACKUP_PATH" 2>/dev/null || true
  SECRET_BACKUP_STATUS="created"
  echo "==> Saved wallet backup to: $SECRET_BACKUP_PATH"
  echo "    Keep this file offline/private and never commit it."
}

ensure_local_network_running() {
  if ! need_cmd curl; then
    die "curl is required to verify local Soroban RPC. Install curl and re-run."
  fi

  if curl -sS --max-time 3 "$RPC_URL" >/dev/null 2>&1; then
    return
  fi

  die "Local Soroban network is not reachable at $RPC_URL. Start it first with: pnpm chain"
}

fund_local() {
  ensure_local_network_running
  echo "==> Funding account on local network via friendbot..."
  curl -fsS "${LOCAL_FRIENDBOT_URL}?addr=$ADMIN" >/dev/null
  echo "    Local funding requested via ${LOCAL_FRIENDBOT_URL}."
}

fund_testnet() {
  echo "==> Funding account on testnet..."
  if stellar keys fund "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" >/dev/null 2>&1; then
    echo "    Testnet funding completed via 'stellar keys fund'."
    return
  fi

  echo "    'stellar keys fund' failed, falling back to friendbot..."
  curl -fsS "https://friendbot.stellar.org/?addr=$ADMIN" >/dev/null
  echo "    Testnet funding requested via friendbot."
}

setup_local_usdc_issuer() {
  if [ "$NETWORK" != "local" ]; then
    return
  fi

  if [ -n "$LOCAL_USDC_ISSUER" ]; then
    USDC_ISSUER="$LOCAL_USDC_ISSUER"
    if [ -z "$LOCAL_USDC_ISSUER_SECRET" ] && stellar keys address "$LOCAL_USDC_ISSUER_ALIAS" >/dev/null 2>&1; then
      local alias_address
      alias_address="$(stellar keys address "$LOCAL_USDC_ISSUER_ALIAS")"
      if [ "$alias_address" = "$LOCAL_USDC_ISSUER" ]; then
        LOCAL_USDC_ISSUER_SECRET="$(get_alias_secret_key "$LOCAL_USDC_ISSUER_ALIAS")"
      fi
    fi
    if [ -z "$LOCAL_USDC_ISSUER_SECRET" ]; then
      die "LOCAL_USDC_ISSUER is set to '$LOCAL_USDC_ISSUER' but LOCAL_USDC_ISSUER_SECRET is missing.
Provide LOCAL_USDC_ISSUER_SECRET (for that issuer), or unset LOCAL_USDC_ISSUER to auto-create a local issuer during deploy."
    fi
    echo "==> Using provided local USDC issuer: $USDC_ISSUER"
    return
  fi

  if stellar keys address "$LOCAL_USDC_ISSUER_ALIAS" >/dev/null 2>&1; then
    echo "==> Reusing local USDC issuer alias '$LOCAL_USDC_ISSUER_ALIAS'..."
  else
    echo "==> Creating local USDC issuer alias '$LOCAL_USDC_ISSUER_ALIAS'..."
    stellar keys generate "$LOCAL_USDC_ISSUER_ALIAS" --overwrite >/dev/null
  fi

  LOCAL_USDC_ISSUER="$(stellar keys address "$LOCAL_USDC_ISSUER_ALIAS")"
  USDC_ISSUER="$LOCAL_USDC_ISSUER"
  LOCAL_USDC_ISSUER_SECRET="$(get_alias_secret_key "$LOCAL_USDC_ISSUER_ALIAS")"

  if [ -n "$LOCAL_FRIENDBOT_URL" ]; then
    echo "==> Funding local USDC issuer account..."
    curl -fsS "${LOCAL_FRIENDBOT_URL}?addr=$LOCAL_USDC_ISSUER" >/dev/null || true
  fi
}

prepare_trustless_escrow_config() {
  if [ "$ENABLE_TRUSTLESS_ESCROW" != "1" ]; then
    TRUSTLESS_ESCROW_STATUS="disabled"
    return
  fi

  if [ "$NETWORK" = "local" ]; then
    TRUSTLESS_ESCROW_STATUS="local-mock-pending-deploy"
    return
  fi

  if [ -z "$TRUSTLESS_ESCROW_XLM_ADDRESS" ] || [ -z "$TRUSTLESS_ESCROW_USDC_ADDRESS" ]; then
    if [ "$NETWORK" = "testnet" ] && [ "$AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL" = "1" ]; then
      TRUSTLESS_ESCROW_STATUS="testnet-fallback-vault-pending-deploy"
      return
    fi

    if [ "$NETWORK" = "mainnet" ] && [ "$INTERACTIVE" -eq 1 ] && [ "$AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL" = "1" ]; then
      echo "Trustless escrow destination addresses are missing for mainnet."
      if confirm "Auto-deploy fallback escrow vault contract on mainnet and route bids there?" "n"; then
        TRUSTLESS_ESCROW_STATUS="mainnet-fallback-vault-pending-deploy"
        return
      fi
    fi

    die "Trustless escrow is enabled but destination addresses are missing.
Set both:
  TRUSTLESS_ESCROW_XLM_ADDRESS=<Trustless Work escrow destination for XLM bids>
  TRUSTLESS_ESCROW_USDC_ADDRESS=<Trustless Work escrow destination for USDC bids>

Or allow testnet fallback vault auto-deploy:
  AUTO_DEPLOY_TRUSTLESS_ESCROW_NON_LOCAL=1

If you want to deploy without Trustless escrow routing, set:
  ENABLE_TRUSTLESS_ESCROW=0"
  fi

  TRUSTLESS_ESCROW_STATUS="configured-external"
}

upsert_env_value() {
  local env_file="$1"
  local env_key="$2"
  local env_value="$3"
  local tmp_file

  tmp_file="$(mktemp)"
  awk -v key="$env_key" -v value="$env_value" '
    BEGIN { updated = 0 }
    {
      if ($0 ~ ("^" key "=")) {
        print key "=" value
        updated = 1
      } else {
        print $0
      }
    }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$env_file" > "$tmp_file"
  mv "$tmp_file" "$env_file"
}

remove_env_value() {
  local env_file="$1"
  local env_key="$2"
  local tmp_file

  tmp_file="$(mktemp)"
  awk -v key="$env_key" '
    $0 !~ ("^" key "=") { print $0 }
  ' "$env_file" > "$tmp_file"
  mv "$tmp_file" "$env_file"
}

sync_frontend_env_local() {
  local frontend_dir

  if [ "$SYNC_FRONTEND_ENV" != "1" ]; then
    FRONTEND_ENV_STATUS="disabled"
    return
  fi

  if [ "$NETWORK" != "local" ] && [ "$SYNC_FRONTEND_ENV_NON_LOCAL" != "1" ]; then
    FRONTEND_ENV_STATUS="skipped-non-local"
    return
  fi

  frontend_dir="$(dirname "$FRONTEND_ENV_FILE")"
  if [ ! -d "$frontend_dir" ]; then
    FRONTEND_ENV_STATUS="missing-nextjs-dir"
    echo "==> Could not sync local frontend env: directory not found: $frontend_dir"
    return
  fi

  touch "$FRONTEND_ENV_FILE"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_NFT_CONTRACT_ID" "$NFT_ID"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_AUCTION_CONTRACT_ID" "$AUCTION_ID"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID" "$MARKETPLACE_ID"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_RPC_URL" "$RPC_URL"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_HORIZON_URL" "$HORIZON_URL"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" "\"$PASSPHRASE\""
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_NETWORK" "$NETWORK"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_USDC_ISSUER" "$USDC_ISSUER"
  if [ "$ENABLE_TRUSTLESS_ESCROW" = "1" ]; then
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_ESCROW_PROVIDER" "trustless_work"
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS" "$TRUSTLESS_ESCROW_XLM_ADDRESS"
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS" "$TRUSTLESS_ESCROW_USDC_ADDRESS"
  else
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_ESCROW_PROVIDER" "internal"
    remove_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS"
    remove_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS"
  fi

  if [ "$NETWORK" = "local" ]; then
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_FRIENDBOT_URL" "$LOCAL_FRIENDBOT_URL"
    upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_USDC_ISSUER" "$USDC_ISSUER"
    upsert_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ISSUER_SECRET" "$LOCAL_USDC_ISSUER_SECRET"
    upsert_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ASSET_CODE" "$LOCAL_USDC_ASSET_CODE"
    FRONTEND_ENV_STATUS="synced-local"
  else
    remove_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_FRIENDBOT_URL"
    remove_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_USDC_ISSUER"
    remove_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ISSUER_SECRET"
    remove_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ASSET_CODE"
    FRONTEND_ENV_STATUS="synced-non-local"
  fi

  echo "==> Synced frontend env at: $FRONTEND_ENV_FILE ($FRONTEND_ENV_STATUS)"
}

write_deploy_env_export_file() {
  local export_file
  mkdir -p "$DEPLOY_ENV_EXPORT_DIR"
  export_file="$DEPLOY_ENV_EXPORT_DIR/${NETWORK}.env"

  {
    echo "# Generated by soroban/scripts/deploy.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    printf "NEXT_PUBLIC_NFT_CONTRACT_ID=%q\n" "$NFT_ID"
    printf "NEXT_PUBLIC_AUCTION_CONTRACT_ID=%q\n" "$AUCTION_ID"
    printf "NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID=%q\n" "$MARKETPLACE_ID"
    printf "NEXT_PUBLIC_STELLAR_RPC_URL=%q\n" "$RPC_URL"
    printf "NEXT_PUBLIC_STELLAR_HORIZON_URL=%q\n" "$HORIZON_URL"
    printf "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=%q\n" "$PASSPHRASE"
    printf "NEXT_PUBLIC_STELLAR_NETWORK=%q\n" "$NETWORK"
    printf "NEXT_PUBLIC_USDC_ISSUER=%q\n" "$USDC_ISSUER"
    if [ "$ENABLE_TRUSTLESS_ESCROW" = "1" ]; then
      printf "NEXT_PUBLIC_ESCROW_PROVIDER=%q\n" "trustless_work"
      printf "NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS=%q\n" "$TRUSTLESS_ESCROW_XLM_ADDRESS"
      printf "NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS=%q\n" "$TRUSTLESS_ESCROW_USDC_ADDRESS"
    else
      printf "NEXT_PUBLIC_ESCROW_PROVIDER=%q\n" "internal"
    fi
    if [ -n "$CONTRACT_SOURCE_REPO" ]; then
      printf "CONTRACT_SOURCE_REPO=%q\n" "$CONTRACT_SOURCE_REPO"
    fi
    if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
      printf "CONTRACT_SOURCE_COMMIT=%q\n" "$CONTRACT_SOURCE_COMMIT"
    fi
    printf "ENABLE_ONCHAIN_SOURCE_VERIFICATION=%q\n" "$ENABLE_ONCHAIN_SOURCE_VERIFICATION"
    printf "AUTO_CREATE_INITIAL_AUCTION=%q\n" "$AUTO_CREATE_INITIAL_AUCTION"
    printf "INITIAL_AUCTION_MIN_CURRENCY=%q\n" "$INITIAL_AUCTION_MIN_CURRENCY"
    printf "INITIAL_AUCTION_MIN_AMOUNT=%q\n" "$INITIAL_AUCTION_MIN_AMOUNT"
    printf "INITIAL_AUCTION_XLM_USDC_RATE=%q\n" "$INITIAL_AUCTION_XLM_USDC_RATE"
    printf "INITIAL_AUCTION_TOKEN_URI=%q\n" "$INITIAL_AUCTION_TOKEN_URI"
  } > "$export_file"

  DEPLOY_ENV_EXPORT_STATUS="$export_file"
  echo "==> Wrote deploy env export file: $export_file"
}

get_native_balance() {
  local address="$1"
  local payload

  if ! need_cmd curl; then
    return 0
  fi

  payload="$(curl -fsS "$HORIZON_URL/accounts/$address" 2>/dev/null || true)"
  if [ -z "$payload" ]; then
    return 0
  fi

  if need_cmd python3; then
    python3 - "$payload" <<'PY'
import json
import sys

raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    sys.exit(0)

for bal in data.get("balances", []):
    if bal.get("asset_type") == "native":
        print(bal.get("balance", ""))
        break
PY
  fi
}

show_mainnet_funding_instructions() {
  echo "==> Mainnet funding required before deploy"
  echo ""
  echo "Send XLM to this address:"
  echo "  $ADMIN"
  echo ""

  if need_cmd qrencode; then
    echo "Scan this QR from your phone wallet:"
    qrencode -t ANSIUTF8 "$ADMIN" || true
  else
    echo "Install 'qrencode' to render QR in terminal (optional)."
    echo "QR image URL to open on another screen/device:"
    echo "  https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=$ADMIN"
  fi

  echo ""
  echo "Minimum recommended balance to continue: ${MIN_MAINNET_XLM} XLM"
}

wait_for_mainnet_funding() {
  show_mainnet_funding_instructions

  if [ "$INTERACTIVE" -ne 1 ]; then
    die "Mainnet requires manual funding. Re-run interactively after funding $ADMIN"
  fi

  while true; do
    local bal
    bal="$(get_native_balance "$ADMIN" | tr -d '\r' | head -n1)"

    if [ -n "$bal" ]; then
      echo "Current native balance: $bal XLM"
      if awk -v b="$bal" -v m="$MIN_MAINNET_XLM" 'BEGIN { exit !((b + 0) >= (m + 0)) }'; then
        echo "Mainnet funding looks good. Continuing deployment..."
        break
      fi
      echo "Balance is below recommended minimum (${MIN_MAINNET_XLM} XLM)."
    else
      echo "Could not read balance automatically from Horizon."
    fi

    local answer
    read -r -p "Press [Enter] to re-check, or type 'skip' to continue anyway: " answer
    if [ "$answer" = "skip" ]; then
      echo "Continuing without balance confirmation."
      break
    fi
  done
}

ensure_build_target() {
  if ! need_cmd rustup; then
    die "rustup is required to build Soroban contracts. Run ./scripts/install_prereqs.sh first."
  fi

  if ! rustup target list --installed | grep -qx "wasm32v1-none"; then
    echo "==> Installing missing Rust target: wasm32v1-none"
    rustup target add wasm32v1-none
  fi
}

build_contracts() {
  local -a build_args

  echo "==> Building contracts..."
  cd "$ROOT_DIR"
  build_args=(contract build)

  if [ "$ENABLE_ONCHAIN_SOURCE_VERIFICATION" = "1" ]; then
    if [ -n "$CONTRACT_SOURCE_REPO" ]; then
      build_args+=(--meta "source_repo=$CONTRACT_SOURCE_REPO")
    fi
    if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
      build_args+=(--meta "source_repo_commit=$CONTRACT_SOURCE_COMMIT")
    fi
    if [ -n "$CONTRACT_SOURCE_SUBPATH" ]; then
      build_args+=(--meta "source_repo_path=$CONTRACT_SOURCE_SUBPATH")
    fi
  fi

  stellar "${build_args[@]}"

  if [ "$ENABLE_ONCHAIN_SOURCE_VERIFICATION" != "1" ]; then
    SOURCE_PUBLICATION_STATUS="disabled"
  elif [ "$NETWORK" = "local" ]; then
    SOURCE_PUBLICATION_STATUS="local-network"
  elif [ -n "$CONTRACT_SOURCE_REPO" ]; then
    SOURCE_PUBLICATION_STATUS="metadata-attached"
  else
    SOURCE_PUBLICATION_STATUS="missing-source-repo"
  fi

  WASM_DIR_V1="$ROOT_DIR/target/wasm32v1-none/release"
  WASM_DIR_LEGACY="$ROOT_DIR/target/wasm32-unknown-unknown/release"

  if [[ -f "$WASM_DIR_V1/shimeji_nft.wasm" && -f "$WASM_DIR_V1/shimeji_auction.wasm" && -f "$WASM_DIR_V1/shimeji_escrow_vault.wasm" && -f "$WASM_DIR_V1/shimeji_marketplace.wasm" ]]; then
    NFT_WASM="$WASM_DIR_V1/shimeji_nft.wasm"
    AUCTION_WASM="$WASM_DIR_V1/shimeji_auction.wasm"
    ESCROW_VAULT_WASM="$WASM_DIR_V1/shimeji_escrow_vault.wasm"
    MARKETPLACE_WASM="$WASM_DIR_V1/shimeji_marketplace.wasm"
  elif [[ -f "$WASM_DIR_LEGACY/shimeji_nft.wasm" && -f "$WASM_DIR_LEGACY/shimeji_auction.wasm" && -f "$WASM_DIR_LEGACY/shimeji_escrow_vault.wasm" && -f "$WASM_DIR_LEGACY/shimeji_marketplace.wasm" ]]; then
    NFT_WASM="$WASM_DIR_LEGACY/shimeji_nft.wasm"
    AUCTION_WASM="$WASM_DIR_LEGACY/shimeji_auction.wasm"
    ESCROW_VAULT_WASM="$WASM_DIR_LEGACY/shimeji_escrow_vault.wasm"
    MARKETPLACE_WASM="$WASM_DIR_LEGACY/shimeji_marketplace.wasm"
  else
    die "Could not find built WASM artifacts (shimeji_nft.wasm, shimeji_auction.wasm, shimeji_escrow_vault.wasm, shimeji_marketplace.wasm) in target directories"
  fi

  NFT_WASM_HASH_LOCAL="$(hash_file "$NFT_WASM")"
  AUCTION_WASM_HASH_LOCAL="$(hash_file "$AUCTION_WASM")"
  ESCROW_VAULT_WASM_HASH_LOCAL="$(hash_file "$ESCROW_VAULT_WASM")"
  MARKETPLACE_WASM_HASH_LOCAL="$(hash_file "$MARKETPLACE_WASM")"
}

derive_sac_addresses() {
  echo "==> Deriving SAC token addresses..."

  XLM_TOKEN="$(stellar contract id asset \
    --asset native \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")"
  echo "  XLM SAC:  $XLM_TOKEN"

  USDC_TOKEN="$(stellar contract id asset \
    --asset "USDC:$USDC_ISSUER" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")"
  echo "  USDC SAC: $USDC_TOKEN"
}

deploy_contracts() {
  echo "==> Deploying ShimejiNFT..."
  NFT_ID="$(stellar contract deploy \
    --wasm "$NFT_WASM" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")"
  echo "  NFT Contract: $NFT_ID"

  echo "==> Initializing ShimejiNFT..."
  stellar contract invoke \
    --id "$NFT_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- initialize --admin "$ADMIN"

  echo "==> Deploying ShimejiAuction..."
  AUCTION_ID="$(stellar contract deploy \
    --wasm "$AUCTION_WASM" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")"
  echo "  Auction Contract: $AUCTION_ID"

  echo "==> Initializing ShimejiAuction..."
  stellar contract invoke \
    --id "$AUCTION_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- initialize \
    --admin "$ADMIN" \
    --nft_contract "$NFT_ID" \
    --usdc_token "$USDC_TOKEN" \
    --xlm_token "$XLM_TOKEN"

  if [ "$ENABLE_TRUSTLESS_ESCROW" = "1" ]; then
    if [ "$NETWORK" = "local" ]; then
      echo "==> Deploying local mock escrow vault (Trustless Work dev parity)..."
      ESCROW_VAULT_ID="$(stellar contract deploy \
        --wasm "$ESCROW_VAULT_WASM" \
        --source "$IDENTITY" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$PASSPHRASE")"
      echo "  Local Escrow Vault: $ESCROW_VAULT_ID"

      stellar contract invoke \
        --id "$ESCROW_VAULT_ID" \
        --source "$IDENTITY" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$PASSPHRASE" \
        -- initialize --admin "$ADMIN"

      TRUSTLESS_ESCROW_XLM_ADDRESS="$ESCROW_VAULT_ID"
      TRUSTLESS_ESCROW_USDC_ADDRESS="$ESCROW_VAULT_ID"
      TRUSTLESS_ESCROW_STATUS="local-mock-enabled"
    else
      if [ -z "$TRUSTLESS_ESCROW_XLM_ADDRESS" ] || [ -z "$TRUSTLESS_ESCROW_USDC_ADDRESS" ]; then
        echo "==> Deploying fallback escrow vault on $NETWORK (Trustless routing enabled)..."
        ESCROW_VAULT_ID="$(stellar contract deploy \
          --wasm "$ESCROW_VAULT_WASM" \
          --source "$IDENTITY" \
          --rpc-url "$RPC_URL" \
          --network-passphrase "$PASSPHRASE")"
        echo "  Fallback Escrow Vault: $ESCROW_VAULT_ID"

        stellar contract invoke \
          --id "$ESCROW_VAULT_ID" \
          --source "$IDENTITY" \
          --rpc-url "$RPC_URL" \
          --network-passphrase "$PASSPHRASE" \
          -- initialize --admin "$ADMIN"

        TRUSTLESS_ESCROW_XLM_ADDRESS="$ESCROW_VAULT_ID"
        TRUSTLESS_ESCROW_USDC_ADDRESS="$ESCROW_VAULT_ID"
        TRUSTLESS_ESCROW_STATUS="${NETWORK}-fallback-vault-enabled"
      else
        TRUSTLESS_ESCROW_STATUS="trustless-enabled"
      fi
    fi

    echo "==> Configuring auction contract to settle into Trustless escrow destinations..."
    stellar contract invoke \
      --id "$AUCTION_ID" \
      --source "$IDENTITY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$PASSPHRASE" \
      -- configure_trustless_escrow \
      --xlm_destination "$TRUSTLESS_ESCROW_XLM_ADDRESS" \
      --usdc_destination "$TRUSTLESS_ESCROW_USDC_ADDRESS"
  else
    echo "==> Using internal auction escrow mode (Trustless escrow disabled)."
    stellar contract invoke \
      --id "$AUCTION_ID" \
      --source "$IDENTITY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$PASSPHRASE" \
      -- configure_internal_escrow
    TRUSTLESS_ESCROW_STATUS="internal"
  fi

  echo "==> Setting auction contract as NFT minter..."
  stellar contract invoke \
    --id "$NFT_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- set_minter --minter "$AUCTION_ID"

  echo "==> Deploying ShimejiMarketplace..."
  MARKETPLACE_ID="$(stellar contract deploy \
    --wasm "$MARKETPLACE_WASM" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")"
  echo "  Marketplace Contract: $MARKETPLACE_ID"

  echo "==> Initializing ShimejiMarketplace..."
  stellar contract invoke \
    --id "$MARKETPLACE_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- initialize \
    --admin "$ADMIN" \
    --nft_contract "$NFT_ID" \
    --usdc_token "$USDC_TOKEN" \
    --xlm_token "$XLM_TOKEN"
}

read_total_auctions() {
  local raw
  raw="$(stellar contract invoke \
    --id "$AUCTION_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- total_auctions 2>/dev/null || true)"
  printf "%s\n" "$raw" | tr -d '\r' | awk '/^[0-9]+$/ {print $1}' | tail -n1
}

create_initial_auction_if_enabled() {
  local total_before
  local create_output

  if [ "$AUTO_CREATE_INITIAL_AUCTION" != "1" ]; then
    [ "$INITIAL_AUCTION_STATUS" = "not-run" ] && INITIAL_AUCTION_STATUS="disabled"
    return
  fi

  total_before="$(read_total_auctions)"
  if [ -z "$total_before" ]; then
    INITIAL_AUCTION_STATUS="could-not-read-total"
    return
  fi

  if [ "$total_before" != "0" ]; then
    INITIAL_AUCTION_STATUS="skipped-existing-auctions"
    return
  fi

  echo "==> Creating initial auction automatically..."
  create_output="$(stellar contract invoke \
    --id "$AUCTION_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- create_auction \
    --token_uri "$INITIAL_AUCTION_TOKEN_URI" \
    --starting_price_xlm "$INITIAL_AUCTION_STARTING_XLM" \
    --starting_price_usdc "$INITIAL_AUCTION_STARTING_USDC" \
    --xlm_usdc_rate "$INITIAL_AUCTION_XLM_USDC_RATE" 2>&1)" || {
      INITIAL_AUCTION_STATUS="failed-create"
      echo "==> Failed to create initial auction:"
      echo "$create_output"
      return
    }

  INITIAL_AUCTION_ID="$(printf "%s\n" "$create_output" | tr -d '\r' | awk '/^[0-9]+$/ {print $1}' | tail -n1)"
  if [ -z "$INITIAL_AUCTION_ID" ]; then
    INITIAL_AUCTION_ID="0"
  fi

  INITIAL_AUCTION_STATUS="created"
  echo "  Initial auction created with id: $INITIAL_AUCTION_ID"
  echo "  Start price: ${INITIAL_AUCTION_STARTING_USDC} stroops USDC / ${INITIAL_AUCTION_STARTING_XLM} stroops XLM"
}

run_build_info_query_with_optional_api_key() {
  local contract_id="$1"
  local contract_label="$2"
  local output_file="$3"
  local attempt=0

  while true; do
    if stellar contract info build \
      --contract-id "$contract_id" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$PASSPHRASE" >"$output_file" 2>&1; then
      return 0
    fi

    if [ "$attempt" -ge 1 ]; then
      return 1
    fi

    if ! is_api_key_error_output "$output_file"; then
      return 1
    fi

    if ! prompt_and_configure_rpc_api_key "$contract_label"; then
      return 1
    fi

    attempt=$((attempt + 1))
  done
}

fetch_contract_wasm_with_optional_api_key() {
  local contract_id="$1"
  local contract_label="$2"
  local output_wasm="$3"
  local output_log="$4"
  local attempt=0

  while true; do
    if stellar contract fetch \
      --id "$contract_id" \
      --out-file "$output_wasm" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$PASSPHRASE" >"$output_log" 2>&1; then
      return 0
    fi

    if [ "$attempt" -ge 1 ]; then
      return 1
    fi

    if ! is_api_key_error_output "$output_log"; then
      return 1
    fi

    if ! prompt_and_configure_rpc_api_key "$contract_label"; then
      return 1
    fi

    attempt=$((attempt + 1))
  done
}

verify_deployed_contracts_onchain() {
  local tmp_dir
  local nft_onchain_wasm
  local auction_onchain_wasm
  local nft_fetch_log
  local auction_fetch_log
  local nft_build_info_file
  local auction_build_info_file
  local need_strict_failure=0

  if [ "$ENABLE_ONCHAIN_SOURCE_VERIFICATION" != "1" ]; then
    SOURCE_WASM_VERIFY_STATUS="disabled"
    SOURCE_BUILD_INFO_STATUS="disabled"
    SOURCE_VERIFICATION_STATUS="disabled"
    return
  fi

  if [ "$REQUIRE_ONCHAIN_SOURCE_VERIFICATION" = "1" ]; then
    need_strict_failure=1
  fi

  tmp_dir="$(mktemp -d)"
  nft_onchain_wasm="$tmp_dir/shimeji_nft_onchain.wasm"
  auction_onchain_wasm="$tmp_dir/shimeji_auction_onchain.wasm"
  nft_fetch_log="$tmp_dir/shimeji_nft_fetch.log"
  auction_fetch_log="$tmp_dir/shimeji_auction_fetch.log"
  nft_build_info_file="$tmp_dir/shimeji_nft_build_info.txt"
  auction_build_info_file="$tmp_dir/shimeji_auction_build_info.txt"

  echo "==> Verifying deployed contracts on-chain..."

  if ! fetch_contract_wasm_with_optional_api_key "$NFT_ID" "NFT contract wasm fetch" "$nft_onchain_wasm" "$nft_fetch_log"; then
    SOURCE_WASM_VERIFY_STATUS="fetch-failed"
    SOURCE_VERIFICATION_STATUS="failed-fetch"
    if [ -f "$nft_fetch_log" ]; then
      echo "Verification fetch error (NFT):"
      sed -n '1,20p' "$nft_fetch_log"
    fi
    rm -rf "$tmp_dir"
    if [ "$need_strict_failure" -eq 1 ]; then
      die "On-chain verification failed while fetching NFT wasm."
    fi
    return
  fi

  if ! fetch_contract_wasm_with_optional_api_key "$AUCTION_ID" "Auction contract wasm fetch" "$auction_onchain_wasm" "$auction_fetch_log"; then
    SOURCE_WASM_VERIFY_STATUS="fetch-failed"
    SOURCE_VERIFICATION_STATUS="failed-fetch"
    if [ -f "$auction_fetch_log" ]; then
      echo "Verification fetch error (Auction):"
      sed -n '1,20p' "$auction_fetch_log"
    fi
    rm -rf "$tmp_dir"
    if [ "$need_strict_failure" -eq 1 ]; then
      die "On-chain verification failed while fetching auction wasm."
    fi
    return
  fi

  NFT_WASM_HASH_ONCHAIN="$(hash_file "$nft_onchain_wasm")"
  AUCTION_WASM_HASH_ONCHAIN="$(hash_file "$auction_onchain_wasm")"

  if [ "$NFT_WASM_HASH_LOCAL" = "$NFT_WASM_HASH_ONCHAIN" ] && [ "$AUCTION_WASM_HASH_LOCAL" = "$AUCTION_WASM_HASH_ONCHAIN" ]; then
    SOURCE_WASM_VERIFY_STATUS="ok"
  else
    SOURCE_WASM_VERIFY_STATUS="hash-mismatch"
    SOURCE_VERIFICATION_STATUS="failed-hash"
    rm -rf "$tmp_dir"
    if [ "$need_strict_failure" -eq 1 ]; then
      die "On-chain wasm hashes do not match local build artifacts."
    fi
    return
  fi

  if [ "$NETWORK" = "local" ]; then
    SOURCE_BUILD_INFO_STATUS="skipped-local"
    SOURCE_VERIFICATION_STATUS="verified-hash-local"
    rm -rf "$tmp_dir"
    return
  fi

  if run_build_info_query_with_optional_api_key "$NFT_ID" "NFT contract build info" "$nft_build_info_file" \
    && run_build_info_query_with_optional_api_key "$AUCTION_ID" "Auction contract build info" "$auction_build_info_file"; then
    SOURCE_BUILD_INFO_STATUS="ok"
    SOURCE_VERIFICATION_STATUS="verified-hash+build-info"
  else
    SOURCE_BUILD_INFO_STATUS="unavailable"
    SOURCE_VERIFICATION_STATUS="verified-hash-only"
    echo "==> Build attestation info is not available yet."
    if [ -s "$nft_build_info_file" ]; then
      echo "    NFT build info response:"
      sed -n '1,15p' "$nft_build_info_file"
    fi
    if [ -s "$auction_build_info_file" ]; then
      echo "    Auction build info response:"
      sed -n '1,15p' "$auction_build_info_file"
    fi
    echo "    Explorer can still index source metadata if source_repo is attached."
    echo "    Check later with:"
    echo "    stellar contract info build --contract-id \"$NFT_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
    echo "    stellar contract info build --contract-id \"$AUCTION_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
    if [ "$need_strict_failure" -eq 1 ]; then
      rm -rf "$tmp_dir"
      die "Strict verification requested but build attestation info is unavailable."
    fi
  fi

  rm -rf "$tmp_dir"
}

print_success_summary() {
  echo ""
  echo "================================================"
  echo "  Deployment complete ($NETWORK)"
  echo "================================================"
  echo ""
  echo "  NFT Contract:     $NFT_ID"
  echo "  Auction Contract: $AUCTION_ID"
  echo "  Marketplace:      $MARKETPLACE_ID"
  echo "  XLM SAC:          $XLM_TOKEN"
  echo "  USDC SAC:         $USDC_TOKEN"
  if [ "$ENABLE_TRUSTLESS_ESCROW" = "1" ]; then
    echo "  Escrow Provider:  trustless_work ($TRUSTLESS_ESCROW_STATUS)"
    echo "  Escrow XLM Dest:  $TRUSTLESS_ESCROW_XLM_ADDRESS"
    echo "  Escrow USDC Dest: $TRUSTLESS_ESCROW_USDC_ADDRESS"
  else
    echo "  Escrow Provider:  internal"
  fi
  echo "  Initial Auction:  $INITIAL_AUCTION_STATUS"
  if [ "$INITIAL_AUCTION_STATUS" = "created" ]; then
    echo "  - Auction ID:     $INITIAL_AUCTION_ID"
    echo "  - Min USDC:       $INITIAL_AUCTION_STARTING_USDC (7 decimals)"
    echo "  - Min XLM:        $INITIAL_AUCTION_STARTING_XLM (7 decimals)"
  fi
  echo "  Admin:            $ADMIN"
  echo "  Identity Alias:   $IDENTITY"
  echo "  Secret Backup:    $SECRET_BACKUP_PATH ($SECRET_BACKUP_STATUS)"
  echo "  Frontend Env Sync:$FRONTEND_ENV_STATUS"
  echo "  Deploy Env File:  $DEPLOY_ENV_EXPORT_STATUS"
  echo "  Source Meta:      $SOURCE_META_STATUS"
  if [ -n "$CONTRACT_SOURCE_REPO" ]; then
    echo "  Source Repo:      $CONTRACT_SOURCE_REPO"
  fi
  if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
    echo "  Source Commit:    $CONTRACT_SOURCE_COMMIT"
  fi
  if [ -n "$STELLAR_RPC_HEADERS" ]; then
    echo "  RPC API Header:   configured ($RPC_API_KEY_STATUS)"
  else
    echo "  RPC API Header:   not configured"
  fi
  echo "  NFT Wasm Hash:    $NFT_WASM_HASH_LOCAL"
  echo "  Auction Wasm Hash:$AUCTION_WASM_HASH_LOCAL"
  echo "  Mktplace Wasm Hash:$MARKETPLACE_WASM_HASH_LOCAL"
  if [ -n "$NFT_WASM_HASH_ONCHAIN" ]; then
    echo "  NFT On-chain Hash:$NFT_WASM_HASH_ONCHAIN"
  fi
  if [ -n "$AUCTION_WASM_HASH_ONCHAIN" ]; then
    echo "  Auction On-chain: $AUCTION_WASM_HASH_ONCHAIN"
  fi
  if [ -n "$MARKETPLACE_WASM_HASH_ONCHAIN" ]; then
    echo "  Mktplace On-chain:$MARKETPLACE_WASM_HASH_ONCHAIN"
  fi
  echo "  Verification:     $SOURCE_VERIFICATION_STATUS"
  echo "  - Hash Check:     $SOURCE_WASM_VERIFY_STATUS"
  echo "  - Build Info:     $SOURCE_BUILD_INFO_STATUS"
  echo ""
  if [ "$NETWORK" = "local" ]; then
    echo "Explorer links:"
    echo "  Local network has no public chain explorer."
    echo "  Inspect directly with CLI commands in verification section below."
  else
    echo "Explorer links:"
    echo "  Explorer Home:    $EXPLORER_ROOT"
    echo "  NFT Contract:     $EXPLORER_ROOT/contract/$NFT_ID"
    echo "  Auction Contract: $EXPLORER_ROOT/contract/$AUCTION_ID"
    echo "  Marketplace:      $EXPLORER_ROOT/contract/$MARKETPLACE_ID"
    echo "  Admin Account:    $EXPLORER_ROOT/account/$ADMIN"
    if [ -n "$CONTRACT_SOURCE_REPO" ]; then
      echo "  Source Repo Meta: $CONTRACT_SOURCE_REPO"
      echo "  Expected result: explorer 'Source Code' section can link to the repository."
    fi
  fi
  echo ""
  echo "Frontend linkage (shimeji-xlm/nextjs):"
  echo ""
  if [ "$NETWORK" = "local" ]; then
    echo "1) Local autoconfig:"
    echo "   - $FRONTEND_ENV_FILE was updated automatically ($FRONTEND_ENV_STATUS)."
    echo "   - Keys written: NEXT_PUBLIC_NFT_CONTRACT_ID, NEXT_PUBLIC_AUCTION_CONTRACT_ID, NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID,"
    echo "     NEXT_PUBLIC_STELLAR_RPC_URL, NEXT_PUBLIC_STELLAR_HORIZON_URL,"
    echo "     NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE, NEXT_PUBLIC_STELLAR_NETWORK, NEXT_PUBLIC_USDC_ISSUER,"
    echo "     NEXT_PUBLIC_ESCROW_PROVIDER, NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS, NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS,"
    echo "     NEXT_PUBLIC_LOCAL_USDC_ISSUER, LOCAL_USDC_ISSUER_SECRET, LOCAL_USDC_ASSET_CODE."
    echo "   - Local USDC issuer: $USDC_ISSUER"
  elif [ "$FRONTEND_ENV_STATUS" = "synced-non-local" ]; then
    echo "1) Frontend .env.local synced for $NETWORK:"
    echo "   - $FRONTEND_ENV_FILE was updated automatically ($FRONTEND_ENV_STATUS)."
    echo "   - Keys written: NEXT_PUBLIC_NFT_CONTRACT_ID, NEXT_PUBLIC_AUCTION_CONTRACT_ID,"
    echo "     NEXT_PUBLIC_STELLAR_RPC_URL, NEXT_PUBLIC_STELLAR_HORIZON_URL,"
    echo "     NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE, NEXT_PUBLIC_STELLAR_NETWORK, NEXT_PUBLIC_USDC_ISSUER,"
    echo "     NEXT_PUBLIC_ESCROW_PROVIDER, NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS, NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS."
    echo "   - Local-only keys were removed to avoid stale local faucet config."
  else
    echo "1) Local .env.local autoconfig is intentionally skipped for non-local networks."
    echo "   - Keep local values for local development."
  fi
  echo ""
  echo "2) Vercel env vars (primary for ${NETWORK} deployment):"
  echo "   - NEXT_PUBLIC_NFT_CONTRACT_ID"
  echo "   - NEXT_PUBLIC_AUCTION_CONTRACT_ID"
  echo "   - NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID"
  echo "   - NEXT_PUBLIC_STELLAR_RPC_URL"
  echo "   - NEXT_PUBLIC_STELLAR_HORIZON_URL"
  echo "   - NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE"
  echo "   - NEXT_PUBLIC_STELLAR_NETWORK"
  echo "   - NEXT_PUBLIC_USDC_ISSUER"
  echo "   - NEXT_PUBLIC_ESCROW_PROVIDER"
  echo "   - NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS (if trustless_work)"
  echo "   - NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS (if trustless_work)"
  echo "   - NEXT_PUBLIC_BASE_URL=https://<your-domain>"
  echo ""
  echo "   Values for this deployment:"
  echo "   NEXT_PUBLIC_NFT_CONTRACT_ID=$NFT_ID"
  echo "   NEXT_PUBLIC_AUCTION_CONTRACT_ID=$AUCTION_ID"
  echo "   NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID=$MARKETPLACE_ID"
  echo "   NEXT_PUBLIC_STELLAR_RPC_URL=$RPC_URL"
  echo "   NEXT_PUBLIC_STELLAR_HORIZON_URL=$HORIZON_URL"
  echo "   NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=\"$PASSPHRASE\""
  echo "   NEXT_PUBLIC_STELLAR_NETWORK=$NETWORK"
  echo "   NEXT_PUBLIC_USDC_ISSUER=$USDC_ISSUER"
  if [ "$ENABLE_TRUSTLESS_ESCROW" = "1" ]; then
    echo "   NEXT_PUBLIC_ESCROW_PROVIDER=trustless_work"
    echo "   NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS=$TRUSTLESS_ESCROW_XLM_ADDRESS"
    echo "   NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS=$TRUSTLESS_ESCROW_USDC_ADDRESS"
  else
    echo "   NEXT_PUBLIC_ESCROW_PROVIDER=internal"
  fi
  echo ""
  echo "3) Redeploy frontend after env vars are set."
  if [ "$NETWORK" = "testnet" ] || [ "$NETWORK" = "mainnet" ]; then
    echo ""
    echo "   Optional CLI sync to Vercel:"
    echo "   cd \"$PROJECT_ROOT\" && pnpm run vercel:env:$NETWORK -- production"
  fi
  echo ""
  echo "Contract verification:"
  echo "A) Automatic checks executed in this deploy:"
  echo "   - On-chain wasm fetch + hash comparison"
  echo "   - Build info query for source/attestation metadata"
  echo "   - Result: $SOURCE_VERIFICATION_STATUS"
  echo ""
  echo "B) Explorer source publication metadata:"
  if [ -n "$CONTRACT_SOURCE_REPO" ]; then
    echo "   - source_repo=$CONTRACT_SOURCE_REPO (embedded in wasm via build --meta)"
  else
    echo "   - source_repo metadata was not set."
    echo "   - Set CONTRACT_SOURCE_REPO=github:<owner>/<repo> in shimeji-xlm/.env to publish source linkage."
  fi
  if [ -n "$CONTRACT_SOURCE_COMMIT" ]; then
    echo "   - source_repo_commit=$CONTRACT_SOURCE_COMMIT"
  fi
  echo ""
  echo "C) Re-run verification commands manually:"
  echo "   stellar contract fetch --id \"$NFT_ID\" --out-file /tmp/shimeji_nft_onchain.wasm --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo "   stellar contract fetch --id \"$AUCTION_ID\" --out-file /tmp/shimeji_auction_onchain.wasm --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo "   sha256sum \"$NFT_WASM\" /tmp/shimeji_nft_onchain.wasm || shasum -a 256 \"$NFT_WASM\" /tmp/shimeji_nft_onchain.wasm"
  echo "   sha256sum \"$AUCTION_WASM\" /tmp/shimeji_auction_onchain.wasm || shasum -a 256 \"$AUCTION_WASM\" /tmp/shimeji_auction_onchain.wasm"
  echo "   stellar contract info build --contract-id \"$NFT_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo "   stellar contract info build --contract-id \"$AUCTION_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo ""
  echo "D) If your RPC provider requires API key headers:"
  echo "   - Set STELLAR_RPC_HEADERS in shimeji-xlm/.env (example: STELLAR_RPC_HEADERS=\"X-API-Key: <key>\")"
  echo "   - The deploy wizard can also prompt for this key automatically when verification requests are denied."
  echo ""
  echo "Auction quickstart:"
  if [ "$INITIAL_AUCTION_STATUS" = "created" ]; then
    echo "1) Initial auction already created automatically."
    echo "   - auction_id: $INITIAL_AUCTION_ID"
    echo "   - token_uri: $INITIAL_AUCTION_TOKEN_URI"
    echo "   - starting_price_xlm: $INITIAL_AUCTION_STARTING_XLM"
    echo "   - starting_price_usdc: $INITIAL_AUCTION_STARTING_USDC"
    echo "   - xlm_usdc_rate: $INITIAL_AUCTION_XLM_USDC_RATE"
    echo ""
  else
    echo "1) No auction auto-created. Create one manually (admin only):"
    echo "   stellar contract invoke \\"
    echo "     --id \"$AUCTION_ID\" \\"
    echo "     --source \"$IDENTITY\" \\"
    echo "     --rpc-url \"$RPC_URL\" \\"
    echo "     --network-passphrase \"$PASSPHRASE\" \\"
    echo "     -- create_auction \\"
    echo "     --token_uri \"ipfs://<metadata-cid>/metadata.json\" \\"
    echo "     --starting_price_xlm 5000000000 \\"
    echo "     --starting_price_usdc 500000000 \\"
    echo "     --xlm_usdc_rate 1000000"
    echo ""
  fi
  echo "2) Confirm auction exists:"
  echo "   stellar contract invoke --id \"$AUCTION_ID\" --source \"$IDENTITY\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\" -- total_auctions"
  echo "   stellar contract invoke --id \"$AUCTION_ID\" --source \"$IDENTITY\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\" -- get_auction --auction_id 0"
  echo ""
  echo "3) Open the auction UI:"
  if [ "$NETWORK" = "local" ]; then
    echo "   http://localhost:3000/auction"
  else
    echo "   <your deployed frontend>/auction"
  fi
}

main() {
  need_cmd stellar || die "Stellar CLI not found. Run ./scripts/install_prereqs.sh first."

  select_network
  configure_network

  echo ""
  echo "  Network:    $NETWORK"
  echo "  RPC:        $RPC_URL"
  echo "  Passphrase: $PASSPHRASE"
  echo "  Verify Src: $ENABLE_ONCHAIN_SOURCE_VERIFICATION (strict=$REQUIRE_ONCHAIN_SOURCE_VERIFICATION)"
  echo "  AutoAuction:$AUTO_CREATE_INITIAL_AUCTION (min=${INITIAL_AUCTION_MIN_AMOUNT} ${INITIAL_AUCTION_MIN_CURRENCY})"
  echo ""

  setup_identity
  write_secret_backup_file

  if [ "$NETWORK" = "local" ]; then
    fund_local
  elif [ "$NETWORK" = "testnet" ]; then
    fund_testnet
  else
    wait_for_mainnet_funding
  fi

  ensure_build_target
  prepare_source_verification
  prepare_initial_auction_config
  build_contracts
  setup_local_usdc_issuer
  prepare_trustless_escrow_config
  derive_sac_addresses
  deploy_contracts
  create_initial_auction_if_enabled
  verify_deployed_contracts_onchain
  write_deploy_env_export_file
  sync_frontend_env_local
  print_success_summary
}

main "$@"
