# shimeji-eth/packages/foundry/contracts 🐱🐰

EVM contracts for Shimeji minting.

## Contracts

- `ShimejiNFT.sol`: ERC-721 with owner-only `mint` and `updateTokenURI`.
- `ShimejiFactory.sol`: purchase entrypoint (`buy`) that mints through `ShimejiNFT` and supports withdrawals.

## Deploy

From `shimeji-eth/`:

```bash
yarn install
yarn deploy
```

Optional network deploy:

```bash
yarn deploy --network sepolia
```

Notes:

- Deploy scripts live in `../script/`.
- `Deploy.s.sol` deploys NFT + Factory and transfers NFT ownership to Factory.

## Configure Frontend

After deploy, ensure generated deployment artifacts are available to the frontend app (`packages/nextjs`).

## Update NFT Metadata URI (EVM)

Owner-only function on `ShimejiNFT`:

```bash
cast send <NFT_CONTRACT_ADDRESS> \
  "updateTokenURI(uint256,string)" \
  0 \
  "ipfs://<metadata-cid>/metadata.json" \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY>
```

## NFT Metadata Shape (image + sprites folder)

```json
{
  "name": "Shimeji #1 - Egg",
  "description": "Custom Shimeji companion on EVM.",
  "image": "ipfs://<assets-cid>/preview/egg-sit.png",
  "external_url": "https://shimeji.ai",
  "attributes": [
    { "trait_type": "Chain", "value": "EVM" },
    { "trait_type": "Type", "value": "Desktop Companion" }
  ],
  "properties": {
    "sprites_folder": "ipfs://<assets-cid>/sprites/",
    "cover_sprite": "egg-sit.png"
  }
}
```

- Keep `image` as a direct renderable file for wallets/marketplaces.
- Keep `properties.sprites_folder` pointing to the folder that stores the runtime sprites.
