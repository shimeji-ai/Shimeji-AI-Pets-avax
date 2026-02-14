# shimeji-xlm

Stellar/Soroban auction system for handcrafted Shimeji desktop companions. Users bid in XLM or USDC to win custom shimejis minted as NFTs.

## Structure

- `nextjs/` — Web frontend (auction UI, Freighter wallet connect)
- `soroban/` — Soroban smart contracts (NFT + Auction) and deploy scripts

## Contracts

| Contract | Description |
|---|---|
| **shimeji-nft** | Owner-controlled NFT with updatable metadata and admin/minter roles |
| **shimeji-auction** | Week-long auctions with dual-currency XLM/USDC bidding, automatic refunds, and NFT minting on finalization |

## Prerequisites

- [Rust](https://rustup.rs/) with the WASM target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/install-cli):
  ```bash
  cargo install stellar-cli --locked
  ```
- Node.js 18+ and [pnpm](https://pnpm.io/)

## Build and test contracts

```bash
cd soroban
stellar contract build
cargo test
```

## Deploy to testnet

1. Generate a new keypair or use an existing secret key (`S...`):

   ```bash
   stellar keys generate my-wallet --network testnet
   stellar keys show my-wallet  # shows the secret key
   ```

   Or fund an existing account via [friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY) (the script does this automatically).

2. Run the deploy script:

   ```bash
   cd soroban
   STELLAR_SECRET_KEY="S..." ./scripts/deploy.sh
   ```

   The script will:
   - Build both WASM contracts
   - Fund the account via friendbot
   - Derive XLM and USDC SAC token addresses for testnet
   - Deploy and initialize ShimejiNFT
   - Deploy and initialize ShimejiAuction (with SAC token addresses)
   - Set the auction contract as authorized minter on the NFT contract
   - Print the contract IDs to copy into `.env.local`

3. Copy the output into `nextjs/.env.local`:

   ```env
   NEXT_PUBLIC_NFT_CONTRACT_ID=C...
   NEXT_PUBLIC_AUCTION_CONTRACT_ID=C...
   ```

## Deploy to mainnet

Same steps, but set `NETWORK=mainnet`. The account must be funded with real XLM.

```bash
cd soroban
STELLAR_SECRET_KEY="S..." NETWORK=mainnet ./scripts/deploy.sh
```

Differences from testnet:
- RPC defaults to `https://mainnet.sorobanrpc.com` (override with `STELLAR_RPC_URL`)
- Uses the mainnet USDC issuer (`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` — [Circle USDC on Stellar](https://www.circle.com/multi-chain-usdc/stellar))
- No friendbot — your account needs XLM for gas
- The script prints two extra env vars for the frontend:

  ```env
  NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
  ```

## Frontend

```bash
cd nextjs
pnpm install
pnpm dev       # development
pnpm build     # production build
```

### Environment variables (`nextjs/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_AUCTION_CONTRACT_ID` | — | Auction contract address (from deploy) |
| `NEXT_PUBLIC_NFT_CONTRACT_ID` | — | NFT contract address (from deploy) |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Network passphrase |
