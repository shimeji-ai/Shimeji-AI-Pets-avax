export type SiteMochiChatRole = "user" | "assistant";

export type SiteMochiChatMessage = {
  role: SiteMochiChatRole;
  content: string;
};

export type SiteMochiPromptInput = {
  language?: string;
  characterLabel?: string;
  soulMd?: string;
  toolContext?: string;
};

const MAX_MESSAGE_CHARS = 2000;

export function sanitizeSiteMochiMessage(input: unknown): string {
  const s = typeof input === "string" ? input : "";
  return s.trim().slice(0, MAX_MESSAGE_CHARS);
}

export function coerceSiteMochiHistory(input: unknown): SiteMochiChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: SiteMochiChatMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const role = (item as any).role;
    const content = sanitizeSiteMochiMessage((item as any).content);
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content });
    }
  }
  return out.slice(-10);
}

export function buildSiteMochiSystemPrompt({
  language,
  characterLabel,
  soulMd,
  toolContext,
}: SiteMochiPromptInput = {}): string {
  const langHint =
    typeof language === "string" && language.toLowerCase().startsWith("es")
      ? "es"
      : "en";
  const selectedCharacter = characterLabel || "Mochi";
  const soulSection = soulMd?.trim()
    ? `Current soul.md:\n${soulMd.trim()}\n`
    : "";
  const toolSection = toolContext?.trim()
    ? `Available tool context:\n${toolContext.trim()}\n`
    : "";

  return `
You are Mochi, a tiny animated desktop/browser pet from the Mochi project.

Current website mochi setup:
- Character skin: ${selectedCharacter}
- Behavior source: soul.md
- Environment: website preview/chat on mochi.dev
- This website mochi does NOT have local terminal or WSL access.

Your job:
- Chat naturally and stay in character.
- Explain Mochi features when asked.
- Help users understand downloads, setup, and the auction page.
- Keep replies concise unless they ask for more detail.

Product facts:
- Mochi offers browser extensions and a desktop app.
- Pets can chat using OpenRouter, Ollama, or OpenClaw gateway configs.
- The website includes a limited free chat mode, and users can continue using their own provider settings.
- Custom NFT mochis are obtained through auctions on the /auction page.

Behavior:
- Be friendly, practical, and brief.
- If asked how to continue after free credits, tell them to open the gear icon and configure OpenRouter, Ollama, or OpenClaw.
- If asked about local system/WSL/terminal control on the website, clearly say it is not available in the website mochi.
- If tool context is present, use it for current web knowledge and cite the source domain in plain text when useful.
- Respond in the same language as the user. If unclear, prefer ${langHint === "es" ? "Spanish" : "English"}.

${soulSection}
${toolSection}`.trim();
}

export function buildSiteMochiChatMessages(args: {
  message: string;
  history?: SiteMochiChatMessage[];
  language?: string;
  characterLabel?: string;
  soulMd?: string;
  toolContext?: string;
}): Array<{ role: "system" | SiteMochiChatRole; content: string }> {
  const message = sanitizeSiteMochiMessage(args.message);
  const history = coerceSiteMochiHistory(args.history);
  return [
    {
      role: "system",
      content: buildSiteMochiSystemPrompt({
        language: args.language,
        characterLabel: args.characterLabel,
        soulMd: args.soulMd,
        toolContext: args.toolContext,
      }),
    },
    ...history,
    { role: "user", content: message },
  ];
}
