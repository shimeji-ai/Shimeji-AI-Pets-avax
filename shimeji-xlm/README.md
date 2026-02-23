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

Recommended (integrated):

1. Run `./shimeji-xlm/launch.sh` (or `cd shimeji-xlm && pnpm run deploy`), choose `testnet` or `mainnet`.
2. After contract deploy completes, use the built-in prompt to:
   - sync Vercel env vars (`production` or `preview`)
   - optionally trigger a Vercel deploy immediately from the CLI

Manual commands (from `shimeji-xlm/`):

```bash
pnpm run vercel:env              # asks testnet/mainnet, then asks whether to deploy
pnpm run vercel:env:deploy       # asks testnet/mainnet, syncs envs, then deploys
pnpm run vercel:env:testnet      # explicit network
pnpm run vercel:env:testnet:deploy
pnpm run vercel:env:mainnet
pnpm run vercel:env:mainnet:deploy
```

If you choose sync-only, the script will prompt to deploy right after env sync. Production env changes only take effect on a new deployment.

## Manual Mode (3 terminals)

```bash
# Terminal 1 — local chain
cd shimeji-xlm && pnpm chain

# Terminal 2 — deploy contracts
cd shimeji-xlm && pnpm run deploy

# Terminal 3 — frontend dev server
cd shimeji-xlm && pnpm start
```

## More Docs

- [nextjs/README.md](./nextjs/README.md) — Web app
- [soroban/README.md](./soroban/README.md) — Deploy + tooling
- [soroban/contracts/README.md](./soroban/contracts/README.md) — Contracts + metadata format
