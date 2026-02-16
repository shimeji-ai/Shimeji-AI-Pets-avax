# shimeji-xlm/nextjs 🐱🐰

Frontend for the Stellar auction experience.

## What This App Includes

- Landing page + giveaway CTA.
- Auction page (`/#subasta`) with Freighter wallet flow.
- API routes for feedback/subscription/email/chat.

## Related Docs

- Contracts/deploy: [../soroban/README.md](../soroban/README.md)
- Contract details + metadata shape: [../soroban/contracts/README.md](../soroban/contracts/README.md)

## Environment Variables

Create `.env.local` (or set in Vercel):

### Required for auction

- `NEXT_PUBLIC_AUCTION_CONTRACT_ID`
- `NEXT_PUBLIC_NFT_CONTRACT_ID`
- `NEXT_PUBLIC_STELLAR_RPC_URL` (default testnet: `https://soroban-testnet.stellar.org`)
- `NEXT_PUBLIC_STELLAR_HORIZON_URL` (default testnet: `https://horizon-testnet.stellar.org`)
- `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` (testnet: `Test SDF Network ; September 2015`)
- `NEXT_PUBLIC_STELLAR_NETWORK` (`local`, `testnet`, `mainnet`)
- `NEXT_PUBLIC_USDC_ISSUER`
- `NEXT_PUBLIC_ESCROW_PROVIDER` (`trustless_work` or `internal`)
- `NEXT_PUBLIC_TRUSTLESS_ESCROW_XLM_ADDRESS` (required if provider is `trustless_work`)
- `NEXT_PUBLIC_TRUSTLESS_ESCROW_USDC_ADDRESS` (required if provider is `trustless_work`)
- `NEXT_PUBLIC_BASE_URL` (your public domain)

### Optional for extra features

- `PINATA_JWT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `FEEDBACK_TO_EMAIL`
- `EGG_REQUEST_TO_EMAIL`
- `RESEND_AUDIENCE_UPDATES`
- `RESEND_AUDIENCE_SHIMEJI`
- `RESEND_AUDIENCE_COLLECTION`
- `SUBSCRIBE_SIGNING_SECRET`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

## Run Locally

From `shimeji-xlm/`, install workspace deps once:

```bash
pnpm install
```

Then run the frontend:

```bash
cd nextjs
pnpm dev
```

From repo lane root (`shimeji-xlm/`), you can also use:

```bash
pnpm start
```

## Deploy To Vercel

1. Import project and set root directory to `shimeji-xlm/nextjs`.
2. Add the environment variables listed above.
3. Deploy.
4. Verify `https://<domain>/#subasta` loads the active auction.

## Notes

- Auction data comes from `NEXT_PUBLIC_AUCTION_CONTRACT_ID`.
- Giveaway CTA points to `/#subasta` by default.
- On `local`, `/#subasta` auto-uses a burner wallet (browser-stored) with a faucet shortcut.
- On `testnet`, faucet shortcut funds XLM through friendbot for the connected wallet.
