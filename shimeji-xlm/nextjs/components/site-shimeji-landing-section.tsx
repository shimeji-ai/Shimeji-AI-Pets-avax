"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Download, Gavel, RefreshCw, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";

type ProviderKey = "openrouter" | "ollama" | "openclaw";

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
  return (
    <div className="space-y-3">
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
      <p className="text-xs text-muted-foreground">
        {isSpanish
          ? "OpenClaw en la web habilita modo agente, pero sin acceso a terminal local ni WSL."
          : "Website OpenClaw enables agent mode, but without local terminal or WSL access."}
      </p>
    </div>
  );
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

  const [activeTab, setActiveTab] = useState<"appearance" | "provider">("provider");

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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground/80">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                <span>
                  {isSpanish
                    ? "Asistente de IA para el navegador · Sin instalación"
                    : "Browser AI assistant · No install needed"}
                </span>
              </div>

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
                  href="/auction"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
                >
                  <Gavel className="h-4 w-4" />
                  {isSpanish ? "Subasta NFT" : "NFT Auction"}
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
                {(["provider", "appearance"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === "provider" && config.provider === "site") {
                        updateConfig({ provider: "openrouter" });
                      }
                    }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,transparent)] text-foreground"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    {tab === "provider"
                      ? isSpanish
                        ? "Proveedor"
                        : "Provider"
                      : isSpanish
                        ? "Apariencia"
                        : "Appearance"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
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

                {/* ── Appearance tab ── */}
                {activeTab === "appearance" && (
                  <div className="space-y-4">
                    {/* Enable toggle */}
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                      <span className="text-sm font-semibold text-foreground">
                        {isSpanish ? "Shimeji activado" : "Shimeji enabled"}
                      </span>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateConfig({ enabled: e.target.checked })}
                        className="h-4 w-4 accent-[var(--brand-accent)]"
                      />
                    </label>

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
                              {entry.label}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
