#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXTJS_DIR="$ROOT_DIR/nextjs"

is_localhost_target() {
  local host="$1"
  case "$host" in
    localhost|127.*|::1) return 0 ;;
  esac
  return 1
}

port_is_listening() {
  local port="${1:-3000}"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0 || return 1
  fi
  return 1
}

prompt_localhost_port_conflict() {
  local host="${1:-${HOST:-localhost}}"
  local port="${2:-${PORT:-3000}}"
  if [ "$port" != "3000" ]; then
    return
  fi
  if ! is_localhost_target "$host"; then
    return
  fi

  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi

  local pid=""
  local cmd=""
  while IFS= read -r line; do
    case "$line" in
      p*) pid="${line#p}" ;;
      c*) cmd="${line#c}" ;;
    esac
    if [ -n "$pid" ] && [ -n "$cmd" ]; then
      break
    fi
  done < <(lsof -nP -F pc -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)

  if [ -z "$pid" ]; then
    return
  fi

  local args="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  if [ -z "$args" ]; then
    args="$cmd"
  fi

  echo "==> $host:$port already in use by PID $pid ($args)"
  if [ -t 0 ]; then
    read -r -p "Terminate that session and keep using port $port? [y/N] " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
      kill "$pid" 2>/dev/null || true
      for _ in {1..5}; do
        if ! port_is_listening "$port"; then
          break
        fi
        sleep 0.2
      done
      if port_is_listening "$port"; then
        echo "==> port still occupied after killing PID $pid; Next may fall back to another port."
      fi
    else
      echo "==> Leaving the existing session running; Next may pick an alternate port."
    fi
  else
    echo "==> Terminal is not interactive; continue and let Next choose a different port."
  fi
}

die() {
  echo "Error: $*" >&2
  exit 1
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    echo "==> pnpm not found. Trying to enable via corepack..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10.24.0 --activate >/dev/null 2>&1 || true
  fi

  command -v pnpm >/dev/null 2>&1 || die "pnpm is required. Install Node.js + corepack or install pnpm manually."
}

[ -d "$NEXTJS_DIR" ] || die "Missing nextjs directory: $NEXTJS_DIR"
ensure_pnpm

cd "$NEXTJS_DIR"
if [ ! -d node_modules ]; then
  echo "==> Installing frontend dependencies..."
  pnpm install
fi

NEXT_HOST="${HOST:-localhost}"
NEXT_PORT="${PORT:-3000}"
if [ "$NEXT_PORT" = "3000" ]; then
  prompt_localhost_port_conflict "$NEXT_HOST" "$NEXT_PORT"
fi

echo "==> Starting frontend on http://$NEXT_HOST:$NEXT_PORT"
exec pnpm dev
