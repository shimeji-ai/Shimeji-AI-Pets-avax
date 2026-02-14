#!/usr/bin/env bash
set -euo pipefail

# Instala los prerequisitos para desplegar contratos Soroban:
# - Stellar CLI (`stellar`)
# - Rust toolchain (si falta)
# - Target WASM: wasm32v1-none (actual) + legacy fallback

info() {
  echo "==> $*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if ! need_cmd curl; then
  echo "Error: curl no esta instalado." >&2
  echo "Instalalo y vuelve a correr este script." >&2
  exit 1
fi

install_stellar_cli() {
  if need_cmd stellar; then
    info "Stellar CLI ya esta instalado: $(stellar --version 2>/dev/null || echo 'ok')"
    return
  fi

  info "Instalando Stellar CLI..."
  curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh

  # Refresca hash de comandos en shells compatibles.
  hash -r 2>/dev/null || true

  if ! need_cmd stellar; then
    # Algunas instalaciones dejan el binario en ~/.local/bin
    if [ -x "$HOME/.local/bin/stellar" ]; then
      export PATH="$HOME/.local/bin:$PATH"
    fi
  fi

  if ! need_cmd stellar; then
    echo "Error: Stellar CLI no quedo disponible en PATH." >&2
    echo "Agrega ~/.local/bin a PATH y reintenta." >&2
    exit 1
  fi

  info "Stellar CLI listo: $(stellar --version 2>/dev/null || echo 'installed')"
}

install_rust_if_missing() {
  if need_cmd rustup; then
    info "Rustup ya esta instalado."
    return
  fi

  info "Instalando Rustup (toolchain de Rust)..."
  curl https://sh.rustup.rs -sSf | sh -s -- -y

  # Carga entorno de cargo para esta shell.
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"

  if ! need_cmd rustup; then
    echo "Error: rustup no quedo disponible en PATH." >&2
    echo "Abri una nueva terminal o source ~/.cargo/env" >&2
    exit 1
  fi
}

ensure_wasm_target() {
  # shellcheck source=/dev/null
  if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
  fi

  if ! need_cmd rustup; then
    echo "Error: rustup no disponible para agregar target WASM." >&2
    exit 1
  fi

  if rustup target list --installed | grep -qx "wasm32v1-none"; then
    info "Target wasm32v1-none ya instalado."
  else
    info "Agregando target wasm32v1-none..."
    rustup target add wasm32v1-none
  fi

  # Compatibilidad con toolchains/flows legacy.
  if ! rustup target list --installed | grep -qx "wasm32-unknown-unknown"; then
    info "Agregando target legacy wasm32-unknown-unknown..."
    rustup target add wasm32-unknown-unknown
  fi
}

install_stellar_cli
install_rust_if_missing
ensure_wasm_target

echo ""
echo "Prerrequisitos listos."
echo "- Stellar CLI: $(stellar --version 2>/dev/null || echo 'ok')"
if command -v rustc >/dev/null 2>&1; then
  echo "- Rust: $(rustc --version)"
fi
echo "- WASM targets: wasm32v1-none, wasm32-unknown-unknown"
