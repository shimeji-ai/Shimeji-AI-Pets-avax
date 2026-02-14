# shimeji-xlm/soroban/contracts 🐱🐰

Soroban contracts for Shimeji auctions and NFT minting.

## Contracts

- `shimeji-nft`: NFT contract with admin + minter model and `update_token_uri`.
- `shimeji-auction`: auction contract with XLM/USDC bids, outbid refunds, and mint-on-finalize.

## How They Work Together

1. Auction is created with a `token_uri`.
2. Bidders compete in XLM or USDC.
3. On finalize, auction mints NFT to winner using that `token_uri`.
4. Admin can later call `update_token_uri` on NFT contract.

## Deploy And Configure

Use the runbook in [../README.md](../README.md).

That script:

- deploys `shimeji-nft`
- deploys `shimeji-auction`
- initializes both
- sets auction as NFT minter

## Update NFT Metadata URI

### Testnet

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

### Mainnet

```bash
stellar contract invoke \
  --id "<NFT_CONTRACT_ID>" \
  --source "shimeji-deployer" \
  --rpc-url "https://mainnet.sorobanrpc.com" \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- update_token_uri \
  --token_id 0 \
  --new_uri "ipfs://<metadata-cid>/metadata.json"
```

## NFT Metadata Shape (image + sprites folder)

Use standard NFT fields for wallet/market visibility plus a sprites folder pointer.

```json
{
  "name": "Shimeji #1 - Egg",
  "description": "Custom Shimeji companion on Stellar.",
  "image": "ipfs://<assets-cid>/preview/egg-sit.png",
  "external_url": "https://shimeji.ai",
  "attributes": [
    { "trait_type": "Network", "value": "Stellar" },
    { "trait_type": "Type", "value": "Desktop Companion" }
  ],
  "properties": {
    "sprites_folder": "ipfs://<assets-cid>/sprites/",
    "cover_sprite": "egg-sit.png"
  }
}
```

- `image` should point to a directly renderable file (png/jpg/webp).
- `properties.sprites_folder` should point to the folder CID/path containing runtime sprites.
