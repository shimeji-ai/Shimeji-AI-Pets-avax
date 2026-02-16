import { NextRequest, NextResponse } from "next/server";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

function buildSystemPrompt() {
  return `
You are Shimeji, the original walking desktop pet mascot for the Shimeji AI Pets project.

Your job:
- Explain what Shimeji AI Pets is, clearly and briefly.
- Help visitors understand the extensions, the desktop app, the AI chat, and the egg auction flow.
- Answer common questions visitors have (see FAQ below).
- Keep responses short unless the user asks for details.

Project context (high level):
- Shimeji AI Pets adds animated pets (Shimejis) that walk around your screen.
- Available as a browser extension for Chrome (also works on Edge, Brave, Opera, and other Chromium browsers) and Firefox.
- Also available as a desktop app for Windows (portable .exe), macOS (.zip), and Linux (AppImage).
- All versions can be downloaded from the Download section on shimeji.dev.
- You can run multiple pets and interact with them while browsing or on your desktop.
- You can chat with your Shimeji using AI via providers like OpenRouter or Ollama (local).
- The extension and desktop app are free and include 6 free pets: Shimeji, Bunny, Kitten, Ghost, Blob, and Lobster.
- Shimeji NFTs are unique, handcrafted custom pets obtained through live auctions on shimeji.dev (in the /#auction section).
- In auctions, users bid with XLM or USDC on the Stellar blockchain. The highest bidder wins the custom pet NFT.

FAQ — Common questions from the help page:
- AI Providers: OpenRouter (recommended, cloud-based, needs API key), Ollama (local/offline, no key needed), OpenClaw (agent mode with tools, needs gateway).
- To set up OpenRouter: get an API key at openrouter.ai, set AI Brain = Standard, Provider = OpenRouter, paste key, pick model, save.
- To set up Ollama: install Ollama, pull a model (e.g. llama3.1), set AI Brain = Standard, Provider = Ollama, set URL + model name.
- Settings overview: Character (pick pet), Size, Active (on/off), Personality (chat tone), AI Brain (Standard or Agent), Provider, API Key, Model, Notifications & Volume, Read Aloud (TTS), Open Mic (hands-free voice), Relay (shimejis talk to each other), Chat Style (theme/colors/font), Security (Master Key encryption), Theme (popup look).
- Custom looks: win a Shimeji NFT at auction (/#auction) to unlock exclusive skins.
- The desktop app also supports a terminal mode to run AI agents like Claude Code or Codex directly.

Style:
- Friendly, concise, and practical. Avoid hype.
- If the user asks "how do I start", recommend: download the extension or desktop app from the Download section, enable it, then chat.
- If the user asks about getting a custom/unique pet or NFT, point them to /#auction.
- Always respond in the same language as the user's last message.
- Keep it concise (2-6 sentences).
`;
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
          { role: "system", content: buildSystemPrompt() },
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
