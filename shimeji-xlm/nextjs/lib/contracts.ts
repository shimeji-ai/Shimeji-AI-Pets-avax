import { rpc } from "@stellar/stellar-sdk";

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

const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function inferNetwork(passphrase: string): "local" | "testnet" | "mainnet" | "custom" {
  if (passphrase === "Standalone Network ; February 2017") return "local";
  if (passphrase === "Test SDF Network ; September 2015") return "testnet";
  if (passphrase === "Public Global Stellar Network ; September 2015") return "mainnet";
  return "custom";
}

function normalizeNetwork(value: string): "local" | "testnet" | "mainnet" | "custom" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "local" || normalized === "standalone" || normalized === "localhost" || normalized === "dev" || normalized === "development") {
    return "local";
  }
  if (normalized === "testnet" || normalized === "test" || normalized === "futurenet") {
    return "testnet";
  }
  if (normalized === "mainnet" || normalized === "main" || normalized === "public") {
    return "mainnet";
  }
  return "custom";
}

export const STELLAR_NETWORK = normalizeNetwork(
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? inferNetwork(NETWORK_PASSPHRASE)
);

export const STELLAR_NETWORK_LABEL =
  STELLAR_NETWORK === "local"
    ? "Stellar Local"
    : STELLAR_NETWORK === "mainnet"
      ? "Stellar Mainnet"
      : STELLAR_NETWORK === "testnet"
        ? "Stellar Testnet"
        : "Stellar";

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ??
  (STELLAR_NETWORK === "local"
    ? "http://localhost:8000"
    : STELLAR_NETWORK === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org");

export const LOCAL_FRIENDBOT_URL =
  process.env.NEXT_PUBLIC_LOCAL_FRIENDBOT_URL ??
  `${HORIZON_URL.replace(/\/$/, "")}/friendbot`;

export const USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  (STELLAR_NETWORK === "local"
    ? process.env.NEXT_PUBLIC_LOCAL_USDC_ISSUER ?? TESTNET_USDC_ISSUER
    : STELLAR_NETWORK === "mainnet"
      ? MAINNET_USDC_ISSUER
      : TESTNET_USDC_ISSUER);

let _server: rpc.Server | null = null;

export function getServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(RPC_URL);
  }
  return _server;
}
