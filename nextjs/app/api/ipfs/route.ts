import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const rawUri = request.nextUrl.searchParams.get("uri");
  const ipfsPath = getIpfsPath(rawUri);

  if (!ipfsPath) {
    return NextResponse.json({ error: "Expected an ipfs:// URI." }, { status: 400 });
  }

  for (const gateway of IPFS_GATEWAYS) {
    const target = `${gateway}${ipfsPath}`;
    try {
      const upstream = await fetch(target, { cache: "force-cache" });
      if (!upstream.ok || !upstream.body) continue;

      const headers = new Headers();
      const contentType = upstream.headers.get("content-type");
      const contentLength = upstream.headers.get("content-length");
      if (contentType) headers.set("content-type", contentType);
      if (contentLength) headers.set("content-length", contentLength);
      headers.set("cache-control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

      return new NextResponse(upstream.body, {
        status: 200,
        headers,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Unable to fetch IPFS asset." }, { status: 502 });
}

