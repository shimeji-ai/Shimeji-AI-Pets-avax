#!/usr/bin/env bash
set -euo pipefail

# ─── Deploy Shimeji Soroban contracts ───────────────────────
#
# Usage:
#   # Testnet (default)
#   STELLAR_SECRET_KEY="S..." ./scripts/deploy.sh
#
#   # Mainnet
#   STELLAR_SECRET_KEY="S..." NETWORK=mainnet ./scripts/deploy.sh
#
# Prerequisites:
#   - stellar CLI  (https://developers.stellar.org/docs/tools/cli/install-cli)
#   - Rust + wasm32-unknown-unknown target
#   - A funded Stellar account (friendbot for testnet, real XLM for mainnet)
# ─────────────────────────────────────────────────────────────

NETWORK="${NETWORK:-testnet}"
SECRET="${STELLAR_SECRET_KEY:?Set STELLAR_SECRET_KEY to your secret key (S...)}"

if [ "$NETWORK" = "mainnet" ]; then
  RPC_URL="${STELLAR_RPC_URL:-https://mainnet.sorobanrpc.com}"
  PASSPHRASE="Public Global Stellar Network ; September 2015"
  USDC_ISSUER="GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
else
  RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
  PASSPHRASE="Test SDF Network ; September 2015"
  USDC_ISSUER="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo ""
echo "  Network:    $NETWORK"
echo "  RPC:        $RPC_URL"
echo "  Passphrase: $PASSPHRASE"
echo ""

# ── 1. Configure identity ──────────────────────────────────
IDENTITY="shimeji-deployer"
stellar keys add "$IDENTITY" --secret-key --overwrite <<< "$SECRET" 2>/dev/null || true
ADMIN=$(stellar keys address "$IDENTITY")
echo "  Admin:      $ADMIN"
echo ""

# ── 2. Fund on testnet ─────────────────────────────────────
if [ "$NETWORK" = "testnet" ]; then
  echo "==> Funding account via friendbot..."
  curl -s "https://friendbot.stellar.org/?addr=$ADMIN" > /dev/null 2>&1 || true
fi

# ── 3. Build contracts ─────────────────────────────────────
echo "==> Building contracts..."
cd "$ROOT_DIR"
stellar contract build

NFT_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/shimeji_nft.wasm"
AUCTION_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/shimeji_auction.wasm"

# ── 4. Derive SAC addresses ────────────────────────────────
echo "==> Deriving SAC token addresses..."
XLM_TOKEN=$(stellar contract id asset \
  --asset native \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "  XLM SAC:  $XLM_TOKEN"

USDC_TOKEN=$(stellar contract id asset \
  --asset "USDC:$USDC_ISSUER" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "  USDC SAC: $USDC_TOKEN"

# ── 5. Deploy ShimejiNFT ───────────────────────────────────
echo "==> Deploying ShimejiNFT..."
NFT_ID=$(stellar contract deploy \
  --wasm "$NFT_WASM" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "  NFT Contract: $NFT_ID"

echo "==> Initializing ShimejiNFT..."
stellar contract invoke \
  --id "$NFT_ID" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize --admin "$ADMIN"

# ── 6. Deploy ShimejiAuction ───────────────────────────────
echo "==> Deploying ShimejiAuction..."
AUCTION_ID=$(stellar contract deploy \
  --wasm "$AUCTION_WASM" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "  Auction Contract: $AUCTION_ID"

echo "==> Initializing ShimejiAuction..."
stellar contract invoke \
  --id "$AUCTION_ID" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN" \
  --nft_contract "$NFT_ID" \
  --usdc_token "$USDC_TOKEN" \
  --xlm_token "$XLM_TOKEN"

# ── 7. Authorize auction as NFT minter ─────────────────────
echo "==> Setting auction contract as NFT minter..."
stellar contract invoke \
  --id "$NFT_ID" \
  --source "$IDENTITY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- set_minter --minter "$AUCTION_ID"

# ── 8. Summary ──────────────────────────────────────────────
echo ""
echo "================================================"
echo "  Deployment complete ($NETWORK)"
echo "================================================"
echo ""
echo "  NFT Contract:     $NFT_ID"
echo "  Auction Contract: $AUCTION_ID"
echo "  XLM SAC:          $XLM_TOKEN"
echo "  USDC SAC:         $USDC_TOKEN"
echo "  Admin:            $ADMIN"
echo ""
echo "Add to nextjs/.env.local:"
echo ""
echo "  NEXT_PUBLIC_NFT_CONTRACT_ID=$NFT_ID"
echo "  NEXT_PUBLIC_AUCTION_CONTRACT_ID=$AUCTION_ID"
if [ "$NETWORK" = "mainnet" ]; then
  echo "  NEXT_PUBLIC_STELLAR_RPC_URL=$RPC_URL"
  echo '  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015'
fi
echo ""
