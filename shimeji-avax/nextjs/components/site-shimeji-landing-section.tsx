"use client";

import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";

export function SiteShimejiLandingSection() {
  const { isSpanish } = useLanguage();
  const {
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
  } = useSiteShimeji();

  const heroTitle = isSpanish
    ? "Un asistente de IA siempre a la vista"
    : "An AI assistant always on screen";

  const heroSubtitle = isSpanish
    ? "Chateá, hacé preguntas y delegá tareas a un asistente siempre disponible en tu navegador."
    : "Chat, ask questions, and delegate tasks to an always-on assistant right in your browser.";

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

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Cómo empezar" : "How to start"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {isSpanish ? "Elegí un personaje →" : "Pick a character →"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {isSpanish
                      ? "Elegí tu shimeji y configurá tu proveedor en la pestaña Chat del ⚙."
                      : "Pick your shimeji and set up your provider in the Chat tab of the ⚙."}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: character selection ── */}
            <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background/40 backdrop-blur-sm">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Elegí tu personaje" : "Choose your character"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isSpanish ? "Hacé clic para seleccionar" : "Click to select"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Character grid */}
                {catalogLoading && (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={`loading-${i}`}
                        className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/40"
                      />
                    ))}
                  </div>
                )}

                {!catalogLoading && (catalog?.characters ?? []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(catalog?.characters ?? []).map((character) => (
                      <button
                        key={character.key}
                        type="button"
                        onClick={() => updateConfig({ character: character.key })}
                        className={`group flex flex-col items-center rounded-xl border p-2 text-center transition-all ${
                          config.character === character.key
                            ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)]"
                            : "border-border bg-muted/20 hover:border-[var(--brand-accent)]/50 hover:bg-muted/50"
                        }`}
                      >
                        <img
                          src={character.iconUrl}
                          alt=""
                          className="h-10 w-10 object-contain transition-transform group-hover:scale-110"
                          style={{ imageRendering: "pixelated" }}
                        />
                        <div className="mt-1 w-full truncate text-[11px] font-semibold text-foreground/90">
                          {character.label}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {catalogError && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-xs text-muted-foreground">{catalogError}</p>
                    <button
                      type="button"
                      onClick={() => reloadCatalog().catch(() => undefined)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2 py-1 text-xs hover:bg-muted/40"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {isSpanish ? "Reintentar" : "Retry"}
                    </button>
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
