import { NextRequest, NextResponse } from "next/server";
import {
  buildSiteShimejiChatMessages,
  coerceSiteShimejiHistory,
  sanitizeSiteShimejiMessage,
} from "@/lib/site-shimeji-chat";
import { getRuntimeCoreSiteShimejiCatalog } from "@/lib/site-shimeji-runtime-core";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

type SupportedServerProvider = "site" | "openrouter";

function sanitizeShortKey(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
}

function sanitizeModel(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_MODEL;
  const cleaned = input.trim().slice(0, 120);
  return cleaned || DEFAULT_MODEL;
}

function parseServerProvider(input: unknown): SupportedServerProvider {
  return input === "openrouter" ? "openrouter" : "site";
}

async function resolvePromptContext(characterKey: string, personalityKey: string) {
  try {
    const catalog = await getRuntimeCoreSiteShimejiCatalog();
    const characterLabel = catalog.characters.find((entry) => entry.key === characterKey)?.label;
    const personality = catalog.personalities.find((entry) => entry.key === personalityKey);
    return {
      characterLabel,
      personalityLabel: personality?.label,
      personalityPrompt: personality?.prompt,
    };
  } catch {
    return {
      characterLabel: undefined,
      personalityLabel: undefined,
      personalityPrompt: undefined,
    };
  }
}

async function sendOpenRouterRequest(args: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  request: NextRequest;
}) {
  const referer =
    process.env.NEXT_PUBLIC_BASE_URL ||
    args.request.headers.get("origin") ||
    args.request.headers.get("referer") ||
    "https://shimeji.dev";

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "Shimeji AI Pets Site Shimeji",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.7,
      max_tokens: 250,
      messages: args.messages,
    }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    let payload: any = null;
    try {
      payload = await upstream.json();
    } catch {
      payload = null;
    }
    if (upstream.status === 402) {
      throw new Error("NO_CREDITS");
    }
    if (upstream.status === 429) {
      const errorCode = payload?.error?.code || payload?.error?.type;
      if (errorCode === "insufficient_quota") {
        throw new Error("NO_CREDITS");
      }
    }
    const details = payload ? JSON.stringify(payload).slice(0, 500) : "";
    const err = new Error("OPENROUTER_REQUEST_FAILED");
    (err as any).status = upstream.status;
    (err as any).details = details;
    throw err;
  }

  const json = await upstream.json().catch(() => null);
  const reply = json?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("INVALID_OPENROUTER_RESPONSE");
  }

  return reply.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = sanitizeSiteShimejiMessage((body as any)?.message);
    const history = coerceSiteShimejiHistory((body as any)?.history);

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const provider = parseServerProvider((body as any)?.provider);
    if (provider !== "site" && provider !== "openrouter") {
      return NextResponse.json({ error: "Unsupported provider for this endpoint" }, { status: 400 });
    }

    const providerConfig = ((body as any)?.providerConfig || {}) as Record<string, unknown>;
    const customOpenRouterKey =
      typeof providerConfig.openrouterApiKey === "string"
        ? providerConfig.openrouterApiKey.trim().slice(0, 600)
        : "";
    const customOpenRouterModel = sanitizeModel(providerConfig.openrouterModel);

    const apiKey =
      provider === "openrouter" ? customOpenRouterKey : process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            provider === "openrouter"
              ? "Missing OpenRouter API key"
              : "Site credits are not configured right now",
        },
        { status: provider === "openrouter" ? 400 : 500 },
      );
    }

    const characterKey = sanitizeShortKey((body as any)?.character);
    const personalityKey = sanitizeShortKey((body as any)?.personality);
    const promptContext = await resolvePromptContext(characterKey, personalityKey);

    const messages = buildSiteShimejiChatMessages({
      message,
      history,
      language: typeof (body as any)?.lang === "string" ? (body as any).lang : undefined,
      characterLabel: promptContext.characterLabel,
      personalityLabel: promptContext.personalityLabel,
      personalityPrompt: promptContext.personalityPrompt,
    });

    const reply = await sendOpenRouterRequest({
      apiKey,
      model: provider === "openrouter" ? customOpenRouterModel : DEFAULT_MODEL,
      messages,
      request,
    });

    return NextResponse.json({ reply, providerUsed: provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";

    if (message === "NO_CREDITS") {
      return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
    }

    if (message === "INVALID_OPENROUTER_RESPONSE") {
      return NextResponse.json({ error: "Invalid OpenRouter response" }, { status: 502 });
    }

    if (message === "OPENROUTER_REQUEST_FAILED") {
      return NextResponse.json(
        {
          error: "OpenRouter request failed",
          status: (error as any)?.status ?? 502,
          details: (error as any)?.details ?? "",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
