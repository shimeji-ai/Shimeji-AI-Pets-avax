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
#   TESTNET_USDC_ISSUER=GBBD...
#   MAINNET_USDC_ISSUER=GA5Z...

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
FORCE_IDENTITY_REIMPORT="${FORCE_IDENTITY_REIMPORT:-0}"
MIN_MAINNET_XLM="${MIN_MAINNET_XLM:-2}"
SECRET_BACKUP_PATH="${SECRET_BACKUP_PATH:-}"
DISABLE_SECRET_BACKUP="${DISABLE_SECRET_BACKUP:-0}"
FRONTEND_ENV_FILE="${FRONTEND_ENV_FILE:-}"
SYNC_FRONTEND_ENV="${SYNC_FRONTEND_ENV:-1}"

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
  local choice
  echo "Identity alias '$IDENTITY' already exists."
  echo "Choose how to continue:"
  echo "  1) Create new wallet and replace alias '$IDENTITY' (recommended)"
  echo "  2) Use existing alias '$IDENTITY'"
  echo "  3) Use another existing wallet (import credentials and replace alias)"
  echo "  4) Abort"
  read -r -p "Choice [1]: " choice

  case "${choice:-1}" in
    1)
      echo "==> Generating new wallet for alias '$IDENTITY'..."
      generate_identity
      ;;
    2)
      echo "==> Using existing alias '$IDENTITY'."
      ;;
    3)
      import_credentials_interactive || choose_existing_identity_interactive
      ;;
    4)
      die "Deployment cancelled by user"
      ;;
    *)
      die "Invalid choice"
      ;;
  esac
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

sync_frontend_env_local() {
  local frontend_dir

  if [ "$SYNC_FRONTEND_ENV" != "1" ]; then
    FRONTEND_ENV_STATUS="disabled"
    return
  fi

  if [ "$NETWORK" != "local" ]; then
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
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_RPC_URL" "$RPC_URL"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_HORIZON_URL" "$HORIZON_URL"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE" "\"$PASSPHRASE\""
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_STELLAR_NETWORK" "$NETWORK"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_FRIENDBOT_URL" "$LOCAL_FRIENDBOT_URL"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_LOCAL_USDC_ISSUER" "$USDC_ISSUER"
  upsert_env_value "$FRONTEND_ENV_FILE" "NEXT_PUBLIC_USDC_ISSUER" "$USDC_ISSUER"
  upsert_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ISSUER_SECRET" "$LOCAL_USDC_ISSUER_SECRET"
  upsert_env_value "$FRONTEND_ENV_FILE" "LOCAL_USDC_ASSET_CODE" "$LOCAL_USDC_ASSET_CODE"

  FRONTEND_ENV_STATUS="synced-local"
  echo "==> Synced local frontend env at: $FRONTEND_ENV_FILE"
}

write_deploy_env_export_file() {
  local export_file
  mkdir -p "$DEPLOY_ENV_EXPORT_DIR"
  export_file="$DEPLOY_ENV_EXPORT_DIR/${NETWORK}.env"

  {
    echo "# Generated by soroban/scripts/deploy.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    printf "NEXT_PUBLIC_NFT_CONTRACT_ID=%q\n" "$NFT_ID"
    printf "NEXT_PUBLIC_AUCTION_CONTRACT_ID=%q\n" "$AUCTION_ID"
    printf "NEXT_PUBLIC_STELLAR_RPC_URL=%q\n" "$RPC_URL"
    printf "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=%q\n" "$PASSPHRASE"
    printf "NEXT_PUBLIC_STELLAR_NETWORK=%q\n" "$NETWORK"
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
  echo "==> Building contracts..."
  cd "$ROOT_DIR"
  stellar contract build

  WASM_DIR_V1="$ROOT_DIR/target/wasm32v1-none/release"
  WASM_DIR_LEGACY="$ROOT_DIR/target/wasm32-unknown-unknown/release"

  if [[ -f "$WASM_DIR_V1/shimeji_nft.wasm" && -f "$WASM_DIR_V1/shimeji_auction.wasm" ]]; then
    NFT_WASM="$WASM_DIR_V1/shimeji_nft.wasm"
    AUCTION_WASM="$WASM_DIR_V1/shimeji_auction.wasm"
  elif [[ -f "$WASM_DIR_LEGACY/shimeji_nft.wasm" && -f "$WASM_DIR_LEGACY/shimeji_auction.wasm" ]]; then
    NFT_WASM="$WASM_DIR_LEGACY/shimeji_nft.wasm"
    AUCTION_WASM="$WASM_DIR_LEGACY/shimeji_auction.wasm"
  else
    die "Could not find built WASM artifacts in target directories"
  fi

  NFT_WASM_HASH_LOCAL="$(hash_file "$NFT_WASM")"
  AUCTION_WASM_HASH_LOCAL="$(hash_file "$AUCTION_WASM")"
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

  echo "==> Setting auction contract as NFT minter..."
  stellar contract invoke \
    --id "$NFT_ID" \
    --source "$IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- set_minter --minter "$AUCTION_ID"
}

print_success_summary() {
  echo ""
  echo "================================================"
  echo "  Deployment complete ($NETWORK)"
  echo "================================================"
  echo ""
  echo "  NFT Contract:     $NFT_ID"
  echo "  Auction Contract: $AUCTION_ID"
  echo "  XLM SAC:          $XLM_TOKEN"
  echo "  USDC SAC:         $USDC_TOKEN"
  echo "  Admin:            $ADMIN"
  echo "  Identity Alias:   $IDENTITY"
  echo "  Secret Backup:    $SECRET_BACKUP_PATH ($SECRET_BACKUP_STATUS)"
  echo "  Frontend Env Sync:$FRONTEND_ENV_STATUS"
  echo "  Deploy Env File:  $DEPLOY_ENV_EXPORT_STATUS"
  echo "  NFT Wasm Hash:    $NFT_WASM_HASH_LOCAL"
  echo "  Auction Wasm Hash:$AUCTION_WASM_HASH_LOCAL"
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
    echo "  Admin Account:    $EXPLORER_ROOT/account/$ADMIN"
  fi
  echo ""
  echo "Frontend linkage (shimeji-xlm/nextjs):"
  echo ""
  if [ "$NETWORK" = "local" ]; then
    echo "1) Local autoconfig:"
    echo "   - $FRONTEND_ENV_FILE was updated automatically ($FRONTEND_ENV_STATUS)."
    echo "   - Keys written: NEXT_PUBLIC_NFT_CONTRACT_ID, NEXT_PUBLIC_AUCTION_CONTRACT_ID,"
    echo "     NEXT_PUBLIC_STELLAR_RPC_URL, NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE, NEXT_PUBLIC_STELLAR_NETWORK,"
    echo "     NEXT_PUBLIC_LOCAL_USDC_ISSUER, NEXT_PUBLIC_USDC_ISSUER, LOCAL_USDC_ISSUER_SECRET, LOCAL_USDC_ASSET_CODE."
    echo "   - Local USDC issuer: $USDC_ISSUER"
  else
    echo "1) Local .env.local autoconfig is intentionally skipped for non-local networks."
    echo "   - Keep local values for local development."
  fi
  echo ""
  echo "2) Vercel env vars (primary for ${NETWORK} deployment):"
  echo "   - NEXT_PUBLIC_NFT_CONTRACT_ID"
  echo "   - NEXT_PUBLIC_AUCTION_CONTRACT_ID"
  echo "   - NEXT_PUBLIC_STELLAR_RPC_URL"
  echo "   - NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE"
  echo "   - NEXT_PUBLIC_STELLAR_NETWORK"
  echo "   - NEXT_PUBLIC_BASE_URL=https://<your-domain>"
  echo ""
  echo "   Values for this deployment:"
  echo "   NEXT_PUBLIC_NFT_CONTRACT_ID=$NFT_ID"
  echo "   NEXT_PUBLIC_AUCTION_CONTRACT_ID=$AUCTION_ID"
  echo "   NEXT_PUBLIC_STELLAR_RPC_URL=$RPC_URL"
  echo "   NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=\"$PASSPHRASE\""
  echo "   NEXT_PUBLIC_STELLAR_NETWORK=$NETWORK"
  echo ""
  echo "3) Redeploy frontend after env vars are set."
  if [ "$NETWORK" = "testnet" ] || [ "$NETWORK" = "mainnet" ]; then
    echo ""
    echo "   Optional CLI sync to Vercel:"
    echo "   cd \"$PROJECT_ROOT\" && pnpm run vercel:env:$NETWORK -- production"
  fi
  echo ""
  echo "Contract verification steps:"
  echo "A) Fetch on-chain wasm binaries:"
  echo "   stellar contract fetch --id \"$NFT_ID\" --out-file /tmp/shimeji_nft_onchain.wasm --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo "   stellar contract fetch --id \"$AUCTION_ID\" --out-file /tmp/shimeji_auction_onchain.wasm --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo ""
  echo "B) Compare on-chain vs local build hashes:"
  echo "   sha256sum \"$NFT_WASM\" /tmp/shimeji_nft_onchain.wasm || shasum -a 256 \"$NFT_WASM\" /tmp/shimeji_nft_onchain.wasm"
  echo "   sha256sum \"$AUCTION_WASM\" /tmp/shimeji_auction_onchain.wasm || shasum -a 256 \"$AUCTION_WASM\" /tmp/shimeji_auction_onchain.wasm"
  echo ""
  echo "   Expected local hashes from this deploy:"
  echo "   - NFT:     $NFT_WASM_HASH_LOCAL"
  echo "   - Auction: $AUCTION_WASM_HASH_LOCAL"
  echo ""
  echo "C) Optional build attestation query (if source metadata exists):"
  echo "   stellar contract info build --contract-id \"$NFT_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo "   stellar contract info build --contract-id \"$AUCTION_ID\" --rpc-url \"$RPC_URL\" --network-passphrase \"$PASSPHRASE\""
  echo ""
  echo "First auction quickstart:"
  echo "1) Create your first auction (admin only)."
  echo "   Amount units use 7 decimals for both XLM and USDC tokens."
  echo "   - 1 XLM  => 10000000"
  echo "   - 1 USDC => 10000000"
  echo "   - xlm_usdc_rate uses 7 decimals (1000000 = 0.10 USDC per XLM)"
  echo ""
  echo "   stellar contract invoke \\"
  echo "     --id \"$AUCTION_ID\" \\"
  echo "     --source \"$IDENTITY\" \\"
  echo "     --rpc-url \"$RPC_URL\" \\"
  echo "     --network-passphrase \"$PASSPHRASE\" \\"
  echo "     -- create_auction \\"
  echo "     --token_uri \"ipfs://<metadata-cid>/metadata.json\" \\"
  echo "     --starting_price_xlm 10000000 \\"
  echo "     --starting_price_usdc 10000000 \\"
  echo "     --xlm_usdc_rate 1000000"
  echo ""
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
  build_contracts
  setup_local_usdc_issuer
  derive_sac_addresses
  deploy_contracts
  write_deploy_env_export_file
  sync_frontend_env_local
  print_success_summary
}

main "$@"
