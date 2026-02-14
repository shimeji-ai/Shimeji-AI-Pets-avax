import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  nativeToScVal,
  Address,
  SorobanRpc,
} from "@stellar/stellar-sdk";
import { AUCTION_CONTRACT_ID, getServer, NETWORK_PASSPHRASE } from "./contracts";

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
      return BigInt(parts.lo().low) + (BigInt(parts.lo().high) << 32n) +
        (BigInt(parts.hi().low) << 64n) + (BigInt(parts.hi().high) << 96n);
    }
    case "scvString":
      return val.str().toString();
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

export async function fetchActiveAuction(): Promise<{
  auction: AuctionInfo;
  highestBid: BidInfo | null;
  auctionId: number;
} | null> {
  const server = getServer();
  const contract = new Contract(AUCTION_CONTRACT_ID);

  try {
    // Get total auctions
    const totalResult = await server.simulateTransaction(
      new TransactionBuilder(
        await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"),
        { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call("total_auctions"))
        .setTimeout(30)
        .build()
    );

    if (SorobanRpc.Api.isSimulationError(totalResult)) return null;
    const total = Number(
      (totalResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval.u64().low ?? 0
    );
    if (total === 0) return null;

    const auctionId = total - 1;

    // Get auction info
    const auctionResult = await server.simulateTransaction(
      new TransactionBuilder(
        await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"),
        { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call("get_auction", nativeToScVal(auctionId, { type: "u64" })))
        .setTimeout(30)
        .build()
    );

    if (SorobanRpc.Api.isSimulationError(auctionResult)) return null;
    const auctionData = parseScVal(
      (auctionResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
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
        new TransactionBuilder(
          await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"),
          { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
        )
          .addOperation(contract.call("get_highest_bid", nativeToScVal(auctionId, { type: "u64" })))
          .setTimeout(30)
          .build()
      );

      if (!SorobanRpc.Api.isSimulationError(bidResult)) {
        const bidData = parseScVal(
          (bidResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
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

    return { auction, highestBid, auctionId };
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
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error("Transaction simulation failed");
  }
  const prepared = SorobanRpc.assembleTransaction(tx, sim).build();
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
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error("Transaction simulation failed");
  }
  const prepared = SorobanRpc.assembleTransaction(tx, sim).build();
  return prepared.toXDR();
}
