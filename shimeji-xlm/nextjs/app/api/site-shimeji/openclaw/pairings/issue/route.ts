import { NextRequest, NextResponse } from "next/server";
import { createOpenClawPairingCodeFromRequest } from "@/lib/site-shimeji-openclaw-pairing-store";
import { sanitizeOpenClawAgentName } from "@/lib/site-shimeji-openclaw-protocol";

export const runtime = "nodejs";

type IssuePayload = {
  requestCode?: unknown;
  gatewayUrl?: unknown;
  gatewayToken?: unknown;
  agentName?: unknown;
};

function sanitizeString(input: unknown, max = 1600): string {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as IssuePayload;
    const requestCode = sanitizeString(body.requestCode, 32);
    const gatewayUrl = sanitizeString(body.gatewayUrl, 500);
    const gatewayToken = sanitizeString(body.gatewayToken, 2000);
    const agentName = sanitizeOpenClawAgentName(body.agentName, "web-shimeji-1");

    if (!requestCode) {
      return NextResponse.json({ error: "OPENCLAW_PAIRING_REQUEST_REQUIRED" }, { status: 400 });
    }
    if (!gatewayUrl || !gatewayToken) {
      return NextResponse.json({ error: "OPENCLAW_PAIRING_GATEWAY_REQUIRED" }, { status: 400 });
    }

    const created = await createOpenClawPairingCodeFromRequest({
      requestCode,
      gatewayUrl,
      gatewayToken,
      agentName,
      ttlSeconds: 5 * 60,
      maxClaims: 1,
    });

    if (!created.ok) {
      if (created.reason === "expired_request_code") {
        return NextResponse.json({ error: "OPENCLAW_PAIRING_REQUEST_EXPIRED" }, { status: 410 });
      }
      return NextResponse.json({ error: "OPENCLAW_PAIRING_REQUEST_INVALID" }, { status: 404 });
    }

    return NextResponse.json({
      pairingCode: created.code,
      expiresAt: created.expiresAt,
      agentName: created.agentName,
      maxClaims: 1,
      ttlSeconds: 5 * 60,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OPENCLAW_PAIRING_ISSUE_FAILED";
    if (message.startsWith("OPENCLAW_INVALID_URL:")) {
      return NextResponse.json({ error: "OPENCLAW_INVALID_URL" }, { status: 400 });
    }
    if (message.startsWith("OPENCLAW_MISSING_TOKEN")) {
      return NextResponse.json({ error: "OPENCLAW_MISSING_TOKEN" }, { status: 400 });
    }
    return NextResponse.json({ error: "OPENCLAW_PAIRING_ISSUE_FAILED" }, { status: 500 });
  }
}
