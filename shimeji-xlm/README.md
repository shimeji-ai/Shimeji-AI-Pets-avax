# shimeji-xlm 🐱🐰

Stellar/Soroban auctions + NFT minting. Escrow via Trustless Work.

Supports any Stellar-compatible wallet (Freighter, Lobstr, etc.).

## Quick Start

From repo root:

```bash
./shimeji-xlm/launch.sh
```

The launcher handles chain + frontend + deploy for local, testnet, or mainnet. It also runs on-chain verification and auto-creates the first auction so the homepage auction section goes live immediately.

## Deploy to Vercel

1. Run `./shimeji-xlm/launch.sh`, choose `testnet` or `mainnet`.
2. Sync env vars:

```bash
cd shimeji-xlm
pnpm run vercel:env:testnet -- production   # or mainnet
```

3. Redeploy on Vercel.

## Manual Mode

```bash
cd shimeji-xlm
pnpm chain
pnpm run deploy
pnpm start
```

## More Docs

- [nextjs/README.md](./nextjs/README.md) — Web app
- [soroban/README.md](./soroban/README.md) — Deploy + tooling
- [soroban/contracts/README.md](./soroban/contracts/README.md) — Contracts + metadata format
