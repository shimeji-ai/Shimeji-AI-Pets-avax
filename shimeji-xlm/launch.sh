#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
INTERACTIVE=0

if [ -t 0 ] && [ -t 1 ]; then
  INTERACTIVE=1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

is_wsl() {
  if [ -n "${WSL_DISTRO_NAME:-}" ]; then
    return 0
  fi
  grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null
}

is_macos() {
  [ "$(uname -s)" = "Darwin" ]
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

ensure_pnpm() {
  if need_cmd pnpm; then
    return
  fi

  if need_cmd corepack; then
    echo "==> pnpm not found. Enabling via corepack..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10.24.0 --activate >/dev/null 2>&1 || true
  fi

  if ! need_cmd pnpm; then
    echo "Error: pnpm is required." >&2
    exit 1
  fi
}

ensure_workspace_install() {
  if [ -d "$ROOT_DIR/node_modules" ]; then
    return
  fi
  echo "==> Installing workspace dependencies (pnpm install)..."
  (
    cd "$ROOT_DIR"
    pnpm install
  )
}

arrow_menu() {
  local title="$1"
  shift
  local options=("$@")
  local selected=0
  local key extra

  if [ "$INTERACTIVE" -ne 1 ]; then
    echo "0"
    return 0
  fi

  while true; do
    clear
    echo "$title"
    echo "Use arrow keys and Enter."
    echo ""

    local i
    for i in "${!options[@]}"; do
      if [ "$i" -eq "$selected" ]; then
        printf " > %s\n" "${options[$i]}"
      else
        printf "   %s\n" "${options[$i]}"
      fi
    done

    IFS= read -rsn1 key || true
    case "$key" in
      "")
        echo "$selected"
        return 0
        ;;
      $'\n')
        echo "$selected"
        return 0
        ;;
      $'\x1b')
        IFS= read -rsn2 -t 0.1 extra || true
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

select_network() {
  local idx
  idx="$(arrow_menu "Select deploy network" \
    "local (recommended for development)" \
    "testnet" \
    "mainnet")"
  case "$idx" in
    0) echo "local" ;;
    1) echo "testnet" ;;
    2) echo "mainnet" ;;
    *) echo "local" ;;
  esac
}

select_credential_mode() {
  local idx
  idx="$(arrow_menu "Select deploy credential mode" \
    "Use .env credentials or existing alias (recommended)" \
    "Type seed phrase in deploy tab/terminal" \
    "Type secret key in deploy tab/terminal" \
    "Cancel")"
  case "$idx" in
    0) echo "env-or-alias" ;;
    1) echo "prompt-seed" ;;
    2) echo "prompt-secret" ;;
    *) echo "cancel" ;;
  esac
}

compose_deploy_command() {
  local network="$1"
  local cred_mode="$2"
  local wait_local=""
  local deploy_cmd=""

  if [ "$network" = "local" ]; then
    wait_local='until curl -sS --max-time 2 http://localhost:8000/rpc >/dev/null 2>&1; do echo "Waiting for local chain RPC..."; sleep 2; done; '
  fi

  case "$cred_mode" in
    env-or-alias)
      deploy_cmd="${wait_local}pnpm run deploy:${network}"
      ;;
    prompt-seed)
      deploy_cmd="${wait_local}read -r -p \"Seed phrase (12/24 words): \" STELLAR_MNEMONIC; STELLAR_MNEMONIC=\"\$STELLAR_MNEMONIC\" pnpm run deploy:${network}"
      ;;
    prompt-secret)
      deploy_cmd="${wait_local}read -r -s -p \"Secret key (S...): \" STELLAR_SECRET_SEED; echo; STELLAR_SECRET_SEED=\"\$STELLAR_SECRET_SEED\" pnpm run deploy:${network}"
      ;;
    *)
      deploy_cmd="${wait_local}pnpm run deploy:${network}"
      ;;
  esac

  printf "%s" "$deploy_cmd"
}

open_in_new_terminal() {
  local label="$1"
  local run_cmd="$2"
  local wrapped
  wrapped="${run_cmd}; echo; echo \"[${label}] session ready. Close this tab when done.\"; exec bash"

  if [ -n "${TMUX:-}" ] && need_cmd tmux; then
    tmux new-window -n "$label" "cd \"$ROOT_DIR\" && $wrapped" >/dev/null 2>&1
    return $?
  fi

  if is_wsl && need_cmd cmd.exe; then
    local distro
    distro="${WSL_DISTRO_NAME:-}"
    cmd.exe /C start "" wt -w 0 new-tab wsl.exe -d "$distro" --cd "$ROOT_DIR" bash -lc "$wrapped" >/dev/null 2>&1
    return $?
  fi

  if is_macos && need_cmd osascript; then
    local mac_cmd escaped
    mac_cmd="$(printf 'cd %q && %s' "$ROOT_DIR" "$wrapped")"
    escaped="${mac_cmd//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    osascript -e "tell application \"Terminal\" to do script \"$escaped\"" >/dev/null 2>&1
    return $?
  fi

  if need_cmd gnome-terminal; then
    gnome-terminal -- bash -lc "cd \"$ROOT_DIR\" && $wrapped" >/dev/null 2>&1 &
    return $?
  fi

  if need_cmd x-terminal-emulator; then
    x-terminal-emulator -e bash -lc "cd \"$ROOT_DIR\" && $wrapped" >/dev/null 2>&1 &
    return $?
  fi

  if need_cmd konsole; then
    konsole --new-tab -e bash -lc "cd \"$ROOT_DIR\" && $wrapped" >/dev/null 2>&1 &
    return $?
  fi

  if need_cmd xterm; then
    xterm -e bash -lc "cd \"$ROOT_DIR\" && $wrapped" >/dev/null 2>&1 &
    return $?
  fi

  return 1
}

run_in_current_terminal() {
  local run_cmd="$1"
  (
    cd "$ROOT_DIR"
    bash -lc "$run_cmd"
  )
}

print_manual_commands() {
  local deploy_cmd="$1"
  echo ""
  echo "Could not open tabs automatically in this terminal environment."
  echo "Run these in 3 separate tabs:"
  echo "  Tab 1: cd \"$ROOT_DIR\" && pnpm chain"
  echo "  Tab 2: cd \"$ROOT_DIR\" && pnpm start"
  echo "  Tab 3: cd \"$ROOT_DIR\" && $deploy_cmd"
  echo ""
}

launch_full_experience() {
  local network cred_mode deploy_cmd
  local launched_chain=0 launched_front=0 launched_deploy=0

  network="$(select_network)"
  cred_mode="$(select_credential_mode)"
  if [ "$cred_mode" = "cancel" ]; then
    return 0
  fi

  deploy_cmd="$(compose_deploy_command "$network" "$cred_mode")"

  echo "==> Launching chain tab..."
  if open_in_new_terminal "chain" "pnpm chain"; then
    launched_chain=1
  fi

  echo "==> Launching frontend tab..."
  if open_in_new_terminal "frontend" "pnpm start"; then
    launched_front=1
  fi

  echo "==> Launching deploy tab..."
  if open_in_new_terminal "deploy" "$deploy_cmd"; then
    launched_deploy=1
  fi

  if [ "$launched_chain" -eq 1 ] && [ "$launched_front" -eq 1 ] && [ "$launched_deploy" -eq 1 ]; then
    echo ""
    echo "All tabs launched."
    echo "- Chain: running in its own tab"
    echo "- Frontend: running in its own tab"
    echo "- Deploy: running in its own tab"
    echo ""
    echo "After deploy completes, it prints the 'First auction quickstart' steps automatically."
    return 0
  fi

  print_manual_commands "$deploy_cmd"

  if [ "$INTERACTIVE" -eq 1 ]; then
    local idx
    idx="$(arrow_menu "Fallback action" \
      "Run deploy here now" \
      "Do nothing and exit")"
    if [ "$idx" = "0" ]; then
      run_in_current_terminal "$deploy_cmd"
    fi
  fi
}

run_chain_only() {
  run_in_current_terminal "pnpm chain"
}

run_frontend_only() {
  run_in_current_terminal "pnpm start"
}

run_deploy_only() {
  local network cred_mode deploy_cmd
  network="$(select_network)"
  cred_mode="$(select_credential_mode)"
  if [ "$cred_mode" = "cancel" ]; then
    return 0
  fi

  deploy_cmd="$(compose_deploy_command "$network" "$cred_mode")"
  run_in_current_terminal "$deploy_cmd"
}

main_menu() {
  local idx
  idx="$(arrow_menu "Shimeji XLM Command Center" \
    "Full experience (frontend + chain + deploy in separate tabs)" \
    "Run chain only" \
    "Run frontend only" \
    "Run deploy only" \
    "Exit")"
  echo "$idx"
}

main() {
  ensure_pnpm
  ensure_workspace_install
  load_root_env_file

  while true; do
    case "$(main_menu)" in
      0) launch_full_experience ;;
      1) run_chain_only ;;
      2) run_frontend_only ;;
      3) run_deploy_only ;;
      4) break ;;
      *) break ;;
    esac

    if [ "$INTERACTIVE" -ne 1 ]; then
      break
    fi
  done
}

main "$@"
