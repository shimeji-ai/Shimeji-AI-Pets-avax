import { SorobanRpc } from "@stellar/stellar-sdk";

export const AUCTION_CONTRACT_ID =
  process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ID ?? "";
export const NFT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ID ?? "";

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

let _server: SorobanRpc.Server | null = null;

export function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(RPC_URL);
  }
  return _server;
}
