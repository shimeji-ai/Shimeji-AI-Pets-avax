import { NextResponse } from "next/server";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

type BalanceLike = {
  asset_code?: string;
  asset_issuer?: string;
  asset_type?: string;
  balance?: string;
};

type LocalUsdcFundingResult = {
  funded: boolean;
  needsTrustline: boolean;
  skipped: boolean;
  pendingAccount: boolean;
};

const LOCAL_PASSPHRASE = "Standalone Network ; February 2017";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const DEFAULT_TESTNET_FRIENDBOT = "https://friendbot.stellar.org";
const LOCAL_DEFAULT_HORIZON = "http://localhost:8000";
const LOCAL_DEFAULT_FRIENDBOT = "http://localhost:8000/friendbot";

function normalizeNetwork(value: string) {
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
  return normalized;
}

function isLocalNetwork() {
  const configuredNetwork = normalizeNetwork(process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "");
  const passphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? TESTNET_PASSPHRASE;
  return configuredNetwork === "local" || passphrase === LOCAL_PASSPHRASE;
}

function isTestnetNetwork() {
  const configuredNetwork = normalizeNetwork(process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "");
  const passphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? TESTNET_PASSPHRASE;
  return configuredNetwork === "testnet" || passphrase === TESTNET_PASSPHRASE;
}

function getNetworkPassphrase() {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? TESTNET_PASSPHRASE;
}

function getFriendbotUrl() {
  if (isLocalNetwork()) {
    return process.env.NEXT_PUBLIC_LOCAL_FRIENDBOT_URL ?? LOCAL_DEFAULT_FRIENDBOT;
  }
  if (isTestnetNetwork()) {
    return process.env.TESTNET_FRIENDBOT_URL ?? DEFAULT_TESTNET_FRIENDBOT;
  }
  return "";
}

function getHorizonUrl() {
  if (isLocalNetwork()) {
    return process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? LOCAL_DEFAULT_HORIZON;
  }
  return process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
}

function isAccountNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /404|not found|does not exist/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadAccountWithRetry(
  horizon: Horizon.Server,
  address: string,
  attempts = 10,
  waitMs = 250
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await horizon.loadAccount(address);
    } catch (error) {
      if (!isAccountNotFoundError(error)) {
        throw error;
      }
      if (attempt === attempts) {
        return null;
      }
      await sleep(waitMs);
    }
  }
  return null;
}

async function fundNative(address: string) {
  const friendbotUrl = getFriendbotUrl();
  if (!friendbotUrl) return false;
  const response = await fetch(`${friendbotUrl.replace(/\/$/, "")}?addr=${encodeURIComponent(address)}`);
  return response.ok;
}

async function fundLocalUsdc(address: string) {
  if (!isLocalNetwork()) {
    return {
      funded: false,
      needsTrustline: false,
      skipped: true,
      pendingAccount: false,
    } satisfies LocalUsdcFundingResult;
  }

  const issuerPublic = process.env.NEXT_PUBLIC_LOCAL_USDC_ISSUER;
  const issuerSecret = process.env.LOCAL_USDC_ISSUER_SECRET;
  const usdcAmount = process.env.LOCAL_USDC_FAUCET_AMOUNT ?? "500";
  const assetCode = process.env.LOCAL_USDC_ASSET_CODE ?? "USDC";
  if (!issuerPublic || !issuerSecret) {
    return {
      funded: false,
      needsTrustline: false,
      skipped: true,
      pendingAccount: false,
    } satisfies LocalUsdcFundingResult;
  }

  const horizon = new Horizon.Server(getHorizonUrl().replace(/\/$/, ""));
  const recipient = await loadAccountWithRetry(horizon, address);
  if (!recipient) {
    return {
      funded: false,
      needsTrustline: false,
      skipped: false,
      pendingAccount: true,
    } satisfies LocalUsdcFundingResult;
  }

  const hasTrustline = recipient.balances.some((bal: BalanceLike) => {
    return bal.asset_code === assetCode && bal.asset_issuer === issuerPublic;
  });
  if (!hasTrustline) {
    return {
      funded: false,
      needsTrustline: true,
      skipped: false,
      pendingAccount: false,
    } satisfies LocalUsdcFundingResult;
  }

  const issuerAccount = await horizon.loadAccount(issuerPublic);
  const tx = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      Operation.payment({
        destination: address,
        asset: new Asset(assetCode, issuerPublic),
        amount: usdcAmount,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(Keypair.fromSecret(issuerSecret));
  await horizon.submitTransaction(tx);
  return {
    funded: true,
    needsTrustline: false,
    skipped: false,
    pendingAccount: false,
  } satisfies LocalUsdcFundingResult;
}

export async function POST(request: Request) {
  try {
    if (!isLocalNetwork() && !isTestnetNetwork()) {
      return NextResponse.json(
        { error: "Faucet is only supported for local or testnet networks." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { address?: string };
    const address = (body.address ?? "").trim();
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return NextResponse.json({ error: "Invalid Stellar public address." }, { status: 400 });
    }

    const xlmFunded = await fundNative(address);
    const localUsdc = await fundLocalUsdc(address);

    return NextResponse.json({
      network: isLocalNetwork() ? "local" : "testnet",
      xlmFunded,
      usdcFunded: localUsdc.funded,
      needsTrustline: localUsdc.needsTrustline,
      usdcSkipped: localUsdc.skipped,
      pendingAccount: localUsdc.pendingAccount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not fund wallet from faucet.",
      },
      { status: 500 }
    );
  }
}
