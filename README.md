# Shimeji AI Pets Monorepo 🐱🐰

This monorepo contains the Shimeji runtimes and both blockchain stacks.

## Start Here

- [shimeji-xlm](./shimeji-xlm/README.md): Stellar/Soroban auction + NFT stack.
- [shimeji-eth](./shimeji-eth/README.md): EVM/Scaffold-ETH stack.
- [animation-reference](./animation-reference/README.md): sprite standards used by extension/desktop.

## Runtime Apps

- `chrome-extension/`: browser runtime and chat UI.
- `desktop/`: Electron desktop app.

## Quick Start (Runtime)

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

## Why The Docs Are Split

- Root README stays short on purpose.
- Chain-specific runbooks live in:
  - [shimeji-xlm/README.md](./shimeji-xlm/README.md)
  - [shimeji-eth/README.md](./shimeji-eth/README.md)
