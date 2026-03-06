# Shimeji AI Pets 🐱🐰

Animated desktop pets with AI chat plus an Avalanche marketplace stack.

## Integrations

The Avalanche marketplace stack integrates with:

- **[Chainlink](https://chain.link/)** — AVAX/USD price feed support for cross-currency marketplace and auction flows.
- **[Trustless Work](https://www.trustlesswork.com)** — Escrow-as-a-service protocol used by auction and marketplace commission flows.

## Structure

| Directory | Description |
|---|---|
| [shimeji-avax](./shimeji-avax/README.md) | Next.js marketplace dapp + Foundry smart contracts |
| [chrome-extension](./chrome-extension/) | Browser runtime and chat UI |
| [firefox-extension](./firefox-extension/) | Firefox browser runtime and chat UI |
| [desktop](./desktop/) | Electron desktop app |
| [runtime-core](./runtime-core/) | Canonical shared runtime content (characters, personalities, shared assets) |
| [animation-reference](./animation-reference/README.md) | Sprite standards for extension/desktop |

## Quick Start (Avalanche)

```bash
./shimeji-avax/launch.sh
```

Unified launcher for local, Fuji, and mainnet deployment.

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
