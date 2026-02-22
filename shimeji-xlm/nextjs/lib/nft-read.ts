import "server-only";

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { getServer, NETWORK_PASSPHRASE, NFT_CONTRACT_ID } from "@/lib/contracts";

const READONLY_SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export type NftTokenRecord = {
  tokenId: number;
  owner: string;
  tokenUri: string;
  isCommissionEgg: boolean;
};

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

function parseScVal(val: xdr.ScVal): unknown {
  switch (val.switch().name) {
    case "scvU64":
      return val.u64().low + val.u64().high * 2 ** 32;
    case "scvBool":
      return val.b();
    case "scvString":
      return val.str().toString();
    case "scvSymbol":
      return val.sym().toString();
    case "scvAddress":
      return Address.fromScVal(val).toString();
    case "scvI128": {
      const parts = val.i128();
      const lo = BigInt(parts.lo().low >>> 0) + (BigInt(parts.lo().high >>> 0) << BigInt(32));
      const hi = BigInt(parts.hi().low >>> 0) + (BigInt(parts.hi().high >>> 0) << BigInt(32));
      return lo + (hi << BigInt(64));
    }
    case "scvMap": {
      const map: Record<string, unknown> = {};
      for (const entry of val.map() ?? []) {
        map[String(parseScVal(entry.key()))] = parseScVal(entry.val());
      }
      return map;
    }
    case "scvVec":
      return (val.vec() ?? []).map(parseScVal);
    default:
      return null;
  }
}

async function simulateRead(method: string, ...args: xdr.ScVal[]): Promise<unknown> {
  if (!NFT_CONTRACT_ID) return null;
  const contract = new Contract(NFT_CONTRACT_ID);
  const server = getServer();
  const result = await server.simulateTransaction(buildReadOnlyTx(contract.call(method, ...args)));
  if (rpc.Api.isSimulationError(result)) {
    return null;
  }
  const success = result as rpc.Api.SimulateTransactionSuccessResponse;
  if (!success.result?.retval) return null;
  return parseScVal(success.result.retval);
}

export async function fetchNftTotalSupply(): Promise<number> {
  const raw = await simulateRead("total_supply");
  const total = Number(raw ?? 0);
  if (!Number.isFinite(total) || total < 0) return 0;
  return total;
}

export async function fetchNftTokenById(tokenId: number): Promise<NftTokenRecord | null> {
  if (!Number.isInteger(tokenId) || tokenId < 0) return null;

  const [owner, tokenUri, isCommissionEgg] = await Promise.all([
    simulateRead("owner_of", nativeToScVal(tokenId, { type: "u64" })),
    simulateRead("token_uri", nativeToScVal(tokenId, { type: "u64" })),
    simulateRead("is_commission_egg", nativeToScVal(tokenId, { type: "u64" })),
  ]);

  if (typeof owner !== "string" || typeof tokenUri !== "string") {
    return null;
  }

  return {
    tokenId,
    owner,
    tokenUri,
    isCommissionEgg: Boolean(isCommissionEgg),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) break;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
  return results;
}

export async function fetchNftTokensByIds(tokenIds: number[]): Promise<NftTokenRecord[]> {
  const uniqueIds = Array.from(
    new Set(
      tokenIds.filter((tokenId) => Number.isInteger(tokenId) && tokenId >= 0),
    ),
  );
  const records = await mapWithConcurrency(uniqueIds, 6, async (tokenId) => {
    try {
      return await fetchNftTokenById(tokenId);
    } catch {
      return null;
    }
  });
  return records.filter((record): record is NftTokenRecord => Boolean(record));
}

export async function fetchOwnedNftsByWallet(
  walletAddress: string,
  opts?: { totalCap?: number },
): Promise<NftTokenRecord[]> {
  if (!walletAddress) return [];

  const totalSupply = await fetchNftTotalSupply();
  const cappedTotal = Math.max(0, Math.min(totalSupply, opts?.totalCap ?? 500));
  if (cappedTotal === 0) return [];

  const tokenIds = Array.from({ length: cappedTotal }, (_, index) => index);
  const owners = await mapWithConcurrency(tokenIds, 10, async (tokenId) => {
    try {
      const owner = await simulateRead("owner_of", nativeToScVal(tokenId, { type: "u64" }));
      return typeof owner === "string" ? { tokenId, owner } : null;
    } catch {
      return null;
    }
  });

  const ownedIds = owners
    .filter(
      (entry): entry is { tokenId: number; owner: string } =>
        entry !== null && entry.owner === walletAddress,
    )
    .map((entry) => entry.tokenId);

  if (ownedIds.length === 0) return [];

  const ownedTokens = await fetchNftTokensByIds(ownedIds);
  return ownedTokens.sort((a, b) => a.tokenId - b.tokenId);
}
