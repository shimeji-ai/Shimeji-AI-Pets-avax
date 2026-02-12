# Desktop Build Instructions

## Quick Build (Recommended)

Run the build script to create a new portable exe:

```bash
cd /home/lulox/Shimeji-AI-Pets/desktop
./build-portable.sh
```

Or manually:

```bash
cd /home/lulox/Shimeji-AI-Pets/desktop
rm -f dist/*.exe && npx electron-builder --win
```

**Expected time:** 3-5 minutes

## Build Process

The build creates a Nullsoft Installer self-extracting portable exe (`Shimeji-Desktop-Portable-0.1.0.exe`).

## Verification

After build completes, verify the exe was created:

```bash
ls -la /home/lulox/Shimeji-AI-Pets/desktop/dist/Shimeji-Desktop-Portable-0.1.0.exe
file /home/lulox/Shimeji-AI-Pets/desktop/dist/Shimeji-Desktop-Portable-0.1.0.exe
```

Expected output: `PE32 executable (GUI) Intel 80386, for MS Windows, Nullsoft Installer self-extracting archive`

## When to Build

- **AFTER every successful code change** in `desktop/renderer/` or `desktop/main.js`
- After modifying settings UI (`settings.html`, `settings.css`, `settings.js`)
- After modifying the overlay (`overlay.js`)
- After modifying the main process (`main.js`)

## When NOT to Build

- If you need clarification from the user before proceeding
- If the build command fails (document the error and try alternative approach)
- If you're just reading files to understand the codebase

## Build Failure Troubleshooting

If `npx electron-builder --win` fails:

1. **Check if electron-builder is installed:** `npm list electron-builder`
2. **Try reinstalling:** `npm install electron-builder@24.13.3 --save-dev`
3. **Clear cache and retry:** `rm -rf node_modules/.cache && npx electron-builder --win`
4. **Try with explicit project dir:** `npx electron-builder --win --projectDir .`

## Key Files

| File | Purpose |
|------|---------|
| `renderer/overlay.js` | Shimeji rendering, physics, behavior |
| `renderer/settings.html` | Settings UI layout |
| `renderer/settings.css` | Settings UI styling |
| `renderer/settings.js` | Settings UI logic |
| `main.js` | Electron main process, config store |
| `renderer/characters/` | Character sprite folders (shimeji, bunny, kitten, egg) |

## Testing the Build

Copy the portable exe to a Windows machine and verify:
1. Shimejis appear on screen
2. They fall and start walking
3. Click opens chat, double-click makes them jump
4. Settings window opens and works
5. Adding/removing shimejis works
