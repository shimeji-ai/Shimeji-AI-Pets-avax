#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

repeat_char() {
  local char=$1
  local count=$2
  for ((i=0;i<count;i++)); do
    printf '%s' "$char"
  done
}

print_bar() {
  local pct=$1
  local width=24
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  printf '['
  repeat_char '=' "$filled"
  repeat_char ' ' "$empty"
  printf ']' 
}

steps=(
  "Cleaning previous build|rm -f dist/*.exe"
  "Packaging Windows portable|npx electron-builder --win"
  "Listing artifact|ls -1 dist/Shimeji-Desktop-Portable-0.1.0.exe"
)

total=${#steps[@]}

echo "Starting portable build (requires wine/mingw)."
for index in "${!steps[@]}"; do
  entry=${steps[index]}
  description=${entry%%|*}
  command=${entry#*|}
  step=$((index + 1))

  printf "Step %d/%d: %-40s " "$step" "$total" "$description"
  print_bar 0
  printf '\r'

  eval "$command"

  printf "Step %d/%d: %-40s " "$step" "$total" "$description"
  print_bar 100
  echo " done"
  sleep 0.1
done

echo "Portable build complete. Run dist/Shimeji-Desktop-Portable-0.1.0.exe on Windows."
