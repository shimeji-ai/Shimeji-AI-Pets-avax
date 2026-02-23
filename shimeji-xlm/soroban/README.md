# Shimeji XLM Soroban 🐱🐰

Smart contracts and deployment scripts for the Stellar version of Shimeji.

## Related Documentation

- Frontend integration and Vercel setup: [../nextjs/README.md](../nextjs/README.md)
- Contract-level behavior and metadata format: [./contracts/README.md](./contracts/README.md)
- Metadata template: [./metadata/example.json](./metadata/example.json)
- Prereq installer script: [./scripts/install_prereqs.sh](./scripts/install_prereqs.sh)

## Quick Commands From `shimeji-xlm/`

Run once first:

```bash
cd shimeji-xlm
pnpm install
```

Then:

```bash
pnpm chain            # local blockchain
pnpm run deploy:local  # local deploy (+ local frontend env sync)
pnpm run deploy:testnet
pnpm run deploy:mainnet
pnpm run test:networks # local + testnet checks (mainnet prepared but skipped)
```

## Quick Setup (Recommended)

Run the prereq installer from this folder:

```bash
./scripts/install_prereqs.sh
```

This script ensures:

- `stellar` CLI is installed and available in `PATH`
- Rust toolchain is installed (if missing)
- Rust target `wasm32v1-none` is installed (plus legacy target)

## Manual Prerequisites (if you prefer)

1. Install Stellar CLI:

```bash
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
hash -r
stellar --version
```

2. Install Rust target for Soroban contracts:

```bash
rustup target add wasm32v1-none
```

## Deploy To Testnet

From this folder (`shimeji-xlm/soroban`), you can deploy with either mnemonic words or a Stellar secret seed.

### Guided mode (no variables needed)

```bash
./scripts/deploy.sh
```

What this does:

- Lets you pick `local`, `testnet` or `mainnet`.
- Lets you create a new wallet or use an existing wallet alias.
- For existing wallets, asks credential source first:
  - load from `shimeji-xlm/.env` (waits and re-checks until values exist)
  - type secret key masked with `*`
  - type seed phrase masked with `*`
- On `local`, funds the account using local friendbot (requires local chain running).
- On `testnet`, auto-funds the deployer account.
- On `mainnet`, shows the address plus QR (if `qrencode` is installed), then waits for funding.
- On first successful identity setup, writes `../secret.txt` (`shimeji-xlm/secret.txt`) with secret key + seed phrase (`chmod 600`).
- Auto-updates `nextjs/.env.local` only when deploying to `local`.
- Embeds source metadata into contract WASM (when configured) so explorers can show code links.
- Runs post-deploy on-chain verification automatically (fetch/hash + build info query).
- If RPC rejects verification requests, can prompt for API key header and save it to `shimeji-xlm/.env`.
- If Trustless escrow addresses are missing on testnet, auto-deploys a fallback escrow vault and wires it automatically.
- Auto-creates the first auction by default right after deploy (minimum configurable in USDC or XLM).
- Prints Vercel env values for all networks.

Security note:

- `secret.txt` is ignored by git via `shimeji-xlm/.gitignore`.
- You can disable this auto-backup file with `DISABLE_SECRET_BACKUP=1`.

Recommended flow:

```bash
./scripts/install_prereqs.sh
```

1. Deploy using 12/24 words:

```bash
STELLAR_MNEMONIC="word1 word2 ... word12" NETWORK=testnet ./scripts/deploy.sh
```

Alternative env var name:

```bash
STELLAR_SEED_PHRASE="word1 word2 ... word12" NETWORK=testnet ./scripts/deploy.sh
```

2. Deploy using a secret seed (`S...`):

```bash
STELLAR_SECRET_SEED="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" NETWORK=testnet ./scripts/deploy.sh
```

Alternative env var names:

```bash
STELLAR_SECRET_KEY="S..." NETWORK=testnet ./scripts/deploy.sh
STELLAR_SEED="S..." NETWORK=testnet ./scripts/deploy.sh
```

3. Reuse existing imported identity (no env vars needed after first successful import):

```bash
NETWORK=testnet ./scripts/deploy.sh
```

Important shell UX note:

- Keep env assignment and command in one line, or use `export` first.
- This works:

```bash
export STELLAR_MNEMONIC="word1 word2 ... word12"
export FORCE_IDENTITY_REIMPORT=1
NETWORK=testnet ./scripts/deploy.sh
```

If you need to replace the stored alias with a different mnemonic/secret:

```bash
FORCE_IDENTITY_REIMPORT=1 STELLAR_MNEMONIC="word1 ... word12" NETWORK=testnet ./scripts/deploy.sh
```

Notes about UX:

- Stellar CLI may print a prompt line (`Type a secret key or 12/24 word seed phrase:`) even when value is piped automatically from env vars.
- In that case, it is not asking you again; the script is already feeding the value.
- A warning about 12-word entropy can appear; deployment still works, but 24-word phrases are safer.

The script prints:

- `NFT Contract`
- `Auction Contract`
- `XLM SAC`
- `USDC SAC`
- Explorer links (contract + admin account)
- Frontend env vars for Vercel (and local env auto-sync status for `local`)
- Contract verification results (automatic) plus manual re-run commands
- A generated env file at `shimeji-xlm/.deploy-env/<network>.env` for Vercel CLI sync

After `testnet` or `mainnet` deploy, you can sync to Vercel from `shimeji-xlm/`:

```bash
pnpm run vercel:env:testnet -- production
# or
pnpm run vercel:env:mainnet -- production
```

Testnet USDC issuer is already configured in the deploy script as:

`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

Optional `.env` keys for source publication + verification (`shimeji-xlm/.env`):

```bash
ENABLE_ONCHAIN_SOURCE_VERIFICATION=1
REQUIRE_ONCHAIN_SOURCE_VERIFICATION=0
CONTRACT_SOURCE_REPO=github:luloxi/Shimeji-AI-Pets
CONTRACT_SOURCE_COMMIT=
CONTRACT_SOURCE_SUBPATH=shimeji-xlm/soroban
AUTO_CREATE_INITIAL_AUCTION=1
INITIAL_AUCTION_MIN_CURRENCY=usdc
INITIAL_AUCTION_MIN_AMOUNT=50
INITIAL_AUCTION_XLM_USDC_RATE=1000000
INITIAL_AUCTION_TOKEN_URI=ipfs://shimeji/default-auction.json
# only if your RPC provider needs auth:
# STELLAR_RPC_HEADERS="X-API-Key: <your_key>"
```

## Deploy To Mainnet

Use the same commands, but set `NETWORK=mainnet`:

```bash
STELLAR_MNEMONIC="word1 word2 ... word12" NETWORK=mainnet ./scripts/deploy.sh
```

or:

```bash
STELLAR_SECRET_SEED="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" NETWORK=mainnet ./scripts/deploy.sh
```

Mainnet uses:

- RPC: `https://mainnet.sorobanrpc.com`
- Network passphrase: `Public Global Stellar Network ; September 2015`
- The passphrase is fixed by Stellar network design (it is not changed per year).

## Create The First Auction (Manual Override)

By default, deploy now auto-creates the first item auction (using a minted NFT).
Use these commands only if you disable auto-creation or want additional item auctions.

### Testnet

```bash
stellar contract invoke \
  --id "<AUCTION_CONTRACT_ID>" \
  --source "shimeji-deployer" \
  --rpc-url "https://soroban-testnet.stellar.org" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- create_item_auction \
  --seller "<SELLER_WALLET>" \
  --token_id <TOKEN_ID_OWNED_BY_SELLER> \
  --starting_price_xlm 5000000000 \
  --starting_price_usdc 500000000 \
  --xlm_usdc_rate 1200000 \
  --duration_seconds 86400
```

### Mainnet

```bash
stellar contract invoke \
  --id "<AUCTION_CONTRACT_ID>" \
  --source "shimeji-deployer" \
  --rpc-url "https://mainnet.sorobanrpc.com" \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- create_item_auction \
  --seller "<SELLER_WALLET>" \
  --token_id <TOKEN_ID_OWNED_BY_SELLER> \
  --starting_price_xlm 5000000000 \
  --starting_price_usdc 500000000 \
  --xlm_usdc_rate 1200000 \
  --duration_seconds 86400
```

Notes:

- Amounts use 7 decimals (for example `5000000000` = `500 XLM`).
- The seller must own the `token_id` before creating the item auction.

## Update NFT Metadata Later

`update_token_uri` is admin-only on the NFT contract.

Example (testnet):

```bash
stellar contract invoke \
  --id "<NFT_CONTRACT_ID>" \
  --source "shimeji-deployer" \
  --rpc-url "https://soroban-testnet.stellar.org" \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- update_token_uri \
  --token_id 0 \
  --new_uri "ipfs://<metadata-cid>/metadata.json"
```

## Vercel Variables (Production)

Set these in the Vercel project for `shimeji-xlm/nextjs`:

- `NEXT_PUBLIC_AUCTION_CONTRACT_ID=<AUCTION_CONTRACT_ID>`
- `NEXT_PUBLIC_NFT_CONTRACT_ID=<NFT_CONTRACT_ID>`
- `NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org` (or mainnet RPC)
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015` (or mainnet passphrase)
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet` (or `mainnet`)
- `NEXT_PUBLIC_BASE_URL=https://your-domain.com`

Optional, if the site features are enabled:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `FEEDBACK_TO_EMAIL`
- `EGG_REQUEST_TO_EMAIL`
- `RESEND_AUDIENCE_UPDATES`
- `RESEND_AUDIENCE_SHIMEJI`
- `RESEND_AUDIENCE_COLLECTION`
- `SUBSCRIBE_SIGNING_SECRET`
- `PINATA_JWT`
- `OPENROUTER_API_KEY`

Important:

- Do not store deployer mnemonic or `S...` secret in Vercel.
- Stellar passphrases are fixed network identifiers; they are not user-defined.
