"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, ExternalLink, Download, Gavel, RefreshCw, User } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";
import { getSiteShimejiPersonalityDisplayLabel } from "@/lib/site-shimeji-personality-labels";
import { SoundFields } from "@/components/site-shimeji-config-panel";

type ProviderKey = "openrouter" | "ollama" | "openclaw";
const OPENCLAW_AGENT_MARKDOWN_URL = "https://www.shimeji.dev/agent/openclaw-web.md";

const OPENROUTER_PRESET_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (fast & cheap)" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
  { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (free)" },
  { value: "__custom__", label: "Custom model…" },
];

function OpenRouterModelField() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();

  const isCustom = !OPENROUTER_PRESET_MODELS.slice(0, -1).some(
    (m) => m.value === config.openrouterModel,
  );
  const selectValue = isCustom ? "__custom__" : config.openrouterModel;

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {isSpanish ? "Modelo" : "Model"}
      </span>
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value !== "__custom__") {
            updateConfig({ openrouterModel: e.target.value });
          }
        }}
        className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
      >
        {OPENROUTER_PRESET_MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {isCustom && (
        <input
          type="text"
          value={config.openrouterModel}
          onChange={(e) => updateConfig({ openrouterModel: e.target.value })}
          placeholder="provider/model-name"
          className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)] placeholder:text-muted-foreground/50"
        />
      )}
    </div>
  );
}

function OpenClawFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();
  const [mode, setMode] = useState<"human" | "agent">("human");

  const inputClass =
    "w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)] placeholder:text-muted-foreground/50";

  function greet() {
    window.dispatchEvent(new CustomEvent("shimeji:open-chat"));
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setMode("human")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "human"
              ? "bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] text-foreground"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          {isSpanish ? "Soy humano" : "I'm a human"}
        </button>
        <div className="w-px bg-border" />
        <button
          type="button"
          onClick={() => setMode("agent")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "agent"
              ? "bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] text-foreground"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          {isSpanish ? "Soy un agente" : "I'm an agent"}
        </button>
      </div>

      {/* Connection fields — always visible */}
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gateway URL
        </span>
        <input
          type="text"
          value={config.openclawGatewayUrl}
          onChange={(e) => updateConfig({ openclawGatewayUrl: e.target.value })}
          placeholder="ws://127.0.0.1:18789"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Nombre del agente" : "Agent name"}
        </span>
        <input
          type="text"
          value={config.openclawAgentName}
          onChange={(e) => updateConfig({ openclawAgentName: e.target.value })}
          placeholder="web-shimeji-1"
          className={inputClass}
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
          onChange={(e) => updateConfig({ openclawGatewayToken: e.target.value })}
          placeholder={isSpanish ? "Token de autenticación" : "Auth token"}
          className={inputClass}
          autoComplete="off"
        />
      </label>

      {/* Human mode: compact note only */}
      {mode === "human" && (
        <p className="text-xs text-muted-foreground">
          {isSpanish
            ? "Usá este modo para conectar el Shimeji web a tu gateway y chatear. Si `ws://127.0.0.1` falla desde shimeji.dev, usá una URL `wss://` (por ejemplo con un túnel gratis). Si querés instrucciones de integración para agentes, hacé clic en “Soy un agente”."
            : "Use this mode to connect the website Shimeji to your gateway and chat. If `ws://127.0.0.1` fails from shimeji.dev, use a `wss://` URL (for example via a free tunnel). If you want agent integration instructions, click “I'm an agent”."}
        </p>
      )}

      {/* Agent mode: instructions + greet */}
      {mode === "agent" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">
              {isSpanish ? "Instrucciones para integrar tu agente" : "Agent integration instructions"}
            </p>
            <p className="mb-2">
              {isSpanish
                ? "Este Shimeji web se conecta por WebSocket a tu gateway OpenClaw usando los campos de arriba. No son instrucciones para el modelo: son los datos de conexión que usa la web para hablar con tu agente."
                : "This website Shimeji connects to your OpenClaw gateway over WebSocket using the fields above. These are not model prompts: they are the connection values the website uses to talk to your agent."}
            </p>
            <div className="mb-2 rounded-lg border border-border bg-background/40 p-2">
              <p className="mb-1 font-semibold text-foreground">
                {isSpanish ? "Comando para tu agente (leer instrucciones en Markdown)" : "Command for your agent (read Markdown instructions)"}
              </p>
              <p className="mb-1">
                {isSpanish
                  ? "Pedile a tu agente que ejecute este comando. El archivo explica como conectarse y mandar un mensaje de prueba por la mascota web para verificar la conexion."
                  : "Ask your agent to run this command. The file explains how to connect and send a test message through the web mascot to verify the connection."}
              </p>
              <pre className="overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
                {`curl -fsSL ${OPENCLAW_AGENT_MARKDOWN_URL}`}
              </pre>
            </div>
            <p className="mb-2 rounded-lg border border-border bg-background/40 px-2 py-1.5">
              {isSpanish
                ? "Importante: no necesitás clonar este repo ni ejecutar `npm run start` para hablar por shimeji.dev. El sitio ya está online. Solo necesitás un gateway OpenClaw corriendo (y opcionalmente un túnel)."
                : "Important: you do not need to clone this repo or run `npm run start` to talk through shimeji.dev. The site is already online. You only need a running OpenClaw gateway (and optionally a tunnel)."}
            </p>
            <ul className="mb-2 list-disc space-y-1 pl-4">
              <li>
                {isSpanish
                  ? "Gateway URL: URL `ws://` o `wss://` de tu gateway OpenClaw. Si pegás `https://...`, la web la convierte a `wss://` automáticamente."
                  : "Gateway URL: your OpenClaw gateway `ws://` or `wss://` URL. If you paste `https://...`, the site converts it to `wss://` automatically."}
              </li>
              <li>
                {isSpanish
                  ? "Nombre del agente: identificador del agente/sesión que querés usar desde este Shimeji."
                  : "Agent name: the agent/session identifier you want this Shimeji to use."}
              </li>
              <li>
                {isSpanish
                  ? "Token del gateway: token de autenticación del gateway (se guarda localmente en tu navegador)."
                  : "Gateway auth token: gateway authentication token (stored locally in your browser)."}
              </li>
              <li>
                {isSpanish
                  ? "Si shimeji.dev no puede abrir `ws://127.0.0.1` (HTTPS + mixed content / red distinta), exponé el gateway con una URL pública `wss://`."
                  : "If shimeji.dev cannot open `ws://127.0.0.1` (HTTPS + mixed content / different network), expose the gateway with a public `wss://` URL."}
              </li>
            </ul>
            <p className="mb-2">
              {isSpanish
                ? "Cuando el usuario chatea con el Shimeji, los mensajes se enrutan a ese agente y la respuesta vuelve a la burbuja del Shimeji. No habilita acceso local a terminal ni WSL."
                : "When the user chats with the Shimeji, messages are routed to that agent and the reply returns to the Shimeji bubble. This does not enable local terminal or WSL access."}
            </p>
            <div className="mb-2 rounded-lg border border-border bg-background/40 p-2">
              <p className="mb-1 font-semibold text-foreground">
                {isSpanish ? "Túnel gratis recomendado (Cloudflare Tunnel)" : "Recommended free tunnel (Cloudflare Tunnel)"}
              </p>
              <p className="mb-1">
                {isSpanish
                  ? "Si tu gateway corre en tu máquina y shimeji.dev no conecta por `ws://127.0.0.1`, corré un túnel y pegá la URL pública en Gateway URL."
                  : "If your gateway runs on your machine and shimeji.dev cannot connect via `ws://127.0.0.1`, run a tunnel and paste the public URL into Gateway URL."}
              </p>
              <pre className="overflow-x-auto rounded border border-border bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
                {`cloudflared tunnel --url http://127.0.0.1:18789
# use the https://...trycloudflare.com URL shown by cloudflared
# (the site will use it as wss:// automatically)`}
              </pre>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
              {`# ${isSpanish ? "Valores actuales (referencia)" : "Current values (reference)"}
gateway_url:  ${config.openclawGatewayUrl || "ws://127.0.0.1:18789"}
agent_name:   ${config.openclawAgentName || "web-shimeji-1"}
auth_token:   ${config.openclawGatewayToken ? "••••••••" : "(not set)"}`}
            </pre>
          </div>
          <button
            type="button"
            onClick={greet}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--brand-accent)_20%,transparent)]"
          >
            <Bot className="h-4 w-4" />
            {isSpanish ? "Saludar — abrir chat" : "Greet — open chat"}
          </button>
        </div>
      )}
    </div>
  );
}

function ProviderFields({ provider }: { provider: ProviderKey }) {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();

  const inputClass =
    "w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)] placeholder:text-muted-foreground/50";

  if (provider === "openrouter") {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            API Key
          </span>
          <input
            type="password"
            value={config.openrouterApiKey}
            onChange={(e) => updateConfig({ openrouterApiKey: e.target.value })}
            placeholder="sk-or-v1-..."
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <OpenRouterModelField />
      </div>
    );
  }

  if (provider === "ollama") {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ollama URL
          </span>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(e) => updateConfig({ ollamaUrl: e.target.value })}
            placeholder="http://127.0.0.1:11434"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <input
            type="text"
            value={config.ollamaModel}
            onChange={(e) => updateConfig({ ollamaModel: e.target.value })}
            placeholder="gemma3:1b"
            className={inputClass}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {isSpanish
            ? "La página se conecta directo desde tu navegador. Usá HTTPS o un túnel si hay errores CORS."
            : "The page connects directly from your browser. Use HTTPS or a tunnel if you hit CORS errors."}
        </p>
      </div>
    );
  }

  // openclaw
  return <OpenClawFields />;
}

type ProviderMeta = {
  key: ProviderKey;
  label: string;
  taglineEn: string;
  taglineEs: string;
  bestForEn: string;
  bestForEs: string;
  linkHref: string;
  linkLabelEn: string;
  linkLabelEs: string;
};

const PROVIDER_META: ProviderMeta[] = [
  {
    key: "openrouter",
    label: "OpenRouter",
    taglineEn: "Cloud · API key",
    taglineEs: "Nube · API key",
    bestForEn: "Fastest setup — many model options, free tiers available.",
    bestForEs: "Setup más rápido — muchas opciones de modelos, tiers gratuitos disponibles.",
    linkHref: "https://openrouter.ai/settings/keys",
    linkLabelEn: "Get API keys",
    linkLabelEs: "Conseguir API keys",
  },
  {
    key: "ollama",
    label: "Ollama",
    taglineEn: "Local · Private",
    taglineEs: "Local · Privado",
    bestForEn: "Run models locally — no API key, fully private, works offline.",
    bestForEs: "Modelos locales — sin API key, totalmente privado, funciona offline.",
    linkHref: "https://ollama.com",
    linkLabelEn: "Download Ollama",
    linkLabelEs: "Descargar Ollama",
  },
  {
    key: "openclaw",
    label: "OpenClaw",
    taglineEn: "Agent · Actions",
    taglineEs: "Agente · Acciones",
    bestForEn: "Agent mode — actions and tools beyond normal chat.",
    bestForEs: "Modo agente — acciones y herramientas más allá del chat.",
    linkHref: "https://github.com/openclaw/openclaw",
    linkLabelEn: "Setup OpenClaw",
    linkLabelEs: "Configurar OpenClaw",
  },
];

export function SiteShimejiLandingSection() {
  const { isSpanish } = useLanguage();
  const {
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
    canUseCurrentProvider,
    resetConfig,
  } = useSiteShimeji();

  const [activeTab, setActiveTab] = useState<"appearance" | "sound" | "provider">("appearance");

  // Normalize legacy "site" provider to "openrouter"
  const effectiveProvider: ProviderKey =
    config.provider === "site" || config.provider === "openrouter"
      ? "openrouter"
      : config.provider === "ollama"
        ? "ollama"
        : "openclaw";

  const activeMeta =
    PROVIDER_META.find((p) => p.key === effectiveProvider) ?? PROVIDER_META[0];

  const heroTitle = isSpanish
    ? "Un asistente de IA siempre a la vista."
    : "An AI assistant always on screen.";

  const heroSubtitle = isSpanish
    ? "Chateá, hacé preguntas y delegá tareas a un asistente siempre disponible en tu navegador. Conectá tu propio proveedor — OpenRouter, Ollama u OpenClaw. También camina por tu pantalla."
    : "Chat, ask questions, and delegate tasks to an always-on assistant right in your browser. Connect your own provider — OpenRouter, Ollama, or OpenClaw. It also walks around your screen.";

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/50 p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] opacity-60">
            <div className="absolute -left-12 top-6 h-48 w-48 rounded-full bg-[var(--brand-accent)]/20 blur-3xl" />
            <div className="absolute right-6 top-10 h-36 w-36 rounded-full bg-[var(--brand-accent)]/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-[var(--brand-accent)]/8 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            {/* ── Left: hero ── */}
            <div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                {heroTitle}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                {heroSubtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
                >
                  <Download className="h-4 w-4" />
                  {isSpanish ? "Descargas" : "Downloads"}
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
                >
                  <Gavel className="h-4 w-4" />
                  {isSpanish ? "Mercado NFT" : "NFT Marketplace"}
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Qué puede hacer" : "What it can do"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {isSpanish ? "Habla, responde y actúa" : "Talks, answers, and acts"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {isSpanish
                      ? "Chatea con IA, responde preguntas, ejecuta tareas como agente y camina por tu pantalla."
                      : "AI chat, Q&A, autonomous agent tasks — and walks across your screen."}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Cómo empezar" : "How to start"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {isSpanish ? "Pegá tu API key →" : "Paste your API key →"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {isSpanish
                      ? "Elegí un proveedor a la derecha, pegá tu key y hacé clic en el shimeji."
                      : "Pick a provider on the right, paste your key, and click the shimeji to chat."}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: tabbed config ── */}
            <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background/40 backdrop-blur-sm">
              {/* Tab bar */}
              <div className="flex shrink-0 border-b border-border">
                {(["appearance", "sound", "provider"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                    }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,transparent)] text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    {tab === "appearance"
                      ? isSpanish
                        ? "Apariencia"
                        : "Appearance"
                      : tab === "sound"
                        ? isSpanish
                          ? "Sonido"
                          : "Sound"
                        : isSpanish
                          ? "Proveedor"
                          : "Provider"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* ── Appearance tab ── */}
                {activeTab === "appearance" && (
                  <div className="space-y-4">
                    {/* Character */}
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {isSpanish ? "Personaje" : "Character"}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(catalog?.characters ?? []).slice(0, 9).map((character) => (
                          <button
                            key={character.key}
                            type="button"
                            onClick={() => updateConfig({ character: character.key })}
                            className={`rounded-xl border p-2 text-center transition-colors ${
                              config.character === character.key
                                ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)]"
                                : "border-border bg-muted/30 hover:bg-muted/60"
                            }`}
                          >
                            <img
                              src={character.iconUrl}
                              alt=""
                              className="mx-auto h-10 w-10 object-contain"
                              style={{ imageRendering: "pixelated" }}
                            />
                            <div className="mt-1 truncate text-[11px] font-semibold text-foreground/90">
                              {character.label}
                            </div>
                          </button>
                        ))}
                        {catalogLoading &&
                          Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={`loading-${i}`}
                              className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/40"
                            />
                          ))}
                      </div>
                      {catalogError && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{catalogError}</span>
                          <button
                            type="button"
                            onClick={() => reloadCatalog().catch(() => undefined)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-muted/40"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {isSpanish ? "Reintentar" : "Retry"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Personality + Size */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isSpanish ? "Personalidad" : "Personality"}
                        </span>
                        <select
                          value={config.personality}
                          onChange={(e) => updateConfig({ personality: e.target.value })}
                          className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                        >
                          {(catalog?.personalities ?? []).map((entry) => (
                            <option key={entry.key} value={entry.key}>
                              {getSiteShimejiPersonalityDisplayLabel(entry, isSpanish)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>{isSpanish ? "Tamaño" : "Size"}</span>
                          <span>{config.sizePercent}%</span>
                        </div>
                        <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
                          <input
                            type="range"
                            min={60}
                            max={180}
                            step={5}
                            value={config.sizePercent}
                            onChange={(e) => updateConfig({ sizePercent: Number(e.target.value) })}
                            className="w-full accent-[var(--brand-accent)]"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* ── Sound tab ── */}
                {activeTab === "sound" && (
                  <div className="space-y-4">
                    <SoundFields />
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        {isSpanish
                          ? "Todo viene desactivado por defecto. Activá micrófono y/o voz del navegador cuando quieras usar conversación por voz."
                          : "Everything is disabled by default. Enable microphone and/or browser voice when you want voice conversations."}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Provider tab ── */}
                {activeTab === "provider" && (
                  <div className="space-y-4">
                    {/* Provider selector */}
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {isSpanish ? "Proveedor de IA" : "AI Provider"}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PROVIDER_META.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => updateConfig({ provider: p.key })}
                            className={`rounded-xl border px-2 py-2.5 text-left transition-colors ${
                              effectiveProvider === p.key
                                ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)]"
                                : "border-border bg-muted/30 hover:bg-muted/60"
                            }`}
                          >
                            <div className="text-sm font-semibold text-foreground">{p.label}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {isSpanish ? p.taglineEs : p.taglineEn}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Provider context: best-for + link */}
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">
                        {isSpanish ? activeMeta.bestForEs : activeMeta.bestForEn}
                      </p>
                      <Link
                        href={activeMeta.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand-accent)] hover:underline"
                      >
                        {isSpanish ? activeMeta.linkLabelEs : activeMeta.linkLabelEn}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Provider-specific fields */}
                    <ProviderFields provider={effectiveProvider} />

                    {/* Status */}
                    <div
                      className={`rounded-xl border p-3 text-xs font-medium text-foreground ${
                        canUseCurrentProvider
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-amber-500/40 bg-amber-500/10"
                      }`}
                    >
                      {canUseCurrentProvider
                        ? isSpanish
                          ? "✓ Listo — hacé clic en el shimeji para chatear"
                          : "✓ Ready — click the shimeji to start chatting"
                        : isSpanish
                          ? "Completá la configuración de arriba para empezar a chatear."
                          : "Complete the config above to start chatting."}
                    </div>

                    {/* Security note */}
                    <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                      {isSpanish
                        ? "🔒 Las claves se guardan solo en tu navegador (localStorage). El servidor nunca las recibe."
                        : "🔒 Keys are stored only in your browser (localStorage). They never reach the server."}
                    </div>

                    {/* Reset */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={resetConfig}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                      >
                        {isSpanish ? "Restablecer" : "Reset settings"}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
