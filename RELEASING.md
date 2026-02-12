# Releasing Desktop + Extension Assets

This repository does **not** commit desktop binaries to git.  
When desktop app or extension distribution artifacts change, publish them to GitHub Releases.

## Policy

- Any change under `desktop/` that affects a shipped build must be followed by a GitHub Release asset upload.
- Any extension package change intended for users must include `shimeji-chrome-extension.zip` in the same release upload.
- Do not commit large binary artifacts (`.exe`, `.AppImage`) into the repository.

## Required Assets

- `shimeji-desktop-windows-portable.exe`
- `shimeji-desktop-linux.AppImage`
- `shimeji-chrome-extension.zip`

## Standard Flow

1. Build desktop artifacts in `desktop/dist/`.
2. Run:
   ```bash
   ./scripts/publish_release_assets.sh
   ```
   Optional: pass a tag and title:
   ```bash
   ./scripts/publish_release_assets.sh v0.1.0 "Shimeji Desktop v0.1.0"
   ```
3. Confirm assets exist in the GitHub Release page.
4. Push code changes.

## Requirements

- GitHub CLI installed and authenticated (`gh auth login`).
- `zip` installed (used to build `shimeji-chrome-extension.zip` from `chrome-extension/`).
