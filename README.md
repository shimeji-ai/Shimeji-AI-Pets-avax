# Shimeji AI Pets Monorepo

This repository contains multiple Shimeji products:

- `chrome-extension/`: browser Shimeji runtime and chat UI.
- `desktop/`: Electron desktop app.
- `shimeji-eth/`: Ethereum stack (Scaffold-ETH based).
- `shimeji-xlm/`: Stellar/Soroban stack.
- `animation-reference/`: current sprite guidance (simple walk + full runtime set used by extension/desktop).
- `scripts/`: release and maintenance scripts.

## Legacy Workspace (Local Only)

`legacy/` is an ignored local workspace used for archived/reference material.
It currently contains:

- `legacy/shimeji-ee/`
- `legacy/marketing/`
- `legacy/generate_sprites.py`
- previous root markdown docs

This folder is intentionally git-ignored.

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

```bash
cd shimeji-eth
yarn install
yarn chain
yarn deploy
yarn start
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
