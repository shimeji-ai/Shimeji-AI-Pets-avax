#!/bin/bash

# Shimeji Desktop - Portable EXE Build Script
# This script builds the Nullsoft Installer portable executable for Windows

set -e

echo "========================================"
echo "Shimeji Desktop - Portable Build"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "Syncing runtime core assets..."
node ../scripts/sync-runtime-core.js >/dev/null

# Check if we're on Linux (required for Windows cross-compilation)
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Warning: This build is designed to run on Linux for Windows cross-compilation."
    echo "On macOS, you may need 'electron-builder' with specific flags."
    echo ""
fi

# Clean old builds
echo "Cleaning old builds..."
rm -rf dist/*.exe
rm -rf dist/win-unpacked

# Build the portable executable
echo "Building portable Windows executable..."
echo "This may take 3-5 minutes..."
echo ""

npx electron-builder --win

# Verify the build
echo ""
echo "========================================"
echo "Build Verification"
echo "========================================"

if [ -f "dist/Shimeji-Desktop-Portable-0.1.0.exe" ]; then
    echo "SUCCESS: Portable exe created!"
    echo ""
    file "dist/Shimeji-Desktop-Portable-0.1.0.exe"
    echo ""
    echo "File size:"
    ls -lh "dist/Shimeji-Desktop-Portable-0.1.0.exe"
    echo ""
    echo "Next steps:"
    echo "1. Copy dist/Shimeji-Desktop-Portable-0.1.0.exe to a Windows machine"
    echo "2. Run the executable to install Shimeji Desktop"
else
    echo "ERROR: Build failed - executable not found!"
    exit 1
fi
