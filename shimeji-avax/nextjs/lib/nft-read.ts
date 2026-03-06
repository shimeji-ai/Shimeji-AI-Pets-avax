import "server-only";

import { getAddress } from "viem";
import { getPublicClient, getNftContract } from "@/lib/contracts";

export type NftTokenRecord = {
  tokenId: number;
  owner: string;
  tokenUri: string;
  isCommissionEgg: boolean;
};

export async function fetchNftTotalSupply(): Promise<number> {
  const client = getPublicClient();
  const contract = getNftContract();
  const total = await client.readContract({
    ...contract,
    functionName: "totalSupply",
  });
  return Number(total ?? 0n);
}

export async function fetchNftTokenById(tokenId: number): Promise<NftTokenRecord | null> {
  try {
    const client = getPublicClient();
    const contract = getNftContract();
    const [owner, tokenUri, isCommissionEgg] = await Promise.all([
      client.readContract({ ...contract, functionName: "ownerOf", args: [BigInt(tokenId)] }),
      client.readContract({ ...contract, functionName: "tokenURI", args: [BigInt(tokenId)] }),
      client.readContract({ ...contract, functionName: "isCommissionEgg", args: [BigInt(tokenId)] }),
    ]);

    return {
      tokenId,
      owner: getAddress(owner),
      tokenUri: String(tokenUri),
      isCommissionEgg: Boolean(isCommissionEgg),
    };
  } catch {
    return null;
  }
}

export async function fetchNftCreatorById(tokenId: number): Promise<string | null> {
  try {
    const client = getPublicClient();
    const contract = getNftContract();
    const creator = await client.readContract({
      ...contract,
      functionName: "creatorOf",
      args: [BigInt(tokenId)],
    });
    return getAddress(creator);
  } catch {
    return null;
  }
}

export async function fetchNftTokensByIds(tokenIds: number[]): Promise<NftTokenRecord[]> {
  const records = await Promise.all(tokenIds.map((tokenId) => fetchNftTokenById(tokenId)));
  return records.filter((record): record is NftTokenRecord => Boolean(record));
}

export async function fetchOwnedNftsByWallet(walletAddress: string, opts?: { totalCap?: number }): Promise<NftTokenRecord[]> {
  const owner = getAddress(walletAddress);
  const totalSupply = await fetchNftTotalSupply();
  const capped = Math.min(totalSupply, opts?.totalCap ?? 500);
  const items = await Promise.all(
    Array.from({ length: capped }, (_, index) => fetchNftTokenById(index)),
  );
  return items
    .filter((item): item is NftTokenRecord => Boolean(item) && item.owner.toLowerCase() === owner.toLowerCase())
    .sort((a, b) => a.tokenId - b.tokenId);
}
