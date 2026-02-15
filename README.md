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
