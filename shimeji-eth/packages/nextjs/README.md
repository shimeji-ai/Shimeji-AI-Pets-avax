# shimeji-eth/packages/nextjs 🐱🐰

Frontend dApp for the EVM Shimeji flow.

## What This App Does

- Connects wallets (Scaffold-ETH / wagmi stack).
- Reads deployed contracts and enables mint/purchase flows.
- Hosts related web/API pages used by the EVM version.

## Related Docs

- Workspace overview: [../../README.md](../../README.md)
- Contracts and deploy details: [../foundry/contracts/README.md](../foundry/contracts/README.md)

## Local Run (from `shimeji-eth/`)

```bash
yarn install
yarn start
```

## Required Environment

Set in `packages/nextjs/.env.local` (or Vercel):

- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `NEXT_PUBLIC_BASE_URL`

Optional:

- `PINATA_JWT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `FEEDBACK_TO_EMAIL`
- `EGG_REQUEST_TO_EMAIL`
- `RESEND_AUDIENCE_UPDATES`
- `RESEND_AUDIENCE_SHIMEJI`
- `RESEND_AUDIENCE_COLLECTION`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

## Vercel

1. Set root directory to `shimeji-eth/packages/nextjs`.
2. Add the env vars listed above.
3. Deploy and verify wallet/contract connectivity against the target EVM network.
