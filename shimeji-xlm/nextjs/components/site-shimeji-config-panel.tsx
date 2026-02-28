"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";
import { getSiteShimejiPersonalityDisplayLabel } from "@/lib/site-shimeji-personality-labels";
import {
  SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX,
  SITE_SHIMEJI_CHAT_FONT_SIZE_MAP,
  SITE_SHIMEJI_CHAT_THEMES,
  SITE_SHIMEJI_CHAT_WIDTH_MAP,
  pickRandomSiteShimejiChatTheme,
} from "@/lib/site-shimeji-chat-ui";

type ConfigPanelTab = "chat" | "appearance" | "mascot" | "sound";

type OpenRouterModelOption = {
  value: string;
  labelEn: string;
  labelEs: string;
  disabled?: boolean;
};

const OPENROUTER_MODEL_OPTIONS: readonly OpenRouterModelOption[] = [
  { value: "random", labelEn: "Random", labelEs: "Aleatorio" },
  { value: "google/gemini-2.0-flash-001", labelEn: "Gemini 2.0 Flash", labelEs: "Gemini 2.0 Flash" },
  {
    value: "moonshotai/kimi-k2.5",
    labelEn: "Kimi K2.5 (disabled)",
    labelEs: "Kimi K2.5 (deshabilitado)",
    disabled: true,
  },
  { value: "anthropic/claude-sonnet-4", labelEn: "Claude Sonnet 4", labelEs: "Claude Sonnet 4" },
  { value: "meta-llama/llama-4-maverick", labelEn: "Llama 4 Maverick", labelEs: "Llama 4 Maverick" },
  { value: "deepseek/deepseek-chat-v3-0324", labelEn: "DeepSeek Chat v3", labelEs: "DeepSeek Chat v3" },
  { value: "mistralai/mistral-large-2411", labelEn: "Mistral Large", labelEs: "Mistral Large" },
];

function ChatAppearanceFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();

  const matchedPreset = useMemo(
    () =>
      SITE_SHIMEJI_CHAT_THEMES.find(
        (theme) =>
          theme.theme.toLowerCase() === config.chatThemeColor.toLowerCase() &&
          theme.bg.toLowerCase() === config.chatBgColor.toLowerCase() &&
          theme.bubble === config.chatBubbleStyle,
      ) ?? null,
    [config.chatBgColor, config.chatBubbleStyle, config.chatThemeColor],
  );

  const activeThemeChip = config.chatThemePreset === "random" ? "random" : matchedPreset?.id ?? "custom";
  const hasManualSize =
    config.chatWidthPx !== null || config.chatHeightPx !== SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX;

  function applyThemePreset(presetId: string) {
    if (presetId === "custom") {
      updateConfig({ chatThemePreset: "custom" });
      return;
    }

    if (presetId === "random") {
      const randomPreset = pickRandomSiteShimejiChatTheme();
      updateConfig({
        chatThemePreset: "random",
        chatThemeColor: randomPreset.theme,
        chatBgColor: randomPreset.bg,
        chatBubbleStyle: randomPreset.bubble,
      });
      return;
    }

    const preset = SITE_SHIMEJI_CHAT_THEMES.find((theme) => theme.id === presetId);
    if (!preset) return;
    updateConfig({
      chatThemePreset: preset.id,
      chatThemeColor: preset.theme,
      chatBgColor: preset.bg,
      chatBubbleStyle: preset.bubble,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        {isSpanish
          ? "La burbuja puede redimensionarse con el mouse desde los bordes (izquierdo/derecho y superior) cuando está abierta."
          : "The chat bubble can be resized with the mouse from its edges (left/right and top) while it is open."}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Tema del chat" : "Chat theme"}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyThemePreset("custom")}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold ${
              activeThemeChip === "custom"
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
            }`}
            title={isSpanish ? "Tema personalizado" : "Custom theme"}
          >
            🎨
          </button>
          <button
            type="button"
            onClick={() => applyThemePreset("random")}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold ${
              activeThemeChip === "random"
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
            }`}
            title={isSpanish ? "Tema aleatorio" : "Random theme"}
          >
            🎲
          </button>

          {SITE_SHIMEJI_CHAT_THEMES.map((theme) => {
            const isActive = activeThemeChip === theme.id;
            const title = isSpanish ? theme.labelEs : theme.labelEn;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyThemePreset(theme.id)}
                className={`relative h-9 w-9 rounded-full border p-1 transition ${
                  isActive
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                title={title}
                aria-label={title}
              >
                <span
                  className="flex h-full w-full items-center justify-center rounded-full border border-black/15"
                  style={{ background: theme.bg }}
                >
                  <span
                    className="block h-1/2 w-1/2 rounded-full border border-black/15"
                    style={{ background: theme.theme }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Color acento" : "Accent color"}
            </span>
            <input
              type="color"
              value={config.chatThemeColor}
              onChange={(event) =>
                updateConfig({
                  chatThemePreset: "custom",
                  chatThemeColor: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-black/30 p-1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Color fondo" : "Background color"}
            </span>
            <input
              type="color"
              value={config.chatBgColor}
              onChange={(event) =>
                updateConfig({
                  chatThemePreset: "custom",
                  chatBgColor: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-black/30 p-1"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Estilo de burbuja" : "Bubble style"}
          </span>
          <select
            value={config.chatBubbleStyle}
            onChange={(event) =>
              updateConfig({
                chatThemePreset: "custom",
                chatBubbleStyle: event.target.value as "glass" | "solid" | "dark",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="glass">{isSpanish ? "Glass (transparente)" : "Glass (transparent)"}</option>
            <option value="solid">{isSpanish ? "Solid (sólido)" : "Solid"}</option>
            <option value="dark">{isSpanish ? "Dark (oscuro)" : "Dark"}</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Texto" : "Text size"}
            </span>
            <select
              value={config.chatFontSize}
              onChange={(event) =>
                updateConfig({ chatFontSize: event.target.value as "small" | "medium" | "large" })
              }
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="small">
                {isSpanish ? "Pequeño" : "Small"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.small}px)
              </option>
              <option value="medium">
                {isSpanish ? "Medio" : "Medium"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.medium}px)
              </option>
              <option value="large">
                {isSpanish ? "Grande" : "Large"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.large}px)
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Ancho base" : "Base width"}
            </span>
            <select
              value={config.chatWidth}
              onChange={(event) =>
                updateConfig({ chatWidth: event.target.value as "small" | "medium" | "large" })
              }
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="small">
                {isSpanish ? "Pequeño" : "Small"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.small}px)
              </option>
              <option value="medium">
                {isSpanish ? "Medio" : "Medium"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.medium}px)
              </option>
              <option value="large">
                {isSpanish ? "Grande" : "Large"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.large}px)
              </option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              updateConfig({
                chatWidthPx: null,
                chatHeightPx: SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX,
              })
            }
            disabled={!hasManualSize}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSpanish ? "Restablecer tamaño manual" : "Reset manual size"}
          </button>
          <span className="text-muted-foreground">
            {isSpanish
              ? `Actual: ${config.chatWidthPx ?? SITE_SHIMEJI_CHAT_WIDTH_MAP[config.chatWidth]}×${config.chatHeightPx}px`
              : `Current: ${config.chatWidthPx ?? SITE_SHIMEJI_CHAT_WIDTH_MAP[config.chatWidth]}×${config.chatHeightPx}px`}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProviderFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig, freeSiteMessagesRemaining, freeSiteMessagesUsed } = useSiteShimeji();
  const openRouterModelKnown = OPENROUTER_MODEL_OPTIONS.some((item) => item.value === config.openrouterModel);
  const openRouterModelSelectValue = openRouterModelKnown ? config.openrouterModel : "__custom__";
  const [pairingCode, setPairingCode] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingStatus, setPairingStatus] = useState("");

  const hasPairedSession = Boolean(config.openclawPairedSessionToken.trim());
  const pairedSessionExpiresAtMs = config.openclawPairedSessionExpiresAt
    ? Date.parse(config.openclawPairedSessionExpiresAt)
    : NaN;
  const pairedSessionExpired = Number.isFinite(pairedSessionExpiresAtMs) && pairedSessionExpiresAtMs <= Date.now();
  const pairingEndpoint =
    typeof window === "undefined"
      ? "https://YOUR_SITE/api/site-shimeji/openclaw/pairings"
      : `${window.location.origin}/api/site-shimeji/openclaw/pairings`;

  function providerHelpLinks(kind: "openrouter" | "ollama" | "openclaw") {
    if (kind === "openrouter") {
      return (
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
        >
          {isSpanish ? "Conseguir API key de OpenRouter" : "Get OpenRouter API key"}
        </a>
      );
    }
    if (kind === "ollama") {
      return (
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
        >
          {isSpanish ? "Descargar / configurar Ollama" : "Download / setup Ollama"}
        </a>
      );
    }
    return (
      <a
        href="https://github.com/openclaw/openclaw"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
      >
        {isSpanish ? "Configurar OpenClaw" : "Setup OpenClaw"}
      </a>
    );
  }

  async function claimOpenClawPairing() {
    const code = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (!code) {
      setPairingStatus(
        isSpanish ? "Ingresá un código de pairing válido." : "Enter a valid pairing code.",
      );
      return;
    }

    setPairingBusy(true);
    setPairingStatus("");
    try {
      const response = await fetch("/api/site-shimeji/openclaw/pairings/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await response.json().catch(() => null)) as
        | {
            error?: string;
            sessionToken?: string;
            sessionExpiresAt?: string;
            agentName?: string;
          }
        | null;

      if (!response.ok || !json?.sessionToken) {
        const err = json?.error || "OPENCLAW_PAIRING_CLAIM_FAILED";
        if (err === "OPENCLAW_PAIRING_CODE_EXPIRED") {
          throw new Error(
            isSpanish
              ? "Ese código de pairing venció. Pedí uno nuevo."
              : "That pairing code has expired. Request a new one.",
          );
        }
        if (err === "OPENCLAW_PAIRING_CODE_USED") {
          throw new Error(
            isSpanish
              ? "Ese código ya fue usado. Pedí uno nuevo."
              : "That pairing code was already used. Request a new one.",
          );
        }
        if (err === "OPENCLAW_PAIRING_INVALID_CODE") {
          throw new Error(
            isSpanish
              ? "Código inválido. Revisalo e intentá de nuevo."
              : "Invalid pairing code. Check it and try again.",
          );
        }
        throw new Error(
          isSpanish
            ? "No se pudo completar el pairing ahora."
            : "Could not complete pairing right now.",
        );
      }

      updateConfig({
        openclawMode: "paired",
        openclawPairedSessionToken: json.sessionToken,
        openclawPairedSessionExpiresAt: json.sessionExpiresAt || "",
        openclawPairedAgentName: json.agentName || "",
      });
      setPairingCode("");
      setPairingStatus(
        isSpanish
          ? "OpenClaw vinculado correctamente."
          : "OpenClaw paired successfully.",
      );
    } catch (error) {
      setPairingStatus(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "Error al vincular OpenClaw."
            : "Failed to pair OpenClaw.",
      );
    } finally {
      setPairingBusy(false);
    }
  }

  function clearPairedSession() {
    updateConfig({
      openclawPairedSessionToken: "",
      openclawPairedSessionExpiresAt: "",
      openclawPairedAgentName: "",
    });
    setPairingStatus(
      isSpanish ? "Sesión de OpenClaw desconectada." : "OpenClaw session disconnected.",
    );
  }

  function pairingCurlCommand() {
    return `curl -X POST ${pairingEndpoint} \\
  -H "Authorization: Bearer YOUR_OPENCLAW_PAIRING_ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"gatewayUrl":"wss://your-gateway.example","gatewayToken":"YOUR_GATEWAY_TOKEN","agentName":"web-shimeji-1"}'`;
  }

  function pairingMarkdownInstructions() {
    return `# OpenClaw Pairing Code (for web users)

Use this on your OpenClaw server/agent to generate a pairing code for the user.

## 1) Generate pairing code
\`\`\`bash
${pairingCurlCommand()}
\`\`\`

## 2) Return the code
- Read JSON field \`pairingCode\`.
- Send that code to the user so they can paste it in the website pairing input.

## Notes
- Endpoint: \`${pairingEndpoint}\`
- This endpoint requires \`OPENCLAW_PAIRING_ADMIN_TOKEN\` configured on the website backend.
- The user never needs to paste gateway URL/token in web when using pairing mode.`;
  }

  async function copyToClipboard(value: string, successEn: string, successEs: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setPairingStatus(
        isSpanish
          ? "No se pudo copiar automáticamente. Copialo manualmente."
          : "Could not copy automatically. Please copy it manually.",
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setPairingStatus(isSpanish ? successEs : successEn);
    } catch {
      setPairingStatus(
        isSpanish
          ? "No se pudo copiar automáticamente. Copialo manualmente."
          : "Could not copy automatically. Please copy it manually.",
      );
    }
  }

  if (config.provider === "site") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-foreground/80">
        <p className="font-semibold text-foreground">
          {isSpanish ? "Créditos gratis del sitio" : "Site free credits"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isSpanish
            ? `Usados: ${freeSiteMessagesUsed}. Restantes: ${freeSiteMessagesRemaining ?? 0}.`
            : `Used: ${freeSiteMessagesUsed}. Remaining: ${freeSiteMessagesRemaining ?? 0}.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {isSpanish
            ? "Cuando se terminen, cambia a OpenRouter, Ollama u OpenClaw para seguir hablando."
            : "When these run out, switch to OpenRouter, Ollama, or OpenClaw to keep chatting."}
        </p>
      </div>
    );
  }

  if (config.provider === "openrouter") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {providerHelpLinks("openrouter")}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            OpenRouter API Key
          </span>
          <input
            type="password"
            value={config.openrouterApiKey}
            onChange={(event) => updateConfig({ openrouterApiKey: event.target.value })}
            placeholder="sk-or-v1-..."
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <select
            value={openRouterModelSelectValue}
            onChange={(event) =>
              updateConfig({
                openrouterModel:
                  event.target.value === "__custom__" ? (openRouterModelKnown ? "" : config.openrouterModel) : event.target.value,
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            {OPENROUTER_MODEL_OPTIONS.map((item) => (
              <option key={item.value} value={item.value} disabled={Boolean(item.disabled)}>
                {isSpanish ? item.labelEs : item.labelEn}
              </option>
            ))}
            <option value="__custom__">{isSpanish ? "Personalizado" : "Custom"}</option>
          </select>
        </label>
        {openRouterModelSelectValue === "__custom__" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Modelo personalizado" : "Custom model"}
            </span>
            <input
              type="text"
              value={config.openrouterModel}
              onChange={(event) => updateConfig({ openrouterModel: event.target.value })}
              placeholder="openai/gpt-4o-mini"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            />
          </label>
        ) : null}
      </div>
    );
  }

  if (config.provider === "ollama") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {providerHelpLinks("ollama")}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ollama URL
          </span>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(event) => updateConfig({ ollamaUrl: event.target.value })}
            placeholder="http://127.0.0.1:11434"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <input
            type="text"
            value={config.ollamaModel}
            onChange={(event) => updateConfig({ ollamaModel: event.target.value })}
            placeholder="gemma3:1b"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {isSpanish
            ? "Se intenta conectar directo desde tu navegador. Si tu navegador bloquea la conexión local, usa una URL accesible por HTTPS o un túnel."
            : "The site tries to connect directly from your browser. If your browser blocks local connections, use an HTTPS-accessible URL or tunnel."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {providerHelpLinks("openclaw")}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Modo de conexión" : "Connection mode"}
        </span>
        <select
          value={config.openclawMode}
          onChange={(event) =>
            updateConfig({
              openclawMode: event.target.value as "paired" | "manual",
            })
          }
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
        >
          <option value="paired">{isSpanish ? "Código de pairing (recomendado)" : "Pairing code (recommended)"}</option>
          <option value="manual">{isSpanish ? "Manual (URL + token)" : "Manual (URL + token)"}</option>
        </select>
      </label>

      {config.openclawMode === "paired" ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              {isSpanish
                ? "¿De dónde sale el código de pairing?"
                : "Where does the pairing code come from?"}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>
                {isSpanish
                  ? "Tu agente/servidor OpenClaw debe llamar al endpoint de pairing del sitio."
                  : "Your OpenClaw agent/server must call the website pairing endpoint."}
              </li>
              <li>
                {isSpanish
                  ? "Esa llamada devuelve `pairingCode`."
                  : "That call returns a `pairingCode`."}
              </li>
              <li>
                {isSpanish
                  ? "Pegá ese código acá y presioná Vincular."
                  : "Paste that code here and press Pair."}
              </li>
            </ol>
            <p className="mt-2">
              {isSpanish
                ? "El backend web usa `OPENCLAW_PAIRING_ADMIN_TOKEN` para autorizar esa creación de códigos."
                : "The web backend uses `OPENCLAW_PAIRING_ADMIN_TOKEN` to authorize code creation."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void copyToClipboard(
                    pairingCurlCommand(),
                    "Pairing command copied.",
                    "Comando de pairing copiado.",
                  )
                }
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/10"
              >
                {isSpanish ? "Copiar comando" : "Copy command"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void copyToClipboard(
                    pairingMarkdownInstructions(),
                    "Agent markdown instructions copied.",
                    "Instrucciones markdown para el agente copiadas.",
                  )
                }
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/10"
              >
                {isSpanish ? "Copiar instrucciones MD" : "Copy markdown instructions"}
              </button>
              <a
                href="/openclaw-pairing-agent-template.md"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/10"
              >
                {isSpanish ? "Ver template MD" : "Open markdown template"}
              </a>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2 text-[11px] leading-relaxed text-foreground">
              <code>
{pairingCurlCommand()}
              </code>
            </pre>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Código de pairing" : "Pairing code"}
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={pairingCode}
                onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
                placeholder={isSpanish ? "Ej: Q7M4K9P2" : "Ex: Q7M4K9P2"}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                maxLength={12}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void claimOpenClawPairing()}
                disabled={pairingBusy}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pairingBusy
                  ? isSpanish
                    ? "Vinculando..."
                    : "Pairing..."
                  : isSpanish
                    ? "Vincular"
                    : "Pair"}
              </button>
            </div>
          </label>

          {pairingStatus ? (
            <p className="text-xs text-muted-foreground">{pairingStatus}</p>
          ) : null}

          <div
            className={`rounded-xl border p-3 text-xs ${
              hasPairedSession && !pairedSessionExpired
                ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-100"
                : "border-amber-300/20 bg-amber-300/5 text-amber-100"
            }`}
          >
            {hasPairedSession && !pairedSessionExpired
              ? isSpanish
                ? "Sesión de OpenClaw activa en este navegador."
                : "OpenClaw session is active in this browser."
              : isSpanish
                ? "No hay una sesión activa. Vinculá un código para empezar."
                : "No active session yet. Pair a code to get started."}
            {config.openclawPairedAgentName ? (
              <div className="mt-2 text-[11px] text-muted-foreground">
                {isSpanish ? "Agente" : "Agent"}: {config.openclawPairedAgentName}
              </div>
            ) : null}
            {config.openclawPairedSessionExpiresAt ? (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {isSpanish ? "Vence" : "Expires"}:{" "}
                {new Date(config.openclawPairedSessionExpiresAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          {hasPairedSession ? (
            <button
              type="button"
              onClick={clearPairedSession}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
            >
              {isSpanish ? "Desconectar sesión" : "Disconnect session"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Gateway URL" : "Gateway URL"}
            </span>
            <input
              type="text"
              value={config.openclawGatewayUrl}
              onChange={(event) => updateConfig({ openclawGatewayUrl: event.target.value })}
              placeholder="ws://127.0.0.1:18789"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Nombre del agente" : "Agent name"}
            </span>
            <input
              type="text"
              value={config.openclawAgentName}
              onChange={(event) => updateConfig({ openclawAgentName: event.target.value })}
              placeholder="web-shimeji-1"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
              maxLength={32}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Token del gateway" : "Gateway auth token"}
            </span>
            <input
              type="password"
              value={config.openclawGatewayToken}
              onChange={(event) => updateConfig({ openclawGatewayToken: event.target.value })}
              placeholder={isSpanish ? "Ingresa el token" : "Enter gateway token"}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
              autoComplete="off"
            />
          </label>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isSpanish
          ? "OpenClaw en la web usa el gateway para chat/agente, pero no habilita acceso local a terminal o WSL."
          : "Website OpenClaw uses the gateway for chat/agent tasks, but does not enable local terminal or WSL access."}
      </p>
    </div>
  );
}

export function SoundFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();
  const [browserVoices, setBrowserVoices] = useState<Array<{ name: string; lang: string }>>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const syncVoices = () => {
      const voices = synth
        .getVoices()
        .map((voice) => ({
          name: String(voice.name || "").trim(),
          lang: String(voice.lang || "").trim(),
        }))
        .filter((voice) => voice.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setBrowserVoices(voices);
    };

    syncVoices();
    synth.addEventListener?.("voiceschanged", syncVoices);
    return () => synth.removeEventListener?.("voiceschanged", syncVoices);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        {isSpanish
          ? "Modo gratis: usa voz del navegador (micrófono + síntesis de voz). Suele funcionar mejor en Chrome/Edge. ElevenLabs es opcional para una voz más natural."
          : "Free mode uses browser voice features (microphone + speech synthesis). It usually works best in Chrome/Edge. ElevenLabs is optional for a more natural voice."}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Entrada de voz (hablarle)" : "Voice input (talk to it)"}
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Proveedor de micrófono" : "Microphone provider"}
          </span>
          <select
            value={config.soundInputProvider}
            onChange={(event) =>
              updateConfig({
                soundInputProvider: event.target.value as "off" | "browser",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="off">{isSpanish ? "Desactivado" : "Off"}</option>
            <option value="browser">{isSpanish ? "Navegador (gratis)" : "Browser (free)"}</option>
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <input
            type="checkbox"
            checked={config.soundInputAutoSend}
            onChange={(event) => updateConfig({ soundInputAutoSend: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 accent-[var(--brand-accent)]"
          />
          <span className="text-xs text-foreground/85">
            {isSpanish
              ? "Enviar automáticamente cuando termine de transcribir"
              : "Auto-send when transcription finishes"}
          </span>
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Salida de voz (que te hable)" : "Voice output (talks back)"}
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Proveedor de voz" : "Voice provider"}
          </span>
          <select
            value={config.soundOutputProvider}
            onChange={(event) =>
              updateConfig({
                soundOutputProvider: event.target.value as "off" | "browser" | "elevenlabs",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="off">{isSpanish ? "Desactivado" : "Off"}</option>
            <option value="browser">{isSpanish ? "Voz del navegador (gratis)" : "Browser voice (free)"}</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <input
            type="checkbox"
            checked={config.soundOutputAutoSpeak}
            onChange={(event) => updateConfig({ soundOutputAutoSpeak: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 accent-[var(--brand-accent)]"
            disabled={config.soundOutputProvider === "off"}
          />
          <span className="text-xs text-foreground/85">
            {isSpanish
              ? "Leer en voz alta automáticamente las respuestas del shimeji"
              : "Automatically speak shimeji replies aloud"}
          </span>
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{isSpanish ? "Volumen" : "Volume"}</span>
            <span>{config.soundOutputVolumePercent}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.soundOutputVolumePercent}
            onChange={(event) =>
              updateConfig({ soundOutputVolumePercent: Number(event.target.value) })
            }
            className="w-full accent-[var(--brand-accent)]"
            disabled={config.soundOutputProvider === "off"}
          />
        </label>

        {config.soundOutputProvider === "browser" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Voz del navegador" : "Browser voice"}
            </span>
            <select
              value={config.soundOutputBrowserVoiceName}
              onChange={(event) => updateConfig({ soundOutputBrowserVoiceName: event.target.value })}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="">
                {isSpanish ? "Automática (por idioma del sitio)" : "Automatic (site language)"}
              </option>
              {browserVoices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} {voice.lang ? `(${voice.lang})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {config.soundOutputProvider === "elevenlabs" && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ElevenLabs API Key
              </span>
              <input
                type="password"
                value={config.elevenlabsApiKey}
                onChange={(event) => updateConfig({ elevenlabsApiKey: event.target.value })}
                placeholder="sk_..."
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                autoComplete="off"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Voice ID" : "Voice ID"}
                </span>
                <input
                  type="text"
                  value={config.elevenlabsVoiceId}
                  onChange={(event) => updateConfig({ elevenlabsVoiceId: event.target.value })}
                  placeholder="EXAVITQu4vr4xnSDxMaL"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Modelo" : "Model"}
                </span>
                <input
                  type="text"
                  value={config.elevenlabsModelId}
                  onChange={(event) => updateConfig({ elevenlabsModelId: event.target.value })}
                  placeholder="eleven_flash_v2_5"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              {isSpanish
                ? "La key se guarda localmente en tu navegador y solo se envía cuando pedís generar audio."
                : "The key is stored locally in your browser and is only sent when you request audio generation."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteShimejiConfigPanel({ inline = false }: { inline?: boolean } = {}) {
  const { isSpanish } = useLanguage();
  const [activeTab, setActiveTab] = useState<ConfigPanelTab>("chat");
  const {
    isConfigOpen,
    closeConfig,
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
    resetConfig,
    canUseCurrentProvider,
    freeSiteMessagesRemaining,
  } = useSiteShimeji();

  if (!inline && !isConfigOpen) return null;

  return (
    <div className={inline ? "w-full" : "fixed inset-0 z-[90]"}>
      {!inline ? (
        <button
          type="button"
          aria-label={isSpanish ? "Cerrar panel de configuración" : "Close configuration panel"}
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          onClick={closeConfig}
        />
      ) : null}

      <aside
        className={
          inline
            ? "shimeji-settings-panel mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#06080d]/95 shadow-2xl"
            : "shimeji-settings-panel absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-[#06080d]/95 shadow-2xl"
        }
      >
        <div className={`flex ${inline ? "min-h-0" : "h-full"} flex-col`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                <Settings2 className="h-5 w-5 text-[var(--brand-accent)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Shimeji del sitio" : "Website Shimeji"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isSpanish
                    ? "Configuración local de este navegador"
                    : "Local settings for this browser"}
                </div>
              </div>
            </div>
            {!inline ? (
              <button
                type="button"
                onClick={closeConfig}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-5 flex flex-wrap gap-2">
              {([
                { key: "chat", labelEs: "Proveedor", labelEn: "Provider" },
                { key: "appearance", labelEs: "Chat", labelEn: "Chat" },
                { key: "mascot", labelEs: "Mascota", labelEn: "Mascot" },
                { key: "sound", labelEs: "Sonido", labelEn: "Sound" },
              ] as const).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                        : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {isSpanish ? tab.labelEs : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {activeTab === "mascot" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Mascota" : "Mascot"}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Personaje" : "Character"}
                  </span>
                  <select
                    value={config.character}
                    onChange={(event) => updateConfig({ character: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                    disabled={catalogLoading || !catalog?.characters.length}
                  >
                    {(catalog?.characters ?? []).map((character) => (
                      <option key={character.key} value={character.key}>
                        {character.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Personalidad" : "Personality"}
                  </span>
                  <select
                    value={config.personality}
                    onChange={(event) => updateConfig({ personality: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                    disabled={catalogLoading || !catalog?.personalities.length}
                  >
                    {(catalog?.personalities ?? []).map((personality) => (
                      <option key={personality.key} value={personality.key}>
                        {getSiteShimejiPersonalityDisplayLabel(personality, isSpanish)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{isSpanish ? "Tamaño" : "Size"}</span>
                  <span>{config.sizePercent}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={180}
                  step={5}
                  value={config.sizePercent}
                  onChange={(event) => updateConfig({ sizePercent: Number(event.target.value) })}
                  className="w-full accent-[var(--brand-accent)]"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                {catalogError ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>{catalogError}</span>
                    <button
                      type="button"
                      onClick={() => reloadCatalog().catch(() => undefined)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-foreground hover:bg-white/5"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {isSpanish ? "Reintentar" : "Retry"}
                    </button>
                  </div>
                ) : catalogLoading ? (
                  <span>{isSpanish ? "Cargando catálogo de sprites..." : "Loading sprite catalog..."}</span>
                ) : null}
              </div>
              </section>
            )}

            {activeTab === "chat" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {isSpanish ? "Proveedor de IA" : "AI Provider"}
              </h3>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Proveedor" : "Provider"}
                </span>
                <select
                  value={config.provider}
                  onChange={(event) =>
                    updateConfig({
                      provider: event.target.value as
                        | "site"
                        | "openrouter"
                        | "ollama"
                        | "openclaw",
                    })
                  }
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                >
                  <option value="site">{isSpanish ? "Créditos del sitio (gratis)" : "Site credits (free)"}</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                  <option value="openclaw">OpenClaw</option>
                </select>
              </label>

              <ProviderFields />

              <div
                className={`rounded-2xl border p-3 text-xs ${
                  canUseCurrentProvider
                    ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-100"
                    : "border-rose-300/20 bg-rose-300/5 text-rose-100"
                }`}
              >
                {canUseCurrentProvider
                  ? isSpanish
                    ? "Listo: este proveedor puede usarse desde el chat del shimeji."
                    : "Ready: this provider can be used from the shimeji chat."
                  : isSpanish
                    ? "Falta configuración para el proveedor seleccionado (o no quedan créditos del sitio)."
                    : "Missing configuration for the selected provider (or no site credits remain)."}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetConfig}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
                >
                  {isSpanish ? "Restablecer configuración" : "Reset settings"}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {isSpanish
                  ? `Créditos del sitio restantes en este navegador: ${freeSiteMessagesRemaining ?? 0}.`
                  : `Site credits remaining in this browser: ${freeSiteMessagesRemaining ?? 0}.`}
              </p>

              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Seguridad y alcance" : "Security and scope"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {isSpanish
                    ? config.provider === "openclaw" && config.openclawMode === "paired"
                      ? "En modo pairing, este navegador guarda solo un token de sesión temporal y el relay del sitio usa tu gateway remoto. Este shimeji web no tiene acceso a WSL ni a tu terminal local."
                      : "Las keys y tokens se guardan solo en tu navegador (localStorage). Este shimeji web no tiene acceso a WSL ni a tu terminal local."
                    : config.provider === "openclaw" && config.openclawMode === "paired"
                      ? "In pairing mode, this browser stores only a temporary session token while the site relay uses your remote gateway. This website shimeji has no WSL or local terminal access."
                      : "Keys and tokens are stored only in your browser (localStorage). This website shimeji has no WSL or local terminal access."}
                </p>
              </div>

              </section>
            )}

            {activeTab === "appearance" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Apariencia del chat" : "Chat appearance"}
                </h3>
                <ChatAppearanceFields />
              </section>
            )}

            {activeTab === "sound" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Sonido y voz" : "Sound and voice"}
                </h3>
                <SoundFields />
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
