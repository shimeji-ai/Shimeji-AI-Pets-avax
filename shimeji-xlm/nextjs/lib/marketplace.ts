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
  MARKETPLACE_CONTRACT_ID,
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

export interface ListingInfo {
  listingId: number;
  seller: string;
  tokenId: number;
  priceXlm: bigint;
  priceUsdc: bigint;
  xlmUsdcRate: bigint;
  isCommissionEgg: boolean;
  active: boolean;
}

export interface SwapOffer {
  swapId: number;
  offerer: string;
  offeredTokenId: number;
  desiredTokenId: number;
  intention: string;
  active: boolean;
}

export interface CommissionOrder {
  orderId: number;
  buyer: string;
  seller: string;
  listingId: number;
  tokenId: number;
  currency: "Xlm" | "Usdc" | string;
  amountPaid: bigint;
  intention: string;
  referenceImageUrl: string;
  fulfilled: boolean;
  createdAt: number;
}

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

export async function fetchListings(): Promise<ListingInfo[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_listings"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const listings: ListingInfo[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_listing", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        if (!data.active) continue;

        listings.push({
          listingId: i,
          seller: data.seller as string,
          tokenId: data.token_id as number,
          priceXlm: data.price_xlm as bigint,
          priceUsdc: data.price_usdc as bigint,
          xlmUsdcRate: data.xlm_usdc_rate as bigint,
          isCommissionEgg: Boolean(data.is_commission_egg),
          active: data.active as boolean,
        });
      } catch {
        // skip bad entries
      }
    }
    return listings;
  } catch {
    return [];
  }
}

export async function fetchSwapOffers(): Promise<SwapOffer[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_swaps"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const offers: SwapOffer[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_swap_offer", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        if (!data.active) continue;

        offers.push({
          swapId: i,
          offerer: data.offerer as string,
          offeredTokenId: data.offered_token_id as number,
          desiredTokenId: data.desired_token_id as number,
          intention: (data.intention as string) ?? "",
          active: data.active as boolean,
        });
      } catch {
        // skip bad entries
      }
    }
    return offers;
  } catch {
    return [];
  }
}

export async function fetchCommissionOrders(): Promise<CommissionOrder[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_commission_orders"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const orders: CommissionOrder[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_commission_order", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        orders.push({
          orderId: i,
          buyer: data.buyer as string,
          seller: data.seller as string,
          listingId: data.listing_id as number,
          tokenId: data.token_id as number,
          currency: (data.currency as string) ?? "Xlm",
          amountPaid: data.amount_paid as bigint,
          intention: (data.intention as string) ?? "",
          referenceImageUrl: (data.reference_image_url as string) ?? "",
          fulfilled: Boolean(data.fulfilled),
          createdAt: data.created_at as number,
        });
      } catch {
        // skip bad entries
      }
    }
    return orders;
  } catch {
    return [];
  }
}

async function buildMarketplaceTx(
  sourcePublicKey: string,
  methodName: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);
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

export async function buildListForSaleTx(
  sellerPublicKey: string,
  tokenId: number,
  priceXlm: bigint,
  priceUsdc: bigint,
  xlmUsdcRate: bigint
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "list_for_sale", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
    nativeToScVal(priceXlm, { type: "i128" }),
    nativeToScVal(priceUsdc, { type: "i128" }),
    nativeToScVal(xlmUsdcRate, { type: "i128" }),
  ]);
}

export async function buildListCommissionEggTx(
  sellerPublicKey: string,
  tokenId: number,
  priceXlm: bigint,
  priceUsdc: bigint,
  xlmUsdcRate: bigint
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "list_commission_egg", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
    nativeToScVal(priceXlm, { type: "i128" }),
    nativeToScVal(priceUsdc, { type: "i128" }),
    nativeToScVal(xlmUsdcRate, { type: "i128" }),
  ]);
}

export async function buildBuyXlmTx(
  buyerPublicKey: string,
  listingId: number
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "buy_xlm", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
  ]);
}

export async function buildBuyCommissionXlmTx(
  buyerPublicKey: string,
  listingId: number,
  intention: string,
  referenceImageUrl: string
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "buy_commission_xlm", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
    nativeToScVal(intention),
    nativeToScVal(referenceImageUrl),
  ]);
}

export async function buildBuyUsdcTx(
  buyerPublicKey: string,
  listingId: number
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "buy_usdc", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
  ]);
}

export async function buildBuyCommissionUsdcTx(
  buyerPublicKey: string,
  listingId: number,
  intention: string,
  referenceImageUrl: string
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "buy_commission_usdc", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
    nativeToScVal(intention),
    nativeToScVal(referenceImageUrl),
  ]);
}

export async function buildCancelListingTx(
  sellerPublicKey: string,
  listingId: number
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "cancel_listing", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
  ]);
}

export async function buildCreateSwapOfferTx(
  offererPublicKey: string,
  offeredTokenId: number,
  desiredTokenId: number,
  intention: string
): Promise<string> {
  return buildMarketplaceTx(offererPublicKey, "create_swap_offer", [
    new Address(offererPublicKey).toScVal(),
    nativeToScVal(offeredTokenId, { type: "u64" }),
    nativeToScVal(desiredTokenId, { type: "u64" }),
    nativeToScVal(intention),
  ]);
}

export async function buildAcceptSwapTx(
  acceptorPublicKey: string,
  swapId: number
): Promise<string> {
  return buildMarketplaceTx(acceptorPublicKey, "accept_swap", [
    new Address(acceptorPublicKey).toScVal(),
    nativeToScVal(swapId, { type: "u64" }),
  ]);
}

export async function buildCancelSwapTx(
  offererPublicKey: string,
  swapId: number
): Promise<string> {
  return buildMarketplaceTx(offererPublicKey, "cancel_swap", [
    new Address(offererPublicKey).toScVal(),
    nativeToScVal(swapId, { type: "u64" }),
  ]);
}

export async function buildMarkCommissionFulfilledTx(
  sellerPublicKey: string,
  orderId: number
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "mark_commission_fulfilled", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
  ]);
}
