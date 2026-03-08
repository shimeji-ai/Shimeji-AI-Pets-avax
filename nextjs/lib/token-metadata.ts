import "server-only";

export type TokenMetadataPreview = {
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  metadataUrl: string | null;
};

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
    const response = await fetch(resolvedTokenUri, { cache: "force-cache" });
    if (!response.ok) {
      return { name: null, description: null, imageUrl: null, metadataUrl: resolvedTokenUri };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const imageRaw =
      typeof data.image === "string"
        ? data.image
        : typeof data.image_url === "string"
          ? data.image_url
          : null;

    return {
      name: typeof data.name === "string" ? data.name : null,
      description: typeof data.description === "string" ? data.description : null,
      imageUrl: resolveMediaUrl(imageRaw),
      metadataUrl: resolvedTokenUri,
    };
  } catch {
    return { name: null, description: null, imageUrl: null, metadataUrl: resolvedTokenUri };
  }
}

