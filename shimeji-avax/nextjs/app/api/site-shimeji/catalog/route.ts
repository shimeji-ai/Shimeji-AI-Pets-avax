import { NextRequest, NextResponse } from "next/server";
import {
  getRuntimeCorePathsForDiagnostics,
  getRuntimeCoreSiteShimejiCatalog,
} from "@/lib/site-shimeji-runtime-core";
import { buildOwnedNftCharacterCatalog } from "@/lib/nft-character-catalog";
import { isValidWalletAddress } from "@/lib/artist-profiles-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const wallet = String(request.nextUrl.searchParams.get("wallet") || "").trim();
    const catalog = await getRuntimeCoreSiteShimejiCatalog();
    let characters = [...catalog.characters];

    if (wallet && isValidWalletAddress(wallet)) {
      const ownedCharacters = await buildOwnedNftCharacterCatalog(wallet);
      const merged = new Map(characters.map((entry) => [entry.key, entry]));
      ownedCharacters.forEach((entry) => {
        merged.set(entry.id, {
          key: entry.id,
          label: entry.name,
          iconUrl:
            entry.imageUrl ||
            `/api/site-shimeji/sprite/${encodeURIComponent(entry.id)}/icon.png`,
          spritesBaseUri: entry.spritesBaseUri ?? null,
        });
      });
      characters = Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
    }

    return NextResponse.json(
      {
        ...catalog,
        characters,
      },
      {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runtime-core catalog";
    return NextResponse.json(
      {
        error: message,
        paths: getRuntimeCorePathsForDiagnostics(),
      },
      { status: 500 },
    );
  }
}
