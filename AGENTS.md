# AGENTS

## Release-first push policy (root)

When the user asks to push to GitHub, enforce this flow automatically:

1. Detect whether pushed changes include desktop or extension deliverables.
   - Paths: `desktop/**`, `chrome-extension/**`, `shimeji-eth/packages/nextjs/public/shimeji-chrome-extension.zip`
2. If any of those paths changed, publish release assets **before** `git push`.
   - Run: `./scripts/publish_release_assets.sh`
   - Required assets in release:
     - `shimeji-desktop-windows-portable.exe`
     - `shimeji-desktop-linux.AppImage`
     - `shimeji-chrome-extension.zip`
3. Keep `/download` and `/downloads` pointing to GitHub Releases `latest` download URLs.
4. Never commit desktop binaries (`.exe`, `.AppImage`) to git.
5. Then commit and push source changes.

If release upload is blocked (missing binaries/auth/network), stop and report the blocker instead of pushing incomplete distribution updates.
