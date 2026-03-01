import { NextRequest, NextResponse } from "next/server";
import {
  resolveOpenClawPairingSession,
} from "@/lib/site-shimeji-openclaw-pairing-store";
import {
  coerceOpenClawChatMessages,
  type OpenClawChatRequestMessage,
} from "@/lib/site-shimeji-openclaw-protocol";
import { sendOpenClawServerChat } from "@/lib/site-shimeji-openclaw-server";

export const runtime = "nodejs";

type ChatPayload = {
  sessionToken?: unknown;
  messages?: unknown;
};

function sanitizeSessionToken(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, 2048);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ChatPayload;
    const sessionToken = sanitizeSessionToken(body.sessionToken);
    if (!sessionToken) {
      return NextResponse.json({ error: "OPENCLAW_PAIRING_REQUIRED" }, { status: 400 });
    }

    const messages = coerceOpenClawChatMessages(body.messages);
    if (!messages.length) {
      return NextResponse.json({ error: "OPENCLAW_EMPTY_MESSAGE" }, { status: 400 });
    }

    const hasUserMessage = messages.some((entry: OpenClawChatRequestMessage) => entry.role === "user");
    if (!hasUserMessage) {
      return NextResponse.json({ error: "OPENCLAW_EMPTY_MESSAGE" }, { status: 400 });
    }

    const session = await resolveOpenClawPairingSession(sessionToken);
    if (!session.ok) {
      if (session.reason === "expired_session") {
        return NextResponse.json({ error: "OPENCLAW_PAIRING_EXPIRED" }, { status: 410 });
      }
      return NextResponse.json({ error: "OPENCLAW_PAIRING_INVALID" }, { status: 401 });
    }

    const reply = await sendOpenClawServerChat({
      messages,
      gatewayUrl: session.gatewayUrl,
      gatewayToken: session.gatewayToken,
      agentName: session.agentName,
    });

    return NextResponse.json(
      {
        reply,
        agentName: session.agentName,
        sessionExpiresAt: session.sessionExpiresAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "OPENCLAW_RELAY_FAILED";

    if (message.startsWith("OPENCLAW_INVALID_URL:")) {
      return NextResponse.json({ error: "OPENCLAW_INVALID_URL" }, { status: 400 });
    }
    if (message.startsWith("OPENCLAW_MISSING_TOKEN")) {
      return NextResponse.json({ error: "OPENCLAW_MISSING_TOKEN" }, { status: 400 });
    }
    if (message.startsWith("OPENCLAW_WEBSOCKET_UNAVAILABLE")) {
      return NextResponse.json({ error: "OPENCLAW_WEBSOCKET_UNAVAILABLE" }, { status: 500 });
    }
    if (message.startsWith("OPENCLAW_EMPTY_MESSAGE")) {
      return NextResponse.json({ error: "OPENCLAW_EMPTY_MESSAGE" }, { status: 400 });
    }
    if (message.startsWith("OPENCLAW_AUTH_FAILED:")) {
      return NextResponse.json({ error: "OPENCLAW_AUTH_FAILED" }, { status: 502 });
    }
    if (
      message.startsWith("OPENCLAW_CONNECT:") ||
      message.startsWith("OPENCLAW_TIMEOUT:") ||
      message.startsWith("OPENCLAW_IDLE_TIMEOUT:")
    ) {
      return NextResponse.json({ error: "OPENCLAW_CONNECT" }, { status: 504 });
    }
    if (message.startsWith("OPENCLAW_ERROR:")) {
      return NextResponse.json({ error: "OPENCLAW_ERROR" }, { status: 502 });
    }
    if (message.startsWith("OPENCLAW_CLOSED:")) {
      return NextResponse.json({ error: "OPENCLAW_CLOSED" }, { status: 502 });
    }
    if (message.startsWith("OPENCLAW_INCOMPLETE_CLOSE:")) {
      return NextResponse.json({ error: "OPENCLAW_INCOMPLETE_CLOSE" }, { status: 502 });
    }
    if (message.startsWith("OPENCLAW_EMPTY_RESPONSE")) {
      return NextResponse.json({ error: "OPENCLAW_EMPTY_RESPONSE" }, { status: 502 });
    }

    return NextResponse.json(
      { error: "OPENCLAW_RELAY_FAILED", errorDetail: message.slice(0, 240) },
      { status: 500 },
    );
  }
}
