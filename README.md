# Shimeji AI Pets 🐱🐰

Animated desktop pets with AI chat and NFT marketplace on Stellar.

## Integrations

The Stellar marketplace stack integrates with two external protocols:

- **[Reflector Network](https://reflector.network)** — Decentralized price oracle for the Stellar network. Used in the marketplace contract to accept both XLM and USDC as payment for any listing, converting prices on-chain at the current market rate so sellers only need to set one price.

- **[Trustless Work](https://www.trustlesswork.com)** — Escrow-as-a-service protocol. Used in the auction and marketplace contracts to hold buyer funds in a trustless escrow during commission orders and NFT auctions, releasing to the seller only on delivery confirmation.

## Structure

| Directory | Description |
|---|---|
| [shimeji-xlm](./shimeji-xlm/README.md) | Stellar/Soroban auction + NFT stack |
| [chrome-extension](./chrome-extension/) | Browser runtime and chat UI |
| [firefox-extension](./firefox-extension/) | Firefox browser runtime and chat UI |
| [desktop](./desktop/) | Electron desktop app |
| [runtime-core](./runtime-core/) | Canonical shared runtime content (characters, personalities, shared assets) |
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

1. Sync shared runtime core before bundling any runtime: `npm run sync-runtime-core` (legacy alias: `npm run sync-personalities`). `./build.sh …` also runs this internally.
2. From the repo root you can now call `./build.sh chrome`, `./build.sh firefox`, `./build.sh windows`, `./build.sh macos`, `./build.sh linux`, or `./build.sh all` to build Chrome/Firefox packages and the desktop builds.
3. When publishing release assets, run `./scripts/publish_release_assets.sh` (it also syncs runtime-core before zipping). After building locally you can re-use the same release script to upload the generated zips and desktop builds so the published assets match what `build.sh` produced.
