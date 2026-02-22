"use client";

import Link from "next/link";
import { Download, Gavel, Settings2, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";

function ProviderBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_18%,transparent)] text-foreground"
          : "border-white/15 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function SiteShimejiLandingSection() {
  const { isSpanish } = useLanguage();
  const {
    catalog,
    catalogLoading,
    config,
    updateConfig,
    openConfig,
    canUseCurrentProvider,
    freeSiteMessagesRemaining,
  } = useSiteShimeji();

  const heroTitle = isSpanish
    ? "Tu nuevo asistente ya está aquí."
    : "Your new assistant is here.";
  const heroSubtitle = isSpanish
    ? "Personalízalo en la web, hazlo caminar por tu pantalla y seguí hablando con tus propios proveedores cuando se acaben los créditos gratis."
    : "Customize it on the website, let it walk across your screen, and keep chatting with your own providers when the free credits run out.";

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[var(--brand-accent)]/15 blur-3xl" />
            <div className="absolute right-8 top-12 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-28 w-56 rounded-full bg-pink-300/10 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-foreground/80">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                <span>
                  {isSpanish
                    ? "Shimeji web personalizable (sin WSL/terminal local)"
                    : "Customizable website shimeji (no WSL/local terminal)"}
                </span>
              </div>

              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                {heroSubtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openConfig}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white/15"
                >
                  <Settings2 className="h-4 w-4" />
                  {isSpanish ? "Abrir configuración" : "Open configuration"}
                </button>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-foreground/90 hover:bg-black/30"
                >
                  <Download className="h-4 w-4" />
                  {isSpanish ? "Descargas" : "Downloads"}
                </Link>
                <Link
                  href="/auction"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-foreground/90 hover:bg-black/30"
                >
                  <Gavel className="h-4 w-4" />
                  {isSpanish ? "Subasta" : "Auction"}
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Estado del chat" : "Chat status"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {canUseCurrentProvider
                      ? isSpanish
                        ? "Listo para conversar"
                        : "Ready to chat"
                      : isSpanish
                        ? "Falta configurar proveedor"
                        : "Provider setup needed"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {config.provider === "site"
                      ? isSpanish
                        ? `Créditos gratis restantes: ${freeSiteMessagesRemaining ?? 0}`
                        : `Free site credits remaining: ${freeSiteMessagesRemaining ?? 0}`
                      : isSpanish
                        ? `Proveedor activo: ${config.provider}`
                        : `Active provider: ${config.provider}`}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Cómo probarlo" : "How to try it"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {isSpanish ? "Haz clic en el shimeji que camina" : "Click the walking shimeji"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {isSpanish
                      ? "Arrástralo para moverlo. Usa el engranaje en el header para claves, Ollama o OpenClaw."
                      : "Drag it to move it. Use the header gear for keys, Ollama, or OpenClaw."}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Personalización rápida" : "Quick customization"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {isSpanish ? "Afecta al shimeji del sitio" : "Applies to website shimeji"}
                </span>
              </div>

              <div className="space-y-4">
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
                        className={`rounded-2xl border p-2 text-center transition-colors ${
                          config.character === character.key
                            ? "border-[var(--brand-accent)] bg-white/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
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
                      Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`loading-char-${index}`}
                          className="h-[76px] animate-pulse rounded-2xl border border-white/10 bg-white/5"
                        />
                      ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {isSpanish ? "Personalidad" : "Personality"}
                    </span>
                    <select
                      value={config.personality}
                      onChange={(event) => updateConfig({ personality: event.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                    >
                      {(catalog?.personalities ?? []).map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {isSpanish ? "Tamaño" : "Size"}
                    </span>
                    <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-2">
                      <input
                        type="range"
                        min={60}
                        max={180}
                        step={5}
                        value={config.sizePercent}
                        onChange={(event) => updateConfig({ sizePercent: Number(event.target.value) })}
                        className="w-full accent-[var(--brand-accent)]"
                      />
                      <div className="mt-1 text-right text-xs text-muted-foreground">
                        {config.sizePercent}%
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Proveedor de chat" : "Chat provider"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProviderBadge
                      label={isSpanish ? "Gratis" : "Free"}
                      active={config.provider === "site"}
                      onClick={() => updateConfig({ provider: "site" })}
                    />
                    <ProviderBadge
                      label="OpenRouter"
                      active={config.provider === "openrouter"}
                      onClick={() => updateConfig({ provider: "openrouter" })}
                    />
                    <ProviderBadge
                      label="Ollama"
                      active={config.provider === "ollama"}
                      onClick={() => updateConfig({ provider: "ollama" })}
                    />
                    <ProviderBadge
                      label="OpenClaw"
                      active={config.provider === "openclaw"}
                      onClick={() => updateConfig({ provider: "openclaw" })}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
                  {isSpanish
                    ? "Para pegar claves/tokens (OpenRouter/OpenClaw) o ajustar URLs/modelos (Ollama/OpenClaw), abre la configuración completa con el engranaje."
                    : "To paste keys/tokens (OpenRouter/OpenClaw) or adjust URLs/models (Ollama/OpenClaw), open the full configuration from the gear icon."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
