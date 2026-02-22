"use client";

import { RefreshCw, Settings2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";

function ProviderFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig, freeSiteMessagesRemaining, freeSiteMessagesUsed } = useSiteShimeji();

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
          <input
            type="text"
            value={config.openrouterModel}
            onChange={(event) => updateConfig({ openrouterModel: event.target.value })}
            placeholder="openai/gpt-4o-mini"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
      </div>
    );
  }

  if (config.provider === "ollama") {
    return (
      <div className="space-y-3">
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
      <p className="text-xs text-muted-foreground">
        {isSpanish
          ? "OpenClaw en la web usa el gateway para chat/agente, pero no habilita acceso local a terminal o WSL."
          : "Website OpenClaw uses the gateway for chat/agent tasks, but does not enable local terminal or WSL access."}
      </p>
    </div>
  );
}

export function SiteShimejiConfigPanel() {
  const { isSpanish } = useLanguage();
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

  if (!isConfigOpen) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={isSpanish ? "Cerrar panel de configuración" : "Close configuration panel"}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={closeConfig}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-[#06080d]/95 shadow-2xl">
        <div className="flex h-full flex-col">
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
            <button
              type="button"
              onClick={closeConfig}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                {isSpanish ? "Seguridad y alcance" : "Security and scope"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {isSpanish
                  ? "Las keys y tokens se guardan solo en tu navegador (localStorage) y no se guardan en nuestro servidor. Este shimeji web no tiene acceso a WSL ni a tu terminal local."
                  : "Keys and tokens are stored only in your browser (localStorage) and are not saved on our server. This website shimeji has no WSL or local terminal access."}
              </p>
            </div>

            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Mascota" : "Mascot"}
                </h3>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(event) => updateConfig({ enabled: event.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                  />
                  {isSpanish ? "Activa" : "Enabled"}
                </label>
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
                        {personality.label}
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
                ) : (
                  <span>
                    {isSpanish
                      ? "Sprites y personalidades cargados desde runtime-core."
                      : "Sprites and personalities loaded from runtime-core."}
                  </span>
                )}
              </div>
            </section>

            <section className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {isSpanish ? "Chat y proveedor" : "Chat and provider"}
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
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
