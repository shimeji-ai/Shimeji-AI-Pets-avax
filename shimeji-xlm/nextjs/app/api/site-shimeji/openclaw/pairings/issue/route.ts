import { NextRequest, NextResponse } from "next/server";
import { createOpenClawPairingCode } from "@/lib/site-shimeji-openclaw-pairing-store";
import { sanitizeOpenClawAgentName } from "@/lib/site-shimeji-openclaw-protocol";

export const runtime = "nodejs";

type IssuePayload = {
  agentName?: unknown;
};

function sanitizeString(input: unknown, max = 1600): string {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

function safeTokenCompare(input: string, expected: string): boolean {
  const max = Math.max(input.length, expected.length);
  let diff = input.length ^ expected.length;
  for (let i = 0; i < max; i += 1) {
    const a = i < input.length ? input.charCodeAt(i) : 0;
    const b = i < expected.length ? expected.charCodeAt(i) : 0;
    diff |= a ^ b;
  }
  return diff === 0;
}

function isIssuerAuthorized(request: NextRequest): boolean {
  const expected = sanitizeString(process.env.OPENCLAW_PAIRING_ISSUER_TOKEN, 300);
  if (!expected) return false;

  const bearer = request.headers.get("authorization") || "";
  const bearerToken = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  const headerToken = sanitizeString(request.headers.get("x-openclaw-pairing-issuer-token"), 300);
  const incoming = headerToken || bearerToken;
  if (!incoming) return false;
  return safeTokenCompare(incoming, expected);
}

export async function POST(request: NextRequest) {
  try {
    if (!isIssuerAuthorized(request)) {
      return NextResponse.json({ error: "OPENCLAW_PAIRING_UNAUTHORIZED" }, { status: 401 });
    }

    const defaultGatewayUrl = sanitizeString(process.env.OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL, 500);
    const defaultGatewayToken = sanitizeString(process.env.OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN, 2000);
    const defaultAgentName = sanitizeOpenClawAgentName(
      process.env.OPENCLAW_PAIRING_DEFAULT_AGENT_NAME,
      "web-shimeji-1",
    );

    if (!defaultGatewayUrl || !defaultGatewayToken) {
      return NextResponse.json(
        {
          error: "OPENCLAW_PAIRING_GATEWAY_REQUIRED",
          message:
            "OPENCLAW_PAIRING_DEFAULT_GATEWAY_URL and OPENCLAW_PAIRING_DEFAULT_GATEWAY_TOKEN are required for /pairings/issue.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as IssuePayload;
    const agentName = sanitizeOpenClawAgentName(body.agentName, defaultAgentName);

    const created = await createOpenClawPairingCode({
      gatewayUrl: defaultGatewayUrl,
      gatewayToken: defaultGatewayToken,
      agentName,
      ttlSeconds: 5 * 60,
      maxClaims: 1,
    });

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
      return NextResponse.json({ error: "OPENCLAW_INVALID_URL" }, { status: 500 });
    }
    if (message.startsWith("OPENCLAW_MISSING_TOKEN")) {
      return NextResponse.json({ error: "OPENCLAW_MISSING_TOKEN" }, { status: 500 });
    }
    return NextResponse.json({ error: "OPENCLAW_PAIRING_ISSUE_FAILED" }, { status: 500 });
  }
}
