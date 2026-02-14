# shimeji-xlm 🐱🐰✨

Stellar/Soroban realm for Shimeji auctions + NFT minting 🪄

Escrow path for bids: Trustless Work 🛡️ (rolling in)

## One Spell (Recommended) 🔮

From repo root:

```bash
./shimeji-xlm/launch.sh
```

Follow the wizard and let the magic happen ✨

## Put It Online 🌐

1. Run `./shimeji-xlm/launch.sh`.
2. Choose `testnet` or `mainnet`.
3. Sync Vercel vars:

```bash
cd shimeji-xlm
pnpm run vercel:env:testnet -- production
# or
pnpm run vercel:env:mainnet -- production
```

4. Redeploy on Vercel and open `/auction`.

## Manual Mode (Optional) ⚙️

```bash
cd shimeji-xlm
pnpm chain
pnpm run deploy
pnpm start
```

## More Docs 📚

- Web app: [nextjs/README.md](./nextjs/README.md)
- Soroban deploy + tooling: [soroban/README.md](./soroban/README.md)
- Contracts + metadata format: [soroban/contracts/README.md](./soroban/contracts/README.md)
- Metadata example JSON: [soroban/metadata/example.json](./soroban/metadata/example.json)
