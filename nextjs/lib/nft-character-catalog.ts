import "server-only";

import { fetchOwnedEditionsByWallet, fetchOwnedNftsByWallet } from "@/lib/nft-read";

export type NftCharacterCatalogEntry = {
  id: string;
  name: string;
  tokenCount: number;
  tokenIds: number[];
  imageUrl: string | null;
  spritesBaseUri: string | null;
  tokenUri: string | null;
  isCommissionEgg: boolean;
  tokenStandard: "ERC721" | "ERC1155";
};

type MetadataAttribute = {
  trait_type?: unknown;
  trait?: unknown;
  name?: unknown;
  value?: unknown;
};

function resolveMediaUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path ? `https://ipfs.io/ipfs/${path}` : null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return null;
}

function cleanExplicitName(raw: string): string {
  return raw
    .replace(/^Mochi\s+Placeholder\s*[-–]\s*/i, "")
    .trim();
}

function titleCaseCharacterId(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCharacterId(raw: string): string {
  const cleaned = raw
    .replace(/^mochi[-_\s]+placeholder[-_\s]+/i, "")
    .trim();
  return cleaned || raw;
}

function parseCharacterIdFromMetadata(metadata: Record<string, unknown>, isCommissionEgg: boolean) {
  const attributes = Array.isArray(metadata.attributes) ? metadata.attributes : [];
  for (const attribute of attributes) {
    if (!attribute || typeof attribute !== "object") continue;
    const item = attribute as MetadataAttribute;
    const traitKey = String(item.trait_type ?? item.trait ?? item.name ?? "").trim().toLowerCase();
    if (traitKey !== "character") continue;
    const value = String(item.value ?? "").trim().toLowerCase();
    if (value) return normalizeCharacterId(value);
  }
  return isCommissionEgg ? "egg" : "";
}

async function fetchJsonObject(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildOwnedNftCharacterCatalog(walletAddress: string): Promise<NftCharacterCatalogEntry[]> {
  const [owned, ownedEditions] = await Promise.all([
    fetchOwnedNftsByWallet(walletAddress, { totalCap: 1000 }),
    fetchOwnedEditionsByWallet(walletAddress, { totalCap: 250 }),
  ]);
  const metadataByTokenId = new Map<number, Record<string, unknown> | null>();
  const metadataByEditionId = new Map<number, Record<string, unknown> | null>();

  await Promise.all(
    owned.map(async (token) => {
      const resolvedUri = resolveMediaUrl(token.tokenUri);
      if (!resolvedUri) {
        metadataByTokenId.set(token.tokenId, null);
        return;
      }
      metadataByTokenId.set(token.tokenId, await fetchJsonObject(resolvedUri));
    }),
  );

  await Promise.all(
    ownedEditions.map(async (edition) => {
      const resolvedUri = resolveMediaUrl(edition.tokenUri);
      if (!resolvedUri) {
        metadataByEditionId.set(edition.editionId, null);
        return;
      }
      metadataByEditionId.set(edition.editionId, await fetchJsonObject(resolvedUri));
    }),
  );

  const byCharacter = new Map<string, NftCharacterCatalogEntry>();
  for (const token of owned) {
    const metadata = metadataByTokenId.get(token.tokenId) ?? null;
    const characterId = parseCharacterIdFromMetadata(metadata || {}, token.isCommissionEgg);
    if (!characterId) continue;

    const imageUrl = resolveMediaUrl(typeof metadata?.image === "string" ? metadata.image : null);
    const mochiProps =
      metadata?.properties && typeof metadata.properties === "object" && !Array.isArray(metadata.properties)
        ? (metadata.properties as Record<string, unknown>).mochi
        : null;
    const spritesBaseUri =
      mochiProps && typeof mochiProps === "object" && !Array.isArray(mochiProps)
        ? resolveMediaUrl(String((mochiProps as Record<string, unknown>).spritesBaseUri || ""))
        : null;
    const explicitName = cleanExplicitName(String(metadata?.name || "").trim());

    const existing = byCharacter.get(characterId);
    if (existing) {
      existing.tokenCount += 1;
      existing.tokenIds.push(token.tokenId);
      if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
      if (!existing.spritesBaseUri && spritesBaseUri) existing.spritesBaseUri = spritesBaseUri;
      if (!existing.tokenUri) existing.tokenUri = token.tokenUri;
      existing.isCommissionEgg = existing.isCommissionEgg || token.isCommissionEgg;
      continue;
    }

    byCharacter.set(characterId, {
      id: characterId,
      name: (explicitName && explicitName.toLowerCase() !== characterId) ? explicitName : titleCaseCharacterId(characterId),
      tokenCount: 1,
      tokenIds: [token.tokenId],
      imageUrl,
      spritesBaseUri,
      tokenUri: token.tokenUri,
      isCommissionEgg: token.isCommissionEgg,
      tokenStandard: "ERC721",
    });
  }

  for (const edition of ownedEditions) {
    const metadata = metadataByEditionId.get(edition.editionId) ?? null;
    const characterId = parseCharacterIdFromMetadata(metadata || {}, false);
    if (!characterId) continue;

    const imageUrl = resolveMediaUrl(typeof metadata?.image === "string" ? metadata.image : null);
    const mochiProps =
      metadata?.properties && typeof metadata.properties === "object" && !Array.isArray(metadata.properties)
        ? (metadata.properties as Record<string, unknown>).mochi
        : null;
    const spritesBaseUri =
      mochiProps && typeof mochiProps === "object" && !Array.isArray(mochiProps)
        ? resolveMediaUrl(String((mochiProps as Record<string, unknown>).spritesBaseUri || ""))
        : null;
    const explicitName = cleanExplicitName(String(metadata?.name || "").trim());

    const existing = byCharacter.get(characterId);
    if (existing) {
      existing.tokenCount += edition.balance;
      if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
      if (!existing.spritesBaseUri && spritesBaseUri) existing.spritesBaseUri = spritesBaseUri;
      if (!existing.tokenUri) existing.tokenUri = edition.tokenUri;
      if (existing.tokenStandard !== "ERC721") existing.tokenStandard = "ERC1155";
      continue;
    }

    byCharacter.set(characterId, {
      id: characterId,
      name: (explicitName && explicitName.toLowerCase() !== characterId) ? explicitName : titleCaseCharacterId(characterId),
      tokenCount: edition.balance,
      tokenIds: [],
      imageUrl,
      spritesBaseUri,
      tokenUri: edition.tokenUri,
      isCommissionEgg: false,
      tokenStandard: "ERC1155",
    });
  }

  return Array.from(byCharacter.values()).sort((a, b) => a.id.localeCompare(b.id));
}
