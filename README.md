# Shimeji AI Pets Monorepo

This repository contains multiple Shimeji products:

- `chrome-extension/`: browser Shimeji runtime and chat UI.
- `desktop/`: Electron desktop app.
- `shimeji-eth/`: EVM version (Scaffold-ETH based, multi-chain EVM ready).
- `shimeji-xlm/`: Stellar blockchain version (Soroban + Next.js).
- `animation-reference/`: current sprite guidance (simple walk + full runtime set used by extension/desktop).
- `scripts/`: release and maintenance scripts.

Shimeji can be used in both ecosystems:

- EVM chains via `shimeji-eth/`
- Stellar blockchain via `shimeji-xlm/`

## Quick Start

### Chrome extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked `chrome-extension/`.

### Desktop app

```bash
cd desktop
npm install
npm start
```

## Blockchain Versions

- EVM version instructions: `shimeji-eth/README.md`
- Stellar version instructions: `shimeji-xlm/README.md`

This root README stays intentionally brief to avoid mixing EVM and Stellar runbooks in one place.
