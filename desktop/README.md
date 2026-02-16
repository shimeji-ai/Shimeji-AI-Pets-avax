# Shimeji Desktop
The Electron runtime for Shimeji AI Pets. It powers the native window, settings UI, chat overlay, and local providers (OpenRouter/Ollama/OpenClaw).

## Build
1. `cd desktop`
2. `npm install`
3. `./build-portable.sh` (recommended) or `npx electron-builder --win` to regenerate `dist/Shimeji-Desktop-Portable-0.1.0.exe`.
4. Optionally build other packages with `npx electron-builder --linux` or `npx electron-builder --mac`.

When the build finishes, verify the artifacts under `desktop/dist/` before continuing.

## Release
Use `./scripts/publish_release_assets.sh` from the repository root to upload the Windows portable exe, Linux AppImage, and extension zips to GitHub Releases. Make sure `gh` is authenticated first.

## Testing
- Run `npm start` locally to preview the app in development mode.
- Copy the portable exe to a Windows machine (or run via Wine) to confirm the mascots appear, settings open, and chat works.

## Notes
- Keep `renderer/` assets (characters, settings UI) in sync before building.
- Desktop binaries should never be committed to git; the release script handles uploads.
- Use the new **Start Shimeji on system login** toggle in settings to keep the desktop client running automatically across Windows, macOS, and Linux logins.
