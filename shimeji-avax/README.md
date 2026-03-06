# shimeji-avax 🐱🐰

Avalanche NFT marketplace, auctions, swaps, and commissions for Shimeji.

## Quick Start

From repo root:

```bash
cp shimeji-avax/foundry/.env.example shimeji-avax/foundry/.env
cp shimeji-avax/nextjs/.env.example shimeji-avax/nextjs/.env.local
./shimeji-avax/launch.sh
```

## Local Flow

```bash
cd shimeji-avax && pnpm chain
cd shimeji-avax && pnpm run deploy:local
cd shimeji-avax && pnpm start
```

`pnpm start` prefers port `3000`; if it is busy, it picks the next free port and records it in `.deploy-env/frontend.env`.

## Networks

- `local`: `anvil` + local deploy + mock USDC
- `fuji`: Avalanche Fuji C-Chain deploy script
- `mainnet`: Avalanche C-Chain deploy script

## Workspace

- `foundry/` contains the Solidity project: `foundry.toml`, `src/`, `script/`, `test/`, `lib/`, and its own `.env`
- `nextjs/` contains the wagmi, viem, and RainbowKit frontend plus its own `.env.example`
- `scripts/` contains chain, deploy, start, network checks, and Vercel env sync
- `.deploy-env/` stores generated frontend env files after each deploy

## Useful Commands

```bash
cd shimeji-avax && pnpm chain
cd shimeji-avax && pnpm run deploy
cd shimeji-avax && pnpm run deploy:testnet
cd shimeji-avax && pnpm run deploy:mainnet
cd shimeji-avax && pnpm run test:contracts
cd shimeji-avax && pnpm start
```
