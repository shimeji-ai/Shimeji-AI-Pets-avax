import { SorobanRpc } from "@stellar/stellar-sdk";

export const AUCTION_CONTRACT_ID =
  process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ID ?? "";
export const NFT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ID ?? "";

export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

function inferNetwork(passphrase: string): "local" | "testnet" | "mainnet" | "custom" {
  if (passphrase === "Standalone Network ; February 2017") return "local";
  if (passphrase === "Test SDF Network ; September 2015") return "testnet";
  if (passphrase === "Public Global Stellar Network ; September 2015") return "mainnet";
  return "custom";
}

export const STELLAR_NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? inferNetwork(NETWORK_PASSPHRASE)).toLowerCase();

export const STELLAR_NETWORK_LABEL =
  STELLAR_NETWORK === "local"
    ? "Stellar Local"
    : STELLAR_NETWORK === "mainnet"
      ? "Stellar Mainnet"
      : STELLAR_NETWORK === "testnet"
        ? "Stellar Testnet"
        : "Stellar";

let _server: SorobanRpc.Server | null = null;

export function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(RPC_URL);
  }
  return _server;
}
