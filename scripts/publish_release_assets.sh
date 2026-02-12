#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${GITHUB_REPOSITORY:-luloxi/Shimeji-AI-Pets}"
TAG="${1:-desktop-assets-$(date +%Y%m%d-%H%M%S)}"
TITLE="${2:-Desktop assets ${TAG}}"

WIN_ASSET="${ROOT_DIR}/desktop/dist/Shimeji-Desktop-Portable-0.1.0.exe"
LINUX_ASSET="${ROOT_DIR}/desktop/dist/Shimeji Desktop-0.1.0.AppImage"
EXT_SOURCE_DIR="${ROOT_DIR}/chrome-extension"
EXT_ZIP="${ROOT_DIR}/shimeji-eth/packages/nextjs/public/shimeji-chrome-extension.zip"

for file in "$WIN_ASSET" "$LINUX_ASSET"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing asset: $file" >&2
    exit 1
  fi
done

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it and run 'gh auth login' first." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "'zip' is required to package the Chrome extension." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if [[ ! -d "$EXT_SOURCE_DIR" ]]; then
  echo "Missing extension directory: $EXT_SOURCE_DIR" >&2
  exit 1
fi

# Always regenerate extension zip from the current chrome-extension folder.
rm -f "$EXT_ZIP"
(
  cd "$EXT_SOURCE_DIR"
  zip -rq "$EXT_ZIP" . -x ".git/*" "node_modules/*"
)

if ! gh release view "$TAG" -R "$REPO" >/dev/null 2>&1; then
  gh release create "$TAG" -R "$REPO" --title "$TITLE" --notes "Automated desktop asset upload."
fi

UPLOAD_ARGS=(
  "$TAG"
  "${WIN_ASSET}#shimeji-desktop-windows-portable.exe"
  "${LINUX_ASSET}#shimeji-desktop-linux.AppImage"
  "${EXT_ZIP}#shimeji-chrome-extension.zip"
  --clobber
  -R "$REPO"
)

gh release upload "${UPLOAD_ARGS[@]}"

echo "Uploaded assets to release ${TAG}"
echo "Windows: https://github.com/${REPO}/releases/download/${TAG}/shimeji-desktop-windows-portable.exe"
echo "Linux:   https://github.com/${REPO}/releases/download/${TAG}/shimeji-desktop-linux.AppImage"
echo "Chrome:  https://github.com/${REPO}/releases/download/${TAG}/shimeji-chrome-extension.zip"
