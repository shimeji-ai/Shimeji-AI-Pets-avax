# Shimeji AI Pets

Animated shimejis that live in your browser. Add one (or a few) to any site, click to chat, and choose your AI backend: local (Ollama), hosted (OpenRouter), or tool-using agent mode (OpenClaw).

This repo is primarily a **Chrome extension**. The other folders are supporting apps, references, and experiments.

## Install The Chrome Extension (Dev Mode)

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repo's `chrome-extension/` folder.
5. Pin the extension so the toolbar icon is easy to reach.

## Turn It On For The Sites You Want

By default, the extension is allowed on `shimeji.dev`. To enable it elsewhere:

1. Open the extension popup (toolbar icon).
2. Use **Enabled on this site** to enable the current site.
3. Or use **Enabled on all sites** if you want shimejis everywhere (Chrome will ask for permission).

If you don't see a shimeji after enabling: reload the page once.

## Configure Your AI Brain (OpenRouter / Ollama / OpenClaw)

In the extension popup:

1. Click `+` to add a shimeji (or select an existing one).
2. Set **AI Brain**:
   - `Standard (API key only)` for OpenRouter or Ollama chat.
   - `AI Agent` for OpenClaw gateway mode.

### OpenRouter (Hosted Models)

Best for getting started quickly.

1. Set **AI Brain** to `Standard (API key only)`.
2. Set **Provider** to `OpenRouter`.
3. Create an API key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)
4. Paste your **OpenRouter API Key**.
5. Choose a **Model** (or keep the default).

### Ollama (Local Models)

Best for local/offline and keeping prompts on your machine.

1. Install Ollama and pull a model, for example:
   ```bash
   ollama pull llama3.1
   ```
2. Set **AI Brain** to `Standard (API key only)`.
3. Set **Provider** to `Ollama`.
4. Set **Ollama URL** (default `http://127.0.0.1:11434`).
5. Set **Ollama Model** (must match the model name you pulled).

### OpenClaw (Tool-Using Agent Mode)

Best when you want your shimeji to run as an agent behind an OpenClaw gateway.

1. Run an OpenClaw gateway (local or remote).
2. Set **AI Brain** to `AI Agent`.
3. Set **Gateway URL** (default `ws://127.0.0.1:18789`).
4. Paste the **Gateway Auth Token**.

Tip: If you're storing API keys/tokens, consider enabling **Protect keys with master key** in the popup.

## Repository Folders

- `chrome-extension/`: The browser extension (popup UI, content script, background worker, characters).
- `web-stellar/`: Next.js site with Stellar Freighter wallet compatibility.
- `shimeji-eth/`: Scaffold-ETH installation (Ethereum dev scaffold).
- `animation-reference/`: Reference docs for animating shimejis (sprite sheets and timings).
- `desktop-mvp/`: Future home of the Windows desktop MVP.
- `generate_sprites.py`: Helper script for generating sprite sheets.
