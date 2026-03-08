import "server-only";

export type TokenMetadataPreview = {
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  metadataUrl: string | null;
};

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

function getIpfsPath(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path || null;
  }
  return null;
}

function buildGatewayUrls(raw: string): string[] {
  const ipfsPath = getIpfsPath(raw);
  if (!ipfsPath) {
    return [raw];
  }
  return IPFS_GATEWAYS.map((gateway) => `${gateway}${ipfsPath}`);
}

export function buildMediaProxyUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  const ipfsPath = getIpfsPath(value);
  if (!ipfsPath) {
    return resolveMediaUrl(value);
  }
  return `/api/ipfs?uri=${encodeURIComponent(`ipfs://${ipfsPath}`)}`;
}

export function resolveMediaUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path ? `https://ipfs.io/ipfs/${path}` : null;
  }
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return value;
}

export function isLikelyImageUrl(value: string | null | undefined) {
  if (!value) return false;
  return (
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(value)
  );
}

export async function fetchTokenMetadataPreview(tokenUri: string): Promise<TokenMetadataPreview> {
  const resolvedTokenUri = resolveMediaUrl(tokenUri);
  if (!resolvedTokenUri) {
    return { name: null, description: null, imageUrl: null, metadataUrl: null };
  }

  if (isLikelyImageUrl(resolvedTokenUri)) {
    return {
      name: null,
      description: null,
      imageUrl: resolvedTokenUri,
      metadataUrl: resolvedTokenUri,
    };
  }

  try {
    let data: Record<string, unknown> | null = null;
    for (const candidateUrl of buildGatewayUrls(resolvedTokenUri)) {
      const response = await fetch(candidateUrl, { cache: "force-cache" });
      if (!response.ok) continue;
      data = (await response.json()) as Record<string, unknown>;
      break;
    }
    if (!data) {
      return {
        name: null,
        description: null,
        imageUrl: null,
        metadataUrl: buildMediaProxyUrl(resolvedTokenUri),
      };
    }
    const imageRaw =
      typeof data.image === "string"
        ? data.image
        : typeof data.image_url === "string"
          ? data.image_url
          : null;

    return {
      name: typeof data.name === "string" ? data.name : null,
      description: typeof data.description === "string" ? data.description : null,
      imageUrl: buildMediaProxyUrl(imageRaw),
      metadataUrl: buildMediaProxyUrl(resolvedTokenUri),
    };
  } catch {
    return { name: null, description: null, imageUrl: null, metadataUrl: buildMediaProxyUrl(resolvedTokenUri) };
  }
}
