export type SiteShimejiChatRole = "user" | "assistant";

export type SiteShimejiChatMessage = {
  role: SiteShimejiChatRole;
  content: string;
};

export type SiteShimejiPromptInput = {
  language?: string;
  characterLabel?: string;
  personalityLabel?: string;
  personalityPrompt?: string;
};

const MAX_MESSAGE_CHARS = 2000;

export function sanitizeSiteShimejiMessage(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.trim().slice(0, MAX_MESSAGE_CHARS);
}

export function coerceSiteShimejiHistory(input: unknown): SiteShimejiChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: SiteShimejiChatMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const role = (item as any).role;
    const content = sanitizeSiteShimejiMessage((item as any).content);
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content });
    }
  }
  return out.slice(-10);
}

export function buildSiteShimejiSystemPrompt({
  language,
  characterLabel,
  personalityLabel,
  personalityPrompt,
}: SiteShimejiPromptInput = {}): string {
  const langHint =
    typeof language === "string" && language.toLowerCase().startsWith("es")
      ? "es"
      : "en";
  const selectedCharacter = characterLabel || "Shimeji";
  const selectedPersonality = personalityLabel || "Cozy";
  const personalitySection = personalityPrompt?.trim()
    ? `Selected personality (${selectedPersonality}):\n${personalityPrompt.trim()}\n`
    : "";

  return `
You are Shimeji, a tiny animated desktop/browser pet from the Shimeji AI Pets project.

Current website shimeji setup:
- Character skin: ${selectedCharacter}
- Personality preset: ${selectedPersonality}
- Environment: website preview/chat on shimeji.dev
- This website shimeji does NOT have local terminal or WSL access.

Your job:
- Chat naturally and stay in character.
- Explain Shimeji AI Pets features when asked.
- Help users understand downloads, setup, and the auction page.
- Keep replies concise unless they ask for more detail.

Product facts:
- Shimeji AI Pets offers browser extensions and a desktop app.
- Pets can chat using OpenRouter, Ollama, or OpenClaw gateway configs.
- The website includes a limited free chat mode, and users can continue using their own provider settings.
- Custom NFT shimejis are obtained through auctions on the /auction page.

Behavior:
- Be friendly, practical, and brief.
- If asked how to continue after free credits, tell them to open the gear icon and configure OpenRouter, Ollama, or OpenClaw.
- If asked about local system/WSL/terminal control on the website, clearly say it is not available in the website shimeji.
- Respond in the same language as the user. If unclear, prefer ${langHint === "es" ? "Spanish" : "English"}.

${personalitySection}`.trim();
}

export function buildSiteShimejiChatMessages(args: {
  message: string;
  history?: SiteShimejiChatMessage[];
  language?: string;
  characterLabel?: string;
  personalityLabel?: string;
  personalityPrompt?: string;
}): Array<{ role: "system" | SiteShimejiChatRole; content: string }> {
  const message = sanitizeSiteShimejiMessage(args.message);
  const history = coerceSiteShimejiHistory(args.history);
  return [
    {
      role: "system",
      content: buildSiteShimejiSystemPrompt({
        language: args.language,
        characterLabel: args.characterLabel,
        personalityLabel: args.personalityLabel,
        personalityPrompt: args.personalityPrompt,
      }),
    },
    ...history,
    { role: "user", content: message },
  ];
}

