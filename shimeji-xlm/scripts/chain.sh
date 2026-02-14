#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOROBAN_DIR="$ROOT_DIR/soroban"
CONTAINER_NAME="${STELLAR_LOCAL_CONTAINER_NAME:-local}"
PORTS_MAPPING="${STELLAR_LOCAL_PORTS_MAPPING:-8000:8000}"
DOCKER_WAIT_SECONDS="${DOCKER_WAIT_SECONDS:-5}"
STELLAR_CONTAINER_USE_SUDO=0
ACTIVE_CONTAINER=""

if [[ "$CONTAINER_NAME" == stellar-* ]]; then
  CONTAINER_NAME_ALT="${CONTAINER_NAME#stellar-}"
else
  CONTAINER_NAME_ALT="stellar-$CONTAINER_NAME"
fi

INTERACTIVE=0
if [ -t 0 ] && [ -t 1 ]; then
  INTERACTIVE=1
fi

die() {
  print_sad_end "$*"
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

progress_line() {
  local pct="$1"
  local label="$2"
  local width=26
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  printf "\r[%s%s] %3d%% %s" \
    "$(printf '%*s' "$filled" '' | tr ' ' '#')" \
    "$(printf '%*s' "$empty" '' | tr ' ' '-')" \
    "$pct" \
    "$label"
}

run_with_loading_bar() {
  local title="$1"
  local detail="$2"
  shift 2

  local log_file pid rc elapsed pct
  log_file="$(mktemp)"

  echo ""
  print_pet_pixel_art
  echo "$title"
  echo "  $detail"

  "$@" >"$log_file" 2>&1 &
  pid=$!

  local start_ts="$SECONDS"
  while kill -0 "$pid" >/dev/null 2>&1; do
    elapsed=$((SECONDS - start_ts))
    pct=$((5 + (elapsed * 8) % 89))
    progress_line "$pct" "$title"
    sleep 0.2
  done

  if wait "$pid"; then
    progress_line 100 "$title"
    echo ""
    rm -f "$log_file"
    return 0
  fi

  rc=$?
  progress_line 100 "$title (failed)"
  echo ""
  print_sad_end "Failed while running: $title"
  echo "  Failed while running: $title" >&2
  echo "  Recent output:" >&2
  sed -n '1,120p' "$log_file" >&2
  rm -f "$log_file"
  return "$rc"
}

ensure_sudo_ticket() {
  if ! need_cmd sudo; then
    echo "sudo is required to run this automatic install path." >&2
    return 1
  fi
  echo "A sudo password prompt may appear now."
  sudo -v
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

attach_wsl_docker_desktop_cli() {
  if ! is_wsl; then
    return
  fi
  if need_cmd docker; then
    return
  fi

  local desktop_cli="/mnt/wsl/docker-desktop/cli-tools/usr/bin"
  if [ -x "$desktop_cli/docker" ]; then
    export PATH="$desktop_cli:$PATH"
  fi
}

docker_ready() {
  attach_wsl_docker_desktop_cli
  need_cmd docker || return 1
  docker info >/dev/null 2>&1
}

docker_ready_with_sudo() {
  attach_wsl_docker_desktop_cli
  need_cmd docker || return 1
  need_cmd sudo || return 1
  sudo docker info >/dev/null 2>&1
}

docker_access_ready() {
  if docker_ready; then
    STELLAR_CONTAINER_USE_SUDO=0
    return 0
  fi
  if docker_ready_with_sudo; then
    STELLAR_CONTAINER_USE_SUDO=1
    return 0
  fi
  return 1
}

current_docker_issue() {
  attach_wsl_docker_desktop_cli
  if ! need_cmd docker; then
    echo "docker CLI not found in PATH."
    return
  fi
  if ! docker info >/dev/null 2>&1; then
    local details
    details="$(docker info 2>&1 || true)"
    if echo "$details" | grep -qi "permission denied"; then
      echo "docker daemon is running but current user lacks permission (docker group not active yet)."
      return
    fi
    echo "docker daemon is not running or not reachable."
    return
  fi
  echo ""
}

print_testnet_fallback() {
  local reason="${1:-Docker setup for local chain is not ready.}"
  print_sad_end "$reason"
  echo "" >&2
  echo "If you want to continue without local Docker, use testnet flow:" >&2
  echo "  pnpm deploy -- testnet" >&2
  echo "  pnpm start" >&2
  echo "" >&2
  print_deploy_paths >&2
}

print_deploy_paths() {
  echo "After pnpm chain, deploy with one of these:"
  echo "  - Local dev:  pnpm deploy -- local   (then pnpm start)"
  echo "  - Testnet:    pnpm deploy -- testnet (then pnpm start)"
  echo "  - Mainnet:    pnpm deploy -- mainnet"
  echo "                then copy deploy output env vars to Vercel and redeploy web"
}

print_chain_commands() {
  echo "Local chain commands:"
  echo "  - View live block/log output: pnpm chain --logs"
  echo "  - View running status:        pnpm chain --status"
  echo "  - Turn off chain:             pnpm chain --off"
  echo ""
  print_deploy_paths
}

offer_running_chain_actions() {
  local running_name="$1"
  local choice logs_rc

  if [ "$INTERACTIVE" -ne 1 ]; then
    print_chain_commands
    return 0
  fi

  while true; do
    echo ""
    echo "Chain assistant options:"
    echo "1) View blocks/logs now"
    echo "2) Turn off chain now"
    echo "3) Do nothing and exit"
    read -r -p "Option [3]: " choice
    choice="${choice:-3}"

    case "$choice" in
      1)
        echo "Streaming logs for '$running_name' (Ctrl+C to return to menu)..."
        set +e
        run_docker_cmd logs -f "$running_name"
        logs_rc=$?
        set -e
        if [ "$logs_rc" -ne 0 ] && [ "$logs_rc" -ne 130 ]; then
          echo "Log stream ended with code $logs_rc."
        fi
        ;;
      2)
        run_docker_cmd stop "$running_name"
        echo "==> Chain stopped."
        print_chain_commands
        return 0
        ;;
      3)
        echo "Leaving chain running."
        print_chain_commands
        return 0
        ;;
      *)
        echo "Invalid option."
        ;;
    esac
  done
}

print_pet_pixel_art() {
  cat <<'ART'
      (\_/)        /\_/\
      (o.o)       ( o.o )
      /|_|\        > ^ <
ART
}

print_happy_end() {
  local message="${1:-Thank you!}"
  echo ""
  cat <<'ART'
      (\_/)        /\_/\
      (^.^)       (^.^)
      /|_|\        > ^ <
ART
  echo "$message"
}

print_sad_end() {
  local reason="${1:-Something failed.}"
  echo ""
  cat <<'ART'
      (\_/)        /\_/\
      (T.T)       (T.T)
      /|_|\        > ~ <
ART
  echo "Something failed: $reason"
}

wait_for_docker_connection() {
  local context_message="$1"

  echo ""
  print_pet_pixel_art
  echo "$context_message"
  echo "Waiting for Docker connection from this terminal..."
  echo "Checks every ${DOCKER_WAIT_SECONDS}s. Press Ctrl+C to stop waiting."

  while ! docker_access_ready; do
    echo "  still waiting... $(date '+%H:%M:%S')"
    sleep "$DOCKER_WAIT_SECONDS"
  done

  if [ "$STELLAR_CONTAINER_USE_SUDO" = "1" ]; then
    echo "Docker connection detected (using sudo fallback in this session)."
  else
    echo "Docker connection detected."
  fi
}

install_docker_wsl_native() {
  ensure_sudo_ticket || return 1
  if ! need_cmd apt-get; then
    echo "This distro is not apt-based. Install docker manually for this distro." >&2
    return 1
  fi

  run_with_loading_bar \
    "Preparing package index" \
    "Running apt-get update" \
    sudo apt-get update
  run_with_loading_bar \
    "Installing Docker in WSL" \
    "Installing docker.io package" \
    sudo apt-get install -y docker.io
  run_with_loading_bar \
    "Configuring Docker user access" \
    "Adding current user to docker group" \
    sudo usermod -aG docker "$USER"

  if need_cmd systemctl; then
    run_with_loading_bar \
      "Starting Docker service" \
      "Enabling and starting docker with systemctl" \
      sudo systemctl enable --now docker || true
  else
    run_with_loading_bar \
      "Starting Docker service" \
      "Starting docker via service command" \
      sudo service docker start || true
  fi

  echo "==> Docker native install completed in WSL."
  if docker_ready_with_sudo; then
    STELLAR_CONTAINER_USE_SUDO=1
    echo "Using sudo fallback for Docker in this session."
  fi
  echo "If you want non-sudo Docker commands in new terminals, run: newgrp docker"
}

install_docker_linux_native() {
  ensure_sudo_ticket || return 1
  if ! need_cmd apt-get; then
    echo "Auto-install currently supports apt-based Linux. Install Docker manually for your distro." >&2
    return 1
  fi

  run_with_loading_bar \
    "Preparing package index" \
    "Running apt-get update" \
    sudo apt-get update
  run_with_loading_bar \
    "Installing Docker Engine" \
    "Installing docker.io package" \
    sudo apt-get install -y docker.io
  run_with_loading_bar \
    "Configuring Docker user access" \
    "Adding current user to docker group" \
    sudo usermod -aG docker "$USER"

  if need_cmd systemctl; then
    run_with_loading_bar \
      "Starting Docker service" \
      "Enabling and starting docker with systemctl" \
      sudo systemctl enable --now docker
  else
    run_with_loading_bar \
      "Starting Docker service" \
      "Starting docker via service command" \
      sudo service docker start
  fi

  echo "==> Docker install completed."
  if docker_ready_with_sudo; then
    STELLAR_CONTAINER_USE_SUDO=1
    echo "Using sudo fallback for Docker in this session."
  fi
  echo "If you want non-sudo Docker commands in new terminals, run: newgrp docker"
}

install_or_start_docker_desktop_macos() {
  if need_cmd brew; then
    run_with_loading_bar \
      "Installing Docker Desktop" \
      "Running brew install --cask docker" \
      brew install --cask docker || true
  else
    echo "Homebrew not found. Install Docker Desktop manually from docker.com/products/docker-desktop"
  fi

  echo "Open Docker Desktop and wait until 'Engine running'."
}

resolve_docker_interactive() {
  local issue

  while ! docker_access_ready; do
    issue="$(current_docker_issue)"

    echo ""
    print_pet_pixel_art
    echo "Docker is required for local chain mode (stellar container start)."
    [ -n "$issue" ] && echo "Current issue: $issue"
    echo ""

    if is_wsl; then
      cat <<'WSL_OPTIONS'
Choose an option:
1) Recommended (Windows): Use Docker Desktop + enable WSL integration, then wait for connection
2) Install Docker directly inside WSL now (automatic)
3) Retry check now
4) Exit
WSL_OPTIONS
      read -r -p "Option [1]: " choice
      choice="${choice:-1}"

      case "$choice" in
        1)
          cat <<'WSL_STEPS'

Windows + WSL recommended setup:
1. Install Docker Desktop on Windows.
2. Open Docker Desktop.
3. Go to Settings > Resources > WSL integration.
4. Enable integration for this distro.
5. Wait until Docker Desktop shows Engine running.
WSL_STEPS
          wait_for_docker_connection "Waiting for Docker Desktop + WSL integration to become available..."
          ;;
        2)
          install_docker_wsl_native || true
          wait_for_docker_connection "Waiting after native WSL Docker installation..."
          ;;
        3)
          ;;
        4)
          print_testnet_fallback
          return 1
          ;;
        *)
          echo "Invalid option."
          ;;
      esac
      continue
    fi

    if is_macos; then
      cat <<'MAC_OPTIONS'
Choose an option:
1) Install/start Docker Desktop (recommended), then wait for connection
2) Retry check now
3) Exit
MAC_OPTIONS
      read -r -p "Option [1]: " choice
      choice="${choice:-1}"

      case "$choice" in
        1)
          install_or_start_docker_desktop_macos || true
          wait_for_docker_connection "Waiting for Docker Desktop Engine to become available..."
          ;;
        2)
          ;;
        3)
          print_testnet_fallback
          return 1
          ;;
        *)
          echo "Invalid option."
          ;;
      esac
      continue
    fi

    cat <<'LINUX_OPTIONS'
Choose an option:
1) Install Docker Engine now (automatic, apt-based)
2) Retry check now
3) Exit
LINUX_OPTIONS
    read -r -p "Option [1]: " choice
    choice="${choice:-1}"

    case "$choice" in
      1)
        install_docker_linux_native || true
        wait_for_docker_connection "Waiting after native Docker installation..."
        ;;
      2)
        ;;
      3)
        print_testnet_fallback
        return 1
        ;;
      *)
        echo "Invalid option."
        ;;
    esac
  done

  if [ "$STELLAR_CONTAINER_USE_SUDO" = "1" ]; then
    echo "==> Continuing with sudo fallback for container commands in this session."
  fi
  return 0
}

ensure_docker_ready() {
  if docker_access_ready; then
    return 0
  fi

  if [ "$INTERACTIVE" -eq 1 ]; then
    resolve_docker_interactive
    return $?
  fi

  echo "Error: $(current_docker_issue)" >&2
  echo "Docker is required for local chain mode (stellar container start)." >&2
  print_testnet_fallback "$(current_docker_issue)"
  return 1
}

run_stellar_container_cmd() {
  if [ "$STELLAR_CONTAINER_USE_SUDO" = "1" ]; then
    sudo env "PATH=$PATH" stellar container "$@"
  else
    stellar container "$@"
  fi
}

run_docker_ps_cmd() {
  if [ "$STELLAR_CONTAINER_USE_SUDO" = "1" ]; then
    sudo docker ps "$@"
  else
    docker ps "$@"
  fi
}

run_docker_cmd() {
  if [ "$STELLAR_CONTAINER_USE_SUDO" = "1" ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

container_name_label() {
  if [ "$CONTAINER_NAME_ALT" = "$CONTAINER_NAME" ]; then
    printf "'%s'" "$CONTAINER_NAME"
  else
    printf "'%s' or '%s'" "$CONTAINER_NAME" "$CONTAINER_NAME_ALT"
  fi
}

find_container_name() {
  local mode="${1:-any}"
  local candidate name previous=""

  for candidate in "$CONTAINER_NAME" "$CONTAINER_NAME_ALT"; do
    [ -z "$candidate" ] && continue
    [ "$candidate" = "$previous" ] && continue
    previous="$candidate"

    if [ "$mode" = "running" ]; then
      name="$(run_docker_ps_cmd --filter "name=^/${candidate}$" --filter "status=running" --format "{{.Names}}" | head -n1 || true)"
    else
      name="$(run_docker_ps_cmd -a --filter "name=^/${candidate}$" --format "{{.Names}}" | head -n1 || true)"
    fi

    if [ "$name" = "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

container_running() {
  ACTIVE_CONTAINER="$(find_container_name running || true)"
  [ -n "$ACTIVE_CONTAINER" ]
}

container_exists() {
  ACTIVE_CONTAINER="$(find_container_name any || true)"
  [ -n "$ACTIVE_CONTAINER" ]
}

ACTION="${1:-start}"
NETWORK="${2:-local}"

case "$ACTION" in
  --off|off) ACTION="stop" ;;
  --logs) ACTION="logs" ;;
  --status) ACTION="status" ;;
  --help|-h) ACTION="help" ;;
  --on) ACTION="start" ;;
esac

case "$ACTION" in
  start|stop|logs|status|help) ;;
  local|testnet|futurenet|pubnet)
    NETWORK="$ACTION"
    ACTION="start"
    ;;
  *)
    die "Usage: ./scripts/chain.sh [start [local|testnet|futurenet|pubnet] | stop | logs | status]"
    ;;
esac

if [ "$ACTION" = "help" ]; then
  echo "Usage:"
  echo "  ./scripts/chain.sh                # start local chain"
  echo "  ./scripts/chain.sh start local    # start local chain explicitly"
  echo "  ./scripts/chain.sh --off          # stop local chain"
  echo "  ./scripts/chain.sh --logs         # show chain logs (block/activity stream)"
  echo "  ./scripts/chain.sh --status       # show chain status"
  echo "  ./scripts/chain.sh stop           # stop container"
  echo "  ./scripts/chain.sh logs           # tail container logs"
  echo "  ./scripts/chain.sh status         # show container status"
  echo ""
  print_chain_commands
  exit 0
fi

if [ "$ACTION" = "status" ]; then
  ensure_docker_ready || exit 1
  if container_exists; then
    run_docker_ps_cmd -a --filter "name=^/${ACTIVE_CONTAINER}$" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    if [ "$ACTIVE_CONTAINER" != "$CONTAINER_NAME" ]; then
      echo "Alias note: requested '$CONTAINER_NAME', active container is '$ACTIVE_CONTAINER'."
    fi
  else
    echo "==> Chain container not found for names: $(container_name_label)."
  fi
  print_chain_commands
  exit 0
fi

ensure_docker_ready || exit 1

if [ "$ACTION" = "start" ]; then
  if container_running; then
    echo "==> Local chain '$ACTIVE_CONTAINER' is already running."
    offer_running_chain_actions "$ACTIVE_CONTAINER"
    print_happy_end "Thank you! Chain assistant finished."
    exit 0
  fi

  cd "$SOROBAN_DIR"
  run_with_loading_bar \
    "Preparing Soroban prerequisites" \
    "Checking/installing Stellar CLI, Rust, and WASM target" \
    ./scripts/install_prereqs.sh
  need_cmd stellar || die "stellar CLI not found after install_prereqs"

  echo "==> Starting Stellar container '$CONTAINER_NAME' on network '$NETWORK'..."
  echo "==> RPC should be available at: http://localhost:8000/rpc"
  echo "==> Keep this terminal open. Use a second terminal for deploy/frontend."
  print_chain_commands
  START_LOG="$(mktemp)"
  set +e
  run_stellar_container_cmd start "$NETWORK" --name "$CONTAINER_NAME" --ports-mapping "$PORTS_MAPPING" 2>&1 | tee "$START_LOG"
  rc=${PIPESTATUS[0]}
  set -e

  if [ "$rc" -ne 0 ] && grep -qi "already running" "$START_LOG"; then
    if container_running; then
      echo "==> Local chain '$ACTIVE_CONTAINER' is already running."
      offer_running_chain_actions "$ACTIVE_CONTAINER"
    else
      echo "==> Local chain is already running."
      print_chain_commands
    fi
    rm -f "$START_LOG"
    print_happy_end "Thank you! Chain assistant finished."
    exit 0
  fi
  rm -f "$START_LOG"

  if [ "$rc" -eq 0 ] || [ "$rc" -eq 130 ]; then
    print_happy_end "Thank you! Chain session finished."
  else
    print_chain_commands
    print_sad_end "Chain session exited with code $rc."
  fi
  exit "$rc"
fi

if [ "$ACTION" = "stop" ]; then
  if ! container_running; then
    if container_exists; then
      echo "==> Chain container '$ACTIVE_CONTAINER' exists but is not running."
    else
      echo "==> Chain container $(container_name_label) is not running."
    fi
    print_chain_commands
    exit 0
  fi
  run_docker_cmd stop "$ACTIVE_CONTAINER"
  echo "==> Chain stopped."
  print_chain_commands
  exit $?
fi

if [ "$ACTION" = "logs" ]; then
  if ! container_running; then
    echo "==> Chain container $(container_name_label) is not running."
    print_chain_commands
    exit 1
  fi
  run_docker_cmd logs -f "$ACTIVE_CONTAINER"
  exit $?
fi
