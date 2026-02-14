#!/usr/bin/env bash
set -euo pipefail

# Deploy Shimeji contracts to Stellar testnet
# Requires: stellar CLI, STELLAR_SECRET_KEY env var

RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE="${STELLAR_SECRET_KEY:?Set STELLAR_SECRET_KEY}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "==> Building contracts..."
cd "$ROOT_DIR"
stellar contract build

NFT_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/shimeji_nft.wasm"
AUCTION_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/shimeji_auction.wasm"

echo "==> Deploying ShimejiNFT..."
NFT_ID=$(stellar contract deploy \
  --wasm "$NFT_WASM" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "NFT Contract: $NFT_ID"

echo "==> Initializing ShimejiNFT..."
ADMIN=$(stellar keys address "$SOURCE" 2>/dev/null || echo "$SOURCE")
stellar contract invoke \
  --id "$NFT_ID" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize --admin "$ADMIN"

echo "==> Deploying ShimejiAuction..."
AUCTION_ID=$(stellar contract deploy \
  --wasm "$AUCTION_WASM" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "Auction Contract: $AUCTION_ID"

# Testnet USDC SAC and native XLM SAC addresses
USDC_TOKEN="${USDC_SAC_ADDRESS:-CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA}"
XLM_TOKEN="${XLM_SAC_ADDRESS:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

echo "==> Initializing ShimejiAuction..."
stellar contract invoke \
  --id "$AUCTION_ID" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN" \
  --nft_contract "$NFT_ID" \
  --usdc_token "$USDC_TOKEN" \
  --xlm_token "$XLM_TOKEN"

echo "==> Setting auction contract as NFT minter..."
stellar contract invoke \
  --id "$NFT_ID" \
  --source "$SOURCE" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- set_minter --minter "$AUCTION_ID"

echo ""
echo "Deployment complete!"
echo "  NFT Contract:     $NFT_ID"
echo "  Auction Contract: $AUCTION_ID"
echo ""
echo "Save these contract IDs in your .env.local:"
echo "  NEXT_PUBLIC_NFT_CONTRACT_ID=$NFT_ID"
echo "  NEXT_PUBLIC_AUCTION_CONTRACT_ID=$AUCTION_ID"
