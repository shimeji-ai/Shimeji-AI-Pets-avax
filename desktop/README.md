# Shimeji Desktop
The Electron runtime for Shimeji AI Pets. It powers the native window, settings UI, chat overlay, and local providers (OpenRouter/Ollama/OpenClaw).

## Build
1. `cd desktop`
2. `npm install`
3. `bash scripts/build.sh` to open the platform menu (defaults to building all targets in parallel). The script writes `dist/build.log` plus a dedicated `dist/build-<target>.log` for Windows/macOS/Linux.
4. If you only need one platform, choose the corresponding option (`Windows`, `macOS`, `Linux`) when the menu appears.
5. Manual alternatives are still available (`npx electron-builder --win`, `--mac`, or `--linux`) if a scripted build is preferred.

When the run finishes, confirm the artifacts and log files under `desktop/dist/` before continuing.

Set `SHIMEJI_BUILD_TARGET` (`all`, `windows`, `macos`, or `linux`) or pass the desired key (`./scripts/build.sh linux`) to run a specific workflow without the prompt.

## Release
Use `./scripts/publish_release_assets.sh` from the repository root to upload the Windows portable exe, Linux AppImage, and extension zips to GitHub Releases. Make sure `gh` is authenticated first.

## Testing
- Run `npm start` locally to preview the app in development mode.
- Copy the portable exe to a Windows machine (or run via Wine) to confirm the mascots appear, settings open, and chat works.

## Notes
- Keep `renderer/` assets (characters, settings UI) in sync before building.
- Desktop binaries should never be committed to git; the release script handles uploads.
- Use the new **Start Shimeji on system login** toggle in settings to keep the desktop client running automatically across Windows, macOS, and Linux logins.
