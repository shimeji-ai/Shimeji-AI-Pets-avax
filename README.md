# Shimeji AI Pets Monorepo

This repository contains multiple Shimeji products:

- `chrome-extension/`: browser Shimeji runtime and chat UI.
- `desktop/`: Electron desktop app.
- `shimeji-eth/`: Ethereum stack (Scaffold-ETH based).
- `shimeji-xlm/`: Stellar/Soroban stack.
- `animation-reference/`: current sprite guidance (simple walk + full runtime set used by extension/desktop).
- `scripts/`: release and maintenance scripts.

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

### Ethereum app (`shimeji-eth`)

Use 3 separate terminals:

Terminal 1 (frontend app):

```bash
cd shimeji-eth
yarn install
yarn start
```

Terminal 2 (local blockchain for development):

```bash
cd shimeji-eth
yarn chain
```

Terminal 3 (deploy contracts):

```bash
cd shimeji-eth
yarn deploy
```

### Stellar app (`shimeji-xlm`)

Frontend:

```bash
cd shimeji-xlm/nextjs
pnpm install
pnpm dev
```

Contracts:

```bash
cd shimeji-xlm/soroban
stellar contract build
cargo test
```

## Releases

Desktop and extension distributables are published through GitHub Releases.
Use `./scripts/publish_release_assets.sh` before pushing source changes that affect distributed binaries/zips.
