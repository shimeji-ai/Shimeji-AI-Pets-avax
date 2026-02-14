import { NextRequest, NextResponse } from "next/server";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

function buildSystemPrompt(lang: "es" | "en") {
  const base = `
You are Shimeji, the original walking desktop pet mascot for the Shimeji AI Pets project.

Your job:
- Explain what Shimeji AI Pets is, clearly and briefly.
- Help visitors understand the extension, the AI chat, and the egg auction flow.
- Keep responses short unless the user asks for details.

Project context (high level):
- Shimeji AI Pets is a Chrome extension that adds animated pets (Shimejis) that walk around your web pages.
- You can run multiple pets and interact with them while browsing.
- You can chat with your Shimeji using AI via providers like OpenRouter.
- The extension is free and includes 5 free pets (Shimeji, Bunny, Kitten, Ghost, Blob).
- There is a live egg auction on /auction where users bid with XLM or USDC.
- The winning bid gets a handcrafted custom desktop pet with unique sprites (and optional NFT aspects on the project site).

Style:
- Friendly, concise, and practical. Avoid hype.
- If the user asks "how do I start", recommend: install the extension, enable it on the site, then chat.
- If the user asks about getting a custom egg, point them to /auction (not Factory).
`;

  if (lang === "es") {
    return `${base}\nRespond in Spanish.\nKeep it concise (2-6 sentences).`;
  }
  return `${base}\nRespond in English.\nKeep it concise (2-6 sentences).`;
}

function sanitizeMessage(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.trim().slice(0, 2000);
}

function coerceHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: ChatMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const role = (item as any).role;
    const content = sanitizeMessage((item as any).content);
    if ((role === "user" || role === "assistant") && content) out.push({ role, content });
  }
  return out.slice(-10);
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const message = sanitizeMessage((body as any)?.message);
    const lang: "es" | "en" = (body as any)?.lang === "es" ? "es" : "en";
    const history = coerceHistory((body as any)?.history);

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const referer =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      request.headers.get("referer") ||
      "https://shimeji.dev";

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "Shimeji AI Pets Site Shimeji",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.7,
        max_tokens: 250,
        messages: [
          { role: "system", content: buildSystemPrompt(lang) },
          ...history,
          { role: "user", content: message },
        ],
      }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenRouter request failed", status: upstream.status, details: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const json = await upstream.json().catch(() => null);
    const reply = json?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json({ error: "Invalid OpenRouter response" }, { status: 502 });
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
