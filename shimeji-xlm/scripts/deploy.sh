#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOROBAN_DIR="$ROOT_DIR/soroban"
ENV_FILE="$ROOT_DIR/.env"

die() {
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

load_root_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    return
  fi
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

load_root_env_file

INTERACTIVE=0
UI_OUT="/dev/stdout"
if [ -t 0 ] && [ -t 1 ]; then
  INTERACTIVE=1
fi
if [ "$INTERACTIVE" -eq 1 ] && [ -w /dev/tty ]; then
  UI_OUT="/dev/tty"
fi

arrow_menu() {
  local title="$1"
  shift
  local options=("$@")
  local selected=0
  local key extra

  while true; do
    clear >"$UI_OUT"
    printf "%s\n" "$title" >"$UI_OUT"
    printf "%s\n" "Use arrow keys and Enter." >"$UI_OUT"
    printf "\n" >"$UI_OUT"

    local i
    for i in "${!options[@]}"; do
      if [ "$i" -eq "$selected" ]; then
        printf " > %s\n" "${options[$i]}" >"$UI_OUT"
      else
        printf "   %s\n" "${options[$i]}" >"$UI_OUT"
      fi
    done

    IFS= read -rsn1 key < /dev/tty || true
    case "$key" in
      ""|$'\n')
        echo "$selected"
        return 0
        ;;
      $'\x1b')
        IFS= read -rsn2 -t 0.1 extra < /dev/tty || true
        case "$extra" in
          "[A")
            if [ "$selected" -eq 0 ]; then
              selected=$((${#options[@]} - 1))
            else
              selected=$((selected - 1))
            fi
            ;;
          "[B")
            selected=$(((selected + 1) % ${#options[@]}))
            ;;
        esac
        ;;
      k)
        if [ "$selected" -eq 0 ]; then
          selected=$((${#options[@]} - 1))
        else
          selected=$((selected - 1))
        fi
        ;;
      j)
        selected=$(((selected + 1) % ${#options[@]}))
        ;;
    esac
  done
}

NETWORK="${1:-${NETWORK:-}}"

if [ -z "$NETWORK" ] && [ "$INTERACTIVE" -eq 1 ]; then
  choice="$(arrow_menu "Select deployment target" "local" "testnet" "mainnet")"
  case "${choice:-0}" in
    0) NETWORK="local" ;;
    1) NETWORK="testnet" ;;
    2) NETWORK="mainnet" ;;
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
if [ "$NETWORK" = "local" ]; then
  NETWORK="$NETWORK" ./scripts/deploy.sh
else
  NETWORK="$NETWORK" SYNC_FRONTEND_ENV_NON_LOCAL="${SYNC_FRONTEND_ENV_NON_LOCAL:-1}" ./scripts/deploy.sh
fi

cd "$ROOT_DIR"
if [ "$NETWORK" = "testnet" ] || [ "$NETWORK" = "mainnet" ]; then
  echo ""
  echo "==> Optional Vercel env sync for $NETWORK:"
  echo "    pnpm run vercel:env:$NETWORK -- production"
  if [ "$INTERACTIVE" -eq 1 ] && need_cmd vercel; then
    sync_choice="$(arrow_menu "Sync contract vars to Vercel now?" "Yes (production)" "Yes (preview)" "Skip")"
    case "${sync_choice:-2}" in
      0)
        pnpm run "vercel:env:$NETWORK" -- production || true
        ;;
      1)
        pnpm run "vercel:env:$NETWORK" -- preview || true
        ;;
      *)
        ;;
    esac
  fi
fi
