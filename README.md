# Shimeji AI Pets 🐱🐰

Animated desktop pets with AI chat and NFT auctions on Stellar.

## Structure

| Directory | Description |
|---|---|
| [shimeji-xlm](./shimeji-xlm/README.md) | Stellar/Soroban auction + NFT stack |
| [shimeji-eth](./shimeji-eth/README.md) | EVM/Scaffold-ETH stack |
| [chrome-extension](./chrome-extension/) | Browser runtime and chat UI |
| [desktop](./desktop/) | Electron desktop app |
| [animation-reference](./animation-reference/README.md) | Sprite standards for extension/desktop |

## Quick Start (Stellar)

```bash
./shimeji-xlm/launch.sh
```

Unified launcher for local, testnet, and mainnet deployment.

## Quick Start (Runtimes)

### Chrome extension

1. Open `chrome://extensions`, enable Developer mode.
2. Load unpacked `chrome-extension/`.

### Desktop app

```bash
cd desktop && npm install && npm start
```

## Build & packaging

1. Sync the Markdown personalities before bundling any runtime: `npm run sync-personalities` (or just run `./build.sh …`, it syncs internally).
2. From the repo root you can now call `./build.sh chrome`, `./build.sh firefox`, `./build.sh windows`, `./build.sh macos`, `./build.sh linux`, or `./build.sh all` to build Chrome/Firefox packages and the desktop builds. `build.sh` copies the generated zips into `shimeji-eth/packages/nextjs/public` so release scripts find them.
3. When publishing release assets, run `./scripts/publish_release_assets.sh` (it also calls `npm run sync-personalities` before zipping). After building locally you can re-use the same release script to upload the generated zips and desktop builds so the published assets match what `build.sh` produced.
