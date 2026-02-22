import { NextResponse } from "next/server";
import {
  getRuntimeCorePathsForDiagnostics,
  getRuntimeCoreSiteShimejiCatalog,
} from "@/lib/site-shimeji-runtime-core";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = await getRuntimeCoreSiteShimejiCatalog();
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    });
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

