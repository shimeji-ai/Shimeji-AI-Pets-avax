import { NextRequest, NextResponse } from "next/server";
import { claimOpenClawPairingCode } from "@/lib/site-shimeji-openclaw-pairing-store";

export const runtime = "nodejs";

type PairingClaimPayload = {
  code?: unknown;
  sessionTtlSeconds?: unknown;
};

function sanitizeCode(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function clampInt(input: unknown, fallback: number, min: number, max: number): number {
  const numeric =
    typeof input === "number" ? input : typeof input === "string" ? Number(input) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as PairingClaimPayload;
    const code = sanitizeCode(body.code);
    if (!code) {
      return NextResponse.json({ error: "OPENCLAW_PAIRING_INVALID_CODE" }, { status: 400 });
    }

    const sessionTtlSeconds = clampInt(
      body.sessionTtlSeconds,
      7 * 24 * 60 * 60,
      300,
      60 * 24 * 60 * 60,
    );

    const result = await claimOpenClawPairingCode({ code, sessionTtlSeconds });
    if (!result.ok) {
      if (result.reason === "expired_code") {
        return NextResponse.json({ error: "OPENCLAW_PAIRING_CODE_EXPIRED" }, { status: 410 });
      }
      if (result.reason === "max_claims_reached") {
        return NextResponse.json({ error: "OPENCLAW_PAIRING_CODE_USED" }, { status: 409 });
      }
      return NextResponse.json({ error: "OPENCLAW_PAIRING_INVALID_CODE" }, { status: 404 });
    }

    return NextResponse.json({
      sessionToken: result.sessionToken,
      sessionExpiresAt: result.sessionExpiresAt,
      agentName: result.agentName,
    });
  } catch {
    return NextResponse.json({ error: "OPENCLAW_PAIRING_CLAIM_FAILED" }, { status: 500 });
  }
}
