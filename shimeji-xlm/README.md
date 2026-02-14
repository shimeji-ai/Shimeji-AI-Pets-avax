# shimeji-xlm 🐱🐰

Stellar/Soroban version of Shimeji auctions + NFT minting.

## Start Here (Simple Flow)

Run from `shimeji-xlm/`:

```bash
pnpm install
```

Create optional deploy credentials:

```bash
cp .env.example .env
```

Supported credential vars in `shimeji-xlm/.env`:
- `STELLAR_MNEMONIC`
- `STELLAR_SECRET_SEED` (or `STELLAR_SECRET_KEY`)
- `STELLAR_IDENTITY_ALIAS`

Then run the single launcher command:

```bash
pnpm run launch
```

`pnpm run launch` opens a command-center menu (arrow keys + Enter) and can run:

- frontend (`pnpm start`)
- chain assistant (`pnpm chain`)
- deploy (`pnpm run deploy:*`)
- full experience in separate tabs (frontend + chain + deploy)

The deploy flow prints the "First auction quickstart" commands at the end.

## Separate Commands (Still Available)

If you prefer manual tabs/terminals, these commands continue to work:

```bash
pnpm chain
pnpm run deploy
pnpm start
```

Open `http://localhost:3000/auction`.

## What `pnpm chain` Guides You Through

`pnpm chain` now acts as a chain assistant:

- Prepares prerequisites (Stellar CLI, Rust target).
- Helps you resolve Docker automatically when missing.
- Shows `pnpm chain --logs` to view blocks/logs.
- Shows `pnpm chain --status` to check status.
- Shows `pnpm chain --off` to stop chain.
- Prints deploy command suggestions: `pnpm run deploy:local`, `pnpm run deploy:testnet`, `pnpm run deploy:mainnet`.

If chain is already running, it offers a menu to view logs, stop chain, or exit without changes.

## Deploy Modes

### Local

```bash
pnpm chain
pnpm run deploy:local
pnpm start
```

`pnpm run deploy:local` updates `nextjs/.env.local` automatically.

### Testnet

```bash
pnpm run deploy:testnet
pnpm start
```

Use deploy output values in `nextjs/.env.local`:

- `NEXT_PUBLIC_NFT_CONTRACT_ID`
- `NEXT_PUBLIC_AUCTION_CONTRACT_ID`
- `NEXT_PUBLIC_STELLAR_RPC_URL`
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

### Mainnet + Vercel

1. Deploy contracts:

```bash
pnpm run deploy:mainnet
```

2. In Vercel, set **Root Directory** to `shimeji-xlm/nextjs`.
3. Add env vars from deploy output:

```env
NEXT_PUBLIC_NFT_CONTRACT_ID=...
NEXT_PUBLIC_AUCTION_CONTRACT_ID=...
NEXT_PUBLIC_STELLAR_RPC_URL=...
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=...
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```
4. Redeploy and verify `/auction`.

## Docs

- Web app: [nextjs/README.md](./nextjs/README.md)
- Soroban deploy + tooling: [soroban/README.md](./soroban/README.md)
- Contracts + metadata format: [soroban/contracts/README.md](./soroban/contracts/README.md)
- Metadata example JSON: [soroban/metadata/example.json](./soroban/metadata/example.json)
