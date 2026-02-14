# shimeji-xlm 🐱🐰

Stellar/Soroban version of Shimeji auctions + NFT minting.

## Mandatory (Run Everything)

From repo root, run one command:

```bash
./shimeji-xlm/launch.sh
```

What this single command does:

- Installs `pnpm` automatically if missing (via `corepack` or `npm`).
- Installs workspace dependencies if needed.
- Opens a command center (arrow keys + Enter).
- Lets you choose one guided path:
  - local experimentation
  - testnet contracts deployment
  - mainnet contracts deployment
- Can launch:
  - chain (`pnpm chain`)
  - frontend (`pnpm start`)
  - deploy (`pnpm run deploy:*`)
  - full experience in separate tabs (chain + frontend + deploy)
  - frontend actions for local dev, Vercel deploy, and GitHub push
- If Vercel/GitHub credentials are needed, launcher guides browser login flow.
- Deploy wizard can create a new wallet as first option and save backup to `shimeji-xlm/secret.txt` (gitignored).
- Local/testnet wallets are auto-funded; mainnet shows wallet address + QR and waits for funding.

After deploy finishes, it prints the commands to create the first auction.

## Mandatory (Put It Online)

1. Run `./shimeji-xlm/launch.sh`.
2. In guided path, choose `testnet` or `mainnet`.
3. Copy deploy output env vars into Vercel (`shimeji-xlm/nextjs` project).
4. Redeploy Vercel and open `/auction`.

## Separate Commands (If You Prefer)

You can still run each part manually:

```bash
cd shimeji-xlm
pnpm chain
pnpm run deploy
pnpm start
```

## Optional (Credentials In .env)

Only if you want deploy credentials preloaded:

```bash
cd shimeji-xlm
cp .env.example .env
```

Optional vars:

- `STELLAR_MNEMONIC`
- `STELLAR_SECRET_SEED` (or `STELLAR_SECRET_KEY`)
- `STELLAR_IDENTITY_ALIAS`

## Docs

- Web app: [nextjs/README.md](./nextjs/README.md)
- Soroban deploy + tooling: [soroban/README.md](./soroban/README.md)
- Contracts + metadata format: [soroban/contracts/README.md](./soroban/contracts/README.md)
- Metadata example JSON: [soroban/metadata/example.json](./soroban/metadata/example.json)
