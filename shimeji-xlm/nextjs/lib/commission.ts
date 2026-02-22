import {
  Contract,
  TransactionBuilder,
  Account,
  BASE_FEE,
  xdr,
  nativeToScVal,
  Address,
  rpc,
} from "@stellar/stellar-sdk";
import {
  COMMISSION_CONTRACT_ID,
  getServer,
  NETWORK_PASSPHRASE,
} from "./contracts";

const READONLY_SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function buildReadOnlyTx(operation: xdr.Operation) {
  const simulationAccount = new Account(READONLY_SIMULATION_SOURCE, "0");
  return new TransactionBuilder(simulationAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommissionStatus =
  | "Open"
  | "Accepted"
  | "Delivered"
  | "Completed"
  | "Cancelled";

export type CommissionCurrency = "Xlm" | "Usdc";

export interface CommissionRequest {
  commissionId: number;
  buyer: string;
  intention: string;
  referenceImage: string;
  priceXlm: bigint;
  priceUsdc: bigint;
  xlmUsdcRate: bigint;
  currency: CommissionCurrency;
  status: CommissionStatus;
  tokenId: number;
  artist: string;
  createdAt: number;
}

// ── ScVal parser ──────────────────────────────────────────────────────────────

function parseScVal(val: xdr.ScVal): unknown {
  switch (val.switch().name) {
    case "scvU64":
      return val.u64().low + val.u64().high * 2 ** 32;
    case "scvI128": {
      const parts = val.i128();
      const lo = BigInt(parts.lo().low >>> 0) + (BigInt(parts.lo().high >>> 0) << BigInt(32));
      const hi = BigInt(parts.hi().low >>> 0) + (BigInt(parts.hi().high >>> 0) << BigInt(32));
      return lo + (hi << BigInt(64));
    }
    case "scvString":
      return val.str().toString();
    case "scvSymbol":
      return val.sym().toString();
    case "scvBool":
      return val.b();
    case "scvAddress":
      return Address.fromScVal(val).toString();
    case "scvMap": {
      const map: Record<string, unknown> = {};
      for (const entry of val.map() ?? []) {
        const key = entry.key().sym().toString();
        map[key] = parseScVal(entry.val());
      }
      return map;
    }
    case "scvVec": {
      const vec = val.vec();
      if (vec && vec.length === 1) return vec[0].sym().toString();
      return (vec ?? []).map(parseScVal);
    }
    default:
      return null;
  }
}

function parseStatus(raw: unknown): CommissionStatus {
  const s = String(raw);
  if (s === "Open" || s === "Accepted" || s === "Delivered" || s === "Completed" || s === "Cancelled") {
    return s as CommissionStatus;
  }
  return "Open";
}

function parseCurrency(raw: unknown): CommissionCurrency {
  return String(raw) === "Usdc" ? "Usdc" : "Xlm";
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchCommissions(): Promise<CommissionRequest[]> {
  if (!COMMISSION_CONTRACT_ID) return [];
  const server = getServer();
  const contract = new Contract(COMMISSION_CONTRACT_ID);

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_commissions"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const commissions: CommissionRequest[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_commission", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        commissions.push({
          commissionId: i,
          buyer: data.buyer as string,
          intention: data.intention as string,
          referenceImage: data.reference_image as string,
          priceXlm: data.price_xlm as bigint,
          priceUsdc: data.price_usdc as bigint,
          xlmUsdcRate: data.xlm_usdc_rate as bigint,
          currency: parseCurrency(data.currency),
          status: parseStatus(data.status),
          tokenId: data.token_id as number,
          artist: data.artist as string,
          createdAt: data.created_at as number,
        });
      } catch {
        // skip bad entries
      }
    }
    return commissions;
  } catch {
    return [];
  }
}

// ── Transaction builders ──────────────────────────────────────────────────────

async function buildCommissionTx(
  sourcePublicKey: string,
  methodName: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = getServer();
  const contract = new Contract(COMMISSION_CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const errMsg = (sim as rpc.Api.SimulateTransactionErrorResponse).error ?? "Simulation failed";
    throw new Error(errMsg);
  }
  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

export async function buildCreateCommissionTx(
  buyerPublicKey: string,
  intention: string,
  referenceImage: string,
  priceXlm: bigint,
  priceUsdc: bigint,
  xlmUsdcRate: bigint,
  currency: CommissionCurrency
): Promise<string> {
  return buildCommissionTx(buyerPublicKey, "create_commission", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(intention, { type: "string" }),
    nativeToScVal(referenceImage, { type: "string" }),
    nativeToScVal(priceXlm, { type: "i128" }),
    nativeToScVal(priceUsdc, { type: "i128" }),
    nativeToScVal(xlmUsdcRate, { type: "i128" }),
    nativeToScVal({ tag: currency, values: [] }, { type: "enum" }),
  ]);
}

export async function buildMarkDeliveredTx(
  artistPublicKey: string,
  commissionId: number
): Promise<string> {
  return buildCommissionTx(artistPublicKey, "mark_delivered", [
    new Address(artistPublicKey).toScVal(),
    nativeToScVal(commissionId, { type: "u64" }),
  ]);
}

export async function buildApproveDeliveryTx(
  buyerPublicKey: string,
  commissionId: number
): Promise<string> {
  return buildCommissionTx(buyerPublicKey, "approve_delivery", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(commissionId, { type: "u64" }),
  ]);
}

export async function buildCancelCommissionTx(
  callerPublicKey: string,
  commissionId: number
): Promise<string> {
  return buildCommissionTx(callerPublicKey, "cancel_commission", [
    new Address(callerPublicKey).toScVal(),
    nativeToScVal(commissionId, { type: "u64" }),
  ]);
}
