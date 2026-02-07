# Shimeji Factory

Animated AI companions that live in your browser. Chat from any tab, get gentle nudges, or connect an agent with online and onchain tools.

Shimeji Factory is an open-source project with two parts: a **Next.js web app** for the landing page and factory UI, and a **Chrome extension** that renders animated shimejis on every webpage you visit.

## Features

- Animated sprite companions that wander around your browser tabs
- AI chat powered by OpenRouter, Ollama (local), or OpenClaw (agent mode)
- Multiple characters and personalities to choose from
- Stellar wallet (Freighter) integration for custom shimeji commissions
- Voice input support
- Sound effects and idle/walk/drag animations
- Works on any website

## Project Structure

```
stellar-shimeji-factory/
├── web/                   # Next.js web app (landing page + factory)
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   └── public/            # Static assets
├── chrome-extension/      # Chrome extension
│   ├── characters/        # Sprite sheets per character
│   ├── popup.html         # Extension popup UI
│   ├── content.js         # Injects shimeji into pages
│   ├── background.js      # Service worker
│   └── manifest.json      # Extension manifest (MV3)
├── animation-reference/   # Sprite animation reference files
└── generate_sprites.py    # Sprite sheet generation script
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (the web app uses pnpm as its package manager)
- A Chromium-based browser (Chrome, Brave, Edge, etc.)

### Web App

```bash
cd web
pnpm install
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Chrome Extension

1. Open your browser and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this repo
5. The shimeji icon will appear in your browser toolbar

### Connecting an AI Provider

Once the extension is loaded, click the shimeji icon in the toolbar to open the popup. You have three options:

**OpenRouter (recommended)**
1. Create an account at [openrouter.ai](https://openrouter.ai/) and generate an API key
2. In the extension popup, go to **Standard > OpenRouter** and paste your key
3. Pick a model or keep the default

**Ollama (local, offline)**
1. Install [Ollama](https://ollama.com/) and pull a model:
   ```bash
   ollama pull llama3.1
   ```
2. In the extension popup, go to **Standard > Provider: Ollama**
3. Set the Ollama URL (default `http://localhost:11434`) and your model name

**OpenClaw (agent mode)**
1. Run [OpenClaw](https://github.com/OpenAgentsInc/openclaw) locally or on your server
2. Copy the WebSocket URL and gateway token
3. In the extension popup, go to **AI Agent** and paste the Gateway URL + Token

## Development

### Web App Commands

```bash
cd web
pnpm dev       # Start dev server
pnpm build     # Production build
pnpm lint      # Run ESLint
pnpm start     # Start production server
```

### Tech Stack

- **Web App:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Radix UI
- **Chrome Extension:** Vanilla JS, Chrome Extension Manifest V3
- **Wallet:** Stellar / Freighter API
- **Email:** Resend

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is open source. See the repository for license details.
