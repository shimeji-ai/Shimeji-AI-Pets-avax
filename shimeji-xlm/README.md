# shimeji-xlm 🐱🐰

Stellar/Soroban version of Shimeji auctions + NFT minting.

## Start Here (Simple Flow)

Run from `shimeji-xlm/`:

```bash
pnpm install
```

Then use these commands:

1. Start chain assistant (local chain + help menu):

```bash
pnpm chain
```

2. Deploy contracts (interactive selector: local/testnet/mainnet):

```bash
pnpm deploy
```

3. Start frontend:

```bash
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
- Prints deploy command suggestions: `pnpm deploy -- local`, `pnpm deploy -- testnet`, `pnpm deploy -- mainnet`.

If chain is already running, it offers a menu to view logs, stop chain, or exit without changes.

## Deploy Modes

### Local

```bash
pnpm chain
pnpm deploy -- local
pnpm start
```

`pnpm deploy -- local` updates `nextjs/.env.local` automatically.

### Testnet

```bash
pnpm deploy -- testnet
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
pnpm deploy -- mainnet
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
