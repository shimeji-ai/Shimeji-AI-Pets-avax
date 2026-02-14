# shimeji-xlm

Stellar/Soroban implementation for Shimeji products.

## Structure

- `nextjs/`: web frontend.
- `soroban/`: smart contracts and deployment scripts.

## Frontend (`nextjs`)

```bash
cd shimeji-xlm/nextjs
pnpm install
pnpm dev
```

Build:

```bash
pnpm build
pnpm start
```

## Contracts (`soroban`)

Prerequisites:

- Rust + `wasm32-unknown-unknown`
- Stellar CLI

Build and test:

```bash
cd shimeji-xlm/soroban
stellar contract build
cargo test
```

Deploy (example):

```bash
./scripts/deploy.sh
```

## Environment

Typical frontend env values live in `shimeji-xlm/nextjs/.env.local`:

- `NEXT_PUBLIC_AUCTION_CONTRACT_ID`
- `NEXT_PUBLIC_NFT_CONTRACT_ID`
- `NEXT_PUBLIC_STELLAR_RPC_URL`
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`
