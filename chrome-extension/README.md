# Shimeji Chrome Extension

A small Chrome extension that adds a digital mascot (a "shimeji") to web pages. The mascot either follows your mouse pointer or wanders around the browser window when idle. Connect a Stellar wallet (Freighter) to link your Factory account and future eggs.

## Features

- **Pointer follow / wander:** Mascots follow the pointer while you move, and wander autonomously when idle.
- **Freighter wallet connect:** Connect your Stellar wallet to sync your account and upcoming eggs.
- **Lightweight:** Minimal permissions and a simple UI for toggling mascots and settings.

## Quick install (dev mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this repository folder.
4. Open any webpage to see the mascot injected (or open [popup.html](popup.html) to interact with the extension UI).

## How it works (high level)

- Background script (`background.js`) listens for UI events and manages extension state.
- Content scripts (`content.js`, `dapp_content_script.js`) inject the mascot and handle pointer/wander behavior.
- `config.html` and `popup.html` provide a simple UI for toggling mascots and settings.
- Wallet connection is handled via Freighter on the externally hosted connection page.

## Five testable milestones

Follow these steps to verify core functionality locally. Each milestone includes expected results and where to look in the code.

- **Milestone 1 — Install and show default mascot:**

  - Steps: Install the extension using the Quick install steps above. Open any page.
  - Expected result: A mascot appears on the page and wanders around.
  - Files: See [content.js](content.js) and [manifest.json](manifest.json).

- **Milestone 2 — Pointer follow behavior:**

  - Steps: Move your mouse around the page. Observe the mascot's motion.
  - Expected result: While you move the pointer, the mascot follows the cursor smoothly; when you stop moving the pointer, after a short delay the mascot returns to wandering mode.
  - Files: Behavior implemented in [content.js](content.js) and helper logic in [dapp_content_script.js](dapp_content_script.js).

- **Milestone 3 — Toggle mascots via UI:**

  - Steps: Open the extension popup via the toolbar icon (or open [popup.html](popup.html) directly). Select a different mascot if available.
  - Expected result: The selected mascot replaces the current one on the page.
  - Files: See [popup.html](popup.html) and [popup.js](popup.js) for selection flow; mascot assets live in `characters/` and `icons/`.

- **Milestone 4 — Open the Freighter connect page:**
  - Steps: Open [config.html](config.html). Use the button to open the hosted connection page.
  - Expected result: The Freighter connection page opens in a new tab.
  - Files: See [config.html](config.html) and [config.js](config.js).

- **Milestone 5 — Connect Freighter:**
  - Steps: Open the Collection page on the web app and click connect. Follow prompts in the wallet.
  - Expected result: Your public key appears, and the extension receives the connection message.
  - Files: Message bridge lives in [dapp_content_script.js](dapp_content_script.js).

## Architecture Note: Externally Hosted Pages

**Important:** The wallet connection pages are hosted on Vercel (not served from the extension).

### Hosted on Vercel:
- Collection page in the web app

### Why external hosting?
- Freighter only injects into http/https pages, NOT chrome-extension:// pages
- External pages do NOT have access to Chrome extension APIs (`chrome.runtime`, etc.)
- Communication happens via `window.postMessage` through the content script bridge

### Message Flow:
```
Collection (web) <-> dapp_content_script.js (injected) <-> background.js (extension)
```

### When updating:
1. Deploy updated files to Vercel
2. Reload the extension in `chrome://extensions` to update content scripts and background.js

## Developer notes

- **Background script:** [background.js](background.js) — handles extension-wide events and wallet connection state.
- **Content injection & behavior:** [content.js](content.js) (mascot rendering) and [dapp_content_script.js](dapp_content_script.js) (message bridge for Vercel-hosted page).
- **Popup UI:** [popup.html](popup.html) + [popup.js](popup.js) + [popup.css](popup.css).
- **Config / test UI:** [config.html](config.html) + [config.js](config.js) (opens https://chrome-extension-stellar-shimeji-fa.vercel.app/).
- **Manifest:** [manifest.json](manifest.json) — permissions and content script definitions.

## Testing tips

- Freighter only injects on secure contexts. If the connection page is hosted locally, use a simple HTTPS dev server or a tunnel.

## Next steps / enhancements

- Add more mascots and animations in `characters/`.
- Add an egg unlock flow once egg purchases go live.
- Add settings for mascot size, z-index, and persistence across tabs.

If you'd like, I can also run a quick check of the extension files or add a short demo script to toggle unlocks automatically.
