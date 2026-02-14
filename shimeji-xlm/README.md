# Shimeji XLM

Stellar-based auction system for handcrafted Shimeji desktop companions. Users bid in XLM or USDC to win custom shimejis minted as NFTs on Soroban.

## Directory Structure

```
shimeji-xlm/
  nextjs/       # Next.js web app (auction UI, wallet connect)
  soroban/      # Soroban smart contracts (NFT + Auction)
```

## Soroban Contracts

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)

### Setup

```bash
cd soroban
rustup target add wasm32-unknown-unknown
```

### Build

```bash
cd soroban
stellar contract build
```

### Test

```bash
cd soroban
cargo test
```

### Deploy to Testnet

```bash
export STELLAR_SECRET_KEY="S..."
cd soroban
./scripts/deploy.sh
```

The script deploys both contracts, initializes them, and sets the auction contract as the NFT minter. It prints the contract IDs to add to your `.env.local`.

### Contracts

- **shimeji-nft** — Owner-controlled NFT with updatable metadata. Supports admin and minter roles.
- **shimeji-auction** — Week-long auctions with dual-currency bidding (XLM + USDC). Fixed exchange rate per auction. Mints NFT to winner on finalization.

## Frontend (Next.js)

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
cd nextjs
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Environment Variables

Create `nextjs/.env.local`:

```env
NEXT_PUBLIC_AUCTION_CONTRACT_ID=C...
NEXT_PUBLIC_NFT_CONTRACT_ID=C...
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```
