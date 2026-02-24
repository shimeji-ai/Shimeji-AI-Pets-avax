import {
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
  getMarketplaceContract,
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
  commissionEtaDays: number;
  isCommissionEgg: boolean;
  active: boolean;
}

export interface SwapListing {
  listingId: number;
  creator: string;
  offeredTokenId: number;
  intention: string;
  active: boolean;
}

export interface SwapBid {
  bidId: number;
  listingId: number;
  bidder: string;
  bidderTokenId: number;
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
  upfrontPaidToSeller: bigint;
  escrowRemaining: bigint;
  commissionEtaDays: number;
  intention: string;
  referenceImageUrl: string;
  latestRevisionIntention: string;
  latestRevisionRefUrl: string;
  revisionRequestCount: number;
  maxRevisionRequests: number;
  metadataUriAtPurchase: string;
  lastDeliveredMetadataUri: string;
  status: "Accepted" | "Delivered" | "Completed" | "Refunded" | string;
  fulfilled: boolean;
  createdAt: number;
  deliveredAt: number;
  resolvedAt: number;
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
  const contract = getMarketplaceContract();

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
          commissionEtaDays: (data.commission_eta_days as number) ?? 0,
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

export async function fetchSwapListings(): Promise<SwapListing[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = getMarketplaceContract();

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_swap_listings"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const listings: SwapListing[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_swap_listing", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        if (!data.active) continue;

        listings.push({
          listingId: i,
          creator: data.creator as string,
          offeredTokenId: data.offered_token_id as number,
          intention: (data.intention as string) ?? "",
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

export async function fetchSwapBids(): Promise<SwapBid[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = getMarketplaceContract();

  try {
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_swap_bids"))
    );
    if (rpc.Api.isSimulationError(totalResult)) return [];
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return [];

    const bids: SwapBid[] = [];
    for (let i = 0; i < total; i++) {
      try {
        const result = await server.simulateTransaction(
          buildReadOnlyTx(contract.call("get_swap_bid", nativeToScVal(i, { type: "u64" })))
        );
        if (rpc.Api.isSimulationError(result)) continue;
        const data = parseScVal(
          (result as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;

        if (!data.active) continue;

        bids.push({
          bidId: i,
          listingId: data.listing_id as number,
          bidder: data.bidder as string,
          bidderTokenId: data.bidder_token_id as number,
          active: data.active as boolean,
        });
      } catch {
        // skip bad entries
      }
    }
    return bids;
  } catch {
    return [];
  }
}

export async function fetchCommissionOrders(): Promise<CommissionOrder[]> {
  if (!MARKETPLACE_CONTRACT_ID) return [];
  const server = getServer();
  const contract = getMarketplaceContract();

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
          upfrontPaidToSeller: (data.upfront_paid_to_seller as bigint) ?? BigInt(0),
          escrowRemaining: (data.escrow_remaining as bigint) ?? BigInt(0),
          commissionEtaDays: (data.commission_eta_days as number) ?? 0,
          intention: (data.intention as string) ?? "",
          referenceImageUrl: (data.reference_image_url as string) ?? "",
          latestRevisionIntention: (data.latest_revision_intention as string) ?? "",
          latestRevisionRefUrl: (data.latest_revision_ref_url as string) ?? "",
          revisionRequestCount: (data.revision_request_count as number) ?? 0,
          maxRevisionRequests: (data.max_revision_requests as number) ?? 3,
          metadataUriAtPurchase: (data.metadata_uri_at_purchase as string) ?? "",
          lastDeliveredMetadataUri: (data.last_delivered_metadata_uri as string) ?? "",
          status: (data.status as string) ?? "Accepted",
          fulfilled: String(data.status ?? "").toLowerCase() === "completed",
          createdAt: data.created_at as number,
          deliveredAt: (data.delivered_at as number) ?? 0,
          resolvedAt: (data.resolved_at as number) ?? 0,
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
  const contract = getMarketplaceContract();
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
  xlmUsdcRate: bigint,
  commissionEtaDays: number,
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "list_commission_egg", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
    nativeToScVal(priceXlm, { type: "i128" }),
    nativeToScVal(priceUsdc, { type: "i128" }),
    nativeToScVal(xlmUsdcRate, { type: "i128" }),
    nativeToScVal(commissionEtaDays, { type: "u64" }),
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

export async function buildCreateSwapListingTx(
  creatorPublicKey: string,
  offeredTokenId: number,
  intention: string
): Promise<string> {
  return buildMarketplaceTx(creatorPublicKey, "create_swap_listing", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(offeredTokenId, { type: "u64" }),
    nativeToScVal(intention),
  ]);
}

export async function buildPlaceSwapBidTx(
  bidderPublicKey: string,
  listingId: number,
  bidderTokenId: number
): Promise<string> {
  return buildMarketplaceTx(bidderPublicKey, "place_swap_bid", [
    new Address(bidderPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
    nativeToScVal(bidderTokenId, { type: "u64" }),
  ]);
}

export async function buildAcceptSwapBidTx(
  creatorPublicKey: string,
  listingId: number,
  bidId: number
): Promise<string> {
  return buildMarketplaceTx(creatorPublicKey, "accept_swap_bid", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
    nativeToScVal(bidId, { type: "u64" }),
  ]);
}

export async function buildCancelSwapListingTx(
  creatorPublicKey: string,
  listingId: number
): Promise<string> {
  return buildMarketplaceTx(creatorPublicKey, "cancel_swap_listing", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(listingId, { type: "u64" }),
  ]);
}

export async function buildCancelSwapBidTx(
  bidderPublicKey: string,
  bidId: number
): Promise<string> {
  return buildMarketplaceTx(bidderPublicKey, "cancel_swap_bid", [
    new Address(bidderPublicKey).toScVal(),
    nativeToScVal(bidId, { type: "u64" }),
  ]);
}

export async function buildMarkCommissionDeliveredTx(
  sellerPublicKey: string,
  orderId: number
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "mark_commission_delivered", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
  ]);
}

export async function buildApproveCommissionDeliveryTx(
  buyerPublicKey: string,
  orderId: number
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "approve_commission_delivery", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
  ]);
}

export async function buildRequestCommissionRevisionTx(
  buyerPublicKey: string,
  orderId: number,
  intention: string,
  referenceImageUrl: string,
): Promise<string> {
  return buildMarketplaceTx(buyerPublicKey, "request_commission_revision", [
    new Address(buyerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
    nativeToScVal(intention),
    nativeToScVal(referenceImageUrl),
  ]);
}

export async function buildClaimCommissionTimeoutTx(
  sellerPublicKey: string,
  orderId: number,
): Promise<string> {
  return buildMarketplaceTx(sellerPublicKey, "claim_commission_timeout", [
    new Address(sellerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
  ]);
}

export async function buildRefundCommissionOrderTx(
  callerPublicKey: string,
  orderId: number
): Promise<string> {
  return buildMarketplaceTx(callerPublicKey, "refund_commission_order", [
    new Address(callerPublicKey).toScVal(),
    nativeToScVal(orderId, { type: "u64" }),
  ]);
}
