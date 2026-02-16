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
  AUCTION_CONTRACT_ID,
  getServer,
  HORIZON_URL,
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

export interface AuctionInfo {
  tokenUri: string;
  startTime: number;
  endTime: number;
  startingPriceXlm: bigint;
  startingPriceUsdc: bigint;
  xlmUsdcRate: bigint;
  finalized: boolean;
}

export interface BidInfo {
  bidder: string;
  amount: bigint;
  currency: "Xlm" | "Usdc";
}

function parseScVal(val: xdr.ScVal): unknown {
  switch (val.switch().name) {
    case "scvU64":
      return val.u64().low + val.u64().high * 2 ** 32;
    case "scvI128": {
      const parts = val.i128();
      // lo().low / lo().high / hi().low / hi().high are signed Int32.
      // Use >>> 0 to treat them as unsigned 32-bit values before converting to BigInt.
      const lo = BigInt(parts.lo().low >>> 0) + (BigInt(parts.lo().high >>> 0) << 32n);
      const hi = BigInt(parts.hi().low >>> 0) + (BigInt(parts.hi().high >>> 0) << 32n);
      return lo + (hi << 64n);
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
      // Enum variant
      const vec = val.vec();
      if (vec && vec.length === 1) {
        return vec[0].sym().toString();
      }
      return (vec ?? []).map(parseScVal);
    }
    default:
      return null;
  }
}

type HorizonInvokeHostFunctionOperation = {
  type?: string;
  parameters?: Array<{ value?: string; type?: string }>;
  created_at?: string;
  transaction_hash?: string;
  id?: string;
  paging_token?: string;
};

function decodeOperationParameter(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return parseScVal(xdr.ScVal.fromXDR(raw, "base64"));
  } catch {
    return null;
  }
}

function parsePositiveBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") {
    return value > 0n ? value : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) return null;
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    const parsed = BigInt(value);
    return parsed > 0n ? parsed : null;
  }
  return null;
}

function parseBidFromOperation(
  op: HorizonInvokeHostFunctionOperation,
  auctionId: number
): BidInfo | null {
  if (op.type !== "invoke_host_function") return null;

  const decoded = (op.parameters ?? []).map((parameter) =>
    decodeOperationParameter(parameter.value)
  );

  const contractAddress = decoded[0];
  if (contractAddress !== AUCTION_CONTRACT_ID) return null;

  const method = String(decoded[1] ?? "").toLowerCase();
  const currency: BidInfo["currency"] | null =
    method === "bid_xlm" ? "Xlm" : method === "bid_usdc" ? "Usdc" : null;
  if (!currency) return null;

  const operationAuctionId = Number(decoded[2]);
  if (!Number.isFinite(operationAuctionId) || operationAuctionId !== auctionId) return null;

  let bidder = typeof decoded[3] === "string" ? decoded[3] : null;
  if (!bidder || !/^G[A-Z0-9]{55}$/.test(bidder)) {
    bidder = null;
    for (const value of decoded) {
      if (typeof value === "string" && /^G[A-Z0-9]{55}$/.test(value)) {
        bidder = value;
        break;
      }
    }
  }
  if (!bidder) return null;

  let amount = parsePositiveBigInt(decoded[4]);
  if (amount === null) {
    for (const value of decoded) {
      const parsedAmount = parsePositiveBigInt(value);
      if (parsedAmount !== null && (amount === null || parsedAmount > amount)) {
        amount = parsedAmount;
      }
    }
  }
  if (amount === null || amount <= 0n) return null;

  return { bidder, amount, currency };
}

async function fetchRecentBidsFromHorizon(
  auctionId: number,
  auctionStartTime: number,
  limit = 8
): Promise<BidInfo[]> {
  const baseUrl = HORIZON_URL.replace(/\/$/, "");
  let cursor: string | undefined;
  const maxPages = 40;
  const found: BidInfo[] = [];
  const seen = new Set<string>();
  const startThreshold = auctionStartTime - 2;

  for (let page = 0; page < maxPages && found.length < limit; page += 1) {
    const url = new URL(`${baseUrl}/operations`);
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", "200");
    url.searchParams.set("join", "transactions");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      console.log(`[bids] Horizon page ${page} fetch failed: ${response.status}`);
      break;
    }
    const payload = (await response.json()) as {
      _embedded?: { records?: HorizonInvokeHostFunctionOperation[] };
    };
    const records = payload._embedded?.records ?? [];
    console.log(`[bids] Page ${page}: ${records.length} records, startThreshold=${startThreshold}`);
    if (records.length === 0) break;
    let pageHasRecentRecords = false;

    for (const record of records) {
      const createdAtSeconds = record.created_at
        ? Math.floor(Date.parse(record.created_at) / 1000)
        : Number.NaN;
      if (Number.isFinite(createdAtSeconds) && createdAtSeconds >= startThreshold) {
        pageHasRecentRecords = true;
      }
      if (Number.isFinite(createdAtSeconds) && createdAtSeconds < startThreshold) {
        console.log(`[bids] Skipping old record: created_at=${record.created_at} (${createdAtSeconds} < ${startThreshold})`);
        continue;
      }

      const bid = parseBidFromOperation(record, auctionId);
      if (!bid) continue;
      const key =
        record.id ??
        record.transaction_hash ??
        `${record.created_at ?? ""}-${bid.bidder}-${bid.amount.toString()}-${bid.currency}`;
      if (seen.has(key)) {
        console.log(`[bids] Duplicate key: ${key}`);
        continue;
      }
      seen.add(key);
      found.push(bid);
      console.log(`[bids] Found bid: bidder=${bid.bidder.slice(0,8)}... amount=${bid.amount} currency=${bid.currency}`);
      if (found.length >= limit) break;
    }

    if (!pageHasRecentRecords) {
      console.log(`[bids] No recent records on page ${page}, stopping`);
      break;
    }

    cursor = records[records.length - 1].paging_token;
    if (!cursor) break;
  }

  return found;
}

export async function fetchActiveAuction(): Promise<{
  auction: AuctionInfo;
  highestBid: BidInfo | null;
  recentBids: BidInfo[];
  auctionId: number;
} | null> {
  const server = getServer();
  const contract = new Contract(AUCTION_CONTRACT_ID);

  try {
    // Get total auctions
    const totalResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("total_auctions"))
    );

    if (rpc.Api.isSimulationError(totalResult)) return null;
    const total = Number(
      (totalResult as rpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return null;

    const auctionId = total - 1;

    // Get auction info
    const auctionResult = await server.simulateTransaction(
      buildReadOnlyTx(contract.call("get_auction", nativeToScVal(auctionId, { type: "u64" })))
    );

    if (rpc.Api.isSimulationError(auctionResult)) return null;
    const auctionData = parseScVal(
      (auctionResult as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    ) as Record<string, unknown>;

    const auction: AuctionInfo = {
      tokenUri: auctionData.token_uri as string,
      startTime: auctionData.start_time as number,
      endTime: auctionData.end_time as number,
      startingPriceXlm: auctionData.starting_price_xlm as bigint,
      startingPriceUsdc: auctionData.starting_price_usdc as bigint,
      xlmUsdcRate: auctionData.xlm_usdc_rate as bigint,
      finalized: auctionData.finalized as boolean,
    };

    // Try to get highest bid
    let highestBid: BidInfo | null = null;
    try {
      const bidResult = await server.simulateTransaction(
        buildReadOnlyTx(contract.call("get_highest_bid", nativeToScVal(auctionId, { type: "u64" })))
      );

      if (!rpc.Api.isSimulationError(bidResult)) {
        const bidData = parseScVal(
          (bidResult as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
        ) as Record<string, unknown>;
        highestBid = {
          bidder: bidData.bidder as string,
          amount: bidData.amount as bigint,
          currency: bidData.currency as "Xlm" | "Usdc",
        };
      }
    } catch {
      // No bids yet
    }

    let recentBids: BidInfo[] = [];
    try {
      recentBids = await fetchRecentBidsFromHorizon(
        auctionId,
        auction.startTime,
        8
      );
    } catch {
      recentBids = [];
    }

    return { auction, highestBid, recentBids, auctionId };
  } catch {
    return null;
  }
}

export async function buildBidXlmTx(
  sourcePublicKey: string,
  auctionId: number,
  amount: bigint
): Promise<string> {
  const server = getServer();
  const contract = new Contract(AUCTION_CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "bid_xlm",
        nativeToScVal(auctionId, { type: "u64" }),
        new Address(sourcePublicKey).toScVal(),
        nativeToScVal(amount, { type: "i128" })
      )
    )
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error("Transaction simulation failed");
  }
  const prepared = rpc.assembleTransaction(tx, sim).build();
  return prepared.toXDR();
}

export async function buildBidUsdcTx(
  sourcePublicKey: string,
  auctionId: number,
  amount: bigint
): Promise<string> {
  const server = getServer();
  const contract = new Contract(AUCTION_CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "bid_usdc",
        nativeToScVal(auctionId, { type: "u64" }),
        new Address(sourcePublicKey).toScVal(),
        nativeToScVal(amount, { type: "i128" })
      )
    )
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error("Transaction simulation failed");
  }
  const prepared = rpc.assembleTransaction(tx, sim).build();
  return prepared.toXDR();
}
