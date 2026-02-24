import { Contract, rpc } from "@stellar/stellar-sdk";

function envTrim(value: unknown): string {
  return String(value ?? "").trim();
}

export const AUCTION_CONTRACT_ID =
  envTrim(process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ID);
export const NFT_CONTRACT_ID =
  envTrim(process.env.NEXT_PUBLIC_NFT_CONTRACT_ID);
export const MARKETPLACE_CONTRACT_ID =
  envTrim(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID);
export const COMMISSION_CONTRACT_ID =
  envTrim(process.env.NEXT_PUBLIC_COMMISSION_CONTRACT_ID);

export const RPC_URL =
  envTrim(process.env.NEXT_PUBLIC_STELLAR_RPC_URL) || "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  envTrim(process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE) || "Test SDF Network ; September 2015";

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
  envTrim(process.env.NEXT_PUBLIC_STELLAR_NETWORK) || inferNetwork(NETWORK_PASSPHRASE)
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
  envTrim(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL) ||
  (STELLAR_NETWORK === "local"
    ? "http://localhost:8000"
    : STELLAR_NETWORK === "mainnet"
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org");

export const LOCAL_FRIENDBOT_URL =
  envTrim(process.env.NEXT_PUBLIC_LOCAL_FRIENDBOT_URL) ||
  `${HORIZON_URL.replace(/\/$/, "")}/friendbot`;

export const USDC_ISSUER =
  envTrim(process.env.NEXT_PUBLIC_USDC_ISSUER) ||
  (STELLAR_NETWORK === "local"
    ? envTrim(process.env.NEXT_PUBLIC_LOCAL_USDC_ISSUER) || TESTNET_USDC_ISSUER
    : STELLAR_NETWORK === "mainnet"
      ? MAINNET_USDC_ISSUER
      : TESTNET_USDC_ISSUER);

let _server: rpc.Server | null = null;

export function getServer(): rpc.Server {
  if (!_server) {
    const isHttp = /^http:\/\//i.test(RPC_URL);
    _server = new rpc.Server(RPC_URL, isHttp ? { allowHttp: true } : undefined);
  }
  return _server;
}

function contractConfigError(featureLabel: string, envKey: string, reason: "missing" | "invalid") {
  if (reason === "missing") {
    return new Error(
      `${featureLabel} contract is not configured (${envKey}). If you just updated .env.local, restart Next.js so NEXT_PUBLIC env vars reload.`,
    );
  }
  return new Error(
    `${featureLabel} contract ID is invalid (${envKey}). If you just updated .env.local, restart Next.js so NEXT_PUBLIC env vars reload.`,
  );
}

function getConfiguredContract(contractId: string, envKey: string, featureLabel: string): Contract {
  const value = String(contractId || "").trim();
  if (!value) {
    throw contractConfigError(featureLabel, envKey, "missing");
  }
  try {
    return new Contract(value);
  } catch {
    throw contractConfigError(featureLabel, envKey, "invalid");
  }
}

export function getAuctionContract(): Contract {
  return getConfiguredContract(AUCTION_CONTRACT_ID, "NEXT_PUBLIC_AUCTION_CONTRACT_ID", "Auction");
}

export function getMarketplaceContract(): Contract {
  return getConfiguredContract(MARKETPLACE_CONTRACT_ID, "NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID", "Marketplace");
}

export function getCommissionContract(): Contract {
  return getConfiguredContract(COMMISSION_CONTRACT_ID, "NEXT_PUBLIC_COMMISSION_CONTRACT_ID", "Commission");
}

export function getNftContract(): Contract {
  return getConfiguredContract(NFT_CONTRACT_ID, "NEXT_PUBLIC_NFT_CONTRACT_ID", "NFT");
}
