"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Settings2, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteMochi } from "@/components/site-mochi-provider";
import { getSiteMochiPersonalityDisplayLabel } from "@/lib/site-mochi-personality-labels";

const SPARKLE_POSITIONS = [
  { x: -72, y: -88, delay: 0,    dur: 2.8, size: 5 },
  { x:  78, y: -64, delay: 0.5,  dur: 3.2, size: 3 },
  { x: -90, y:  16, delay: 1.0,  dur: 2.6, size: 4 },
  { x:  88, y:  32, delay: 1.4,  dur: 3.6, size: 3 },
  { x: -48, y:  88, delay: 0.3,  dur: 2.4, size: 4 },
  { x:  56, y:  96, delay: 0.8,  dur: 3.0, size: 5 },
  { x:  20, y: -96, delay: 1.8,  dur: 2.9, size: 3 },
  { x: -24, y:  60, delay: 1.1,  dur: 3.4, size: 2 },
];

const PERSONALITY_FLAVORS: Record<
  string,
  {
    quoteEn: string;
    quoteEs: string;
    hintEn: string;
    hintEs: string;
  }
> = {
  chaotic: {
    quoteEn: "This tab feels illegal in a fun way.",
    quoteEs: "Esta pestana se siente ilegal, pero divertida.",
    hintEn: "gremlin commentary armed",
    hintEs: "comentario gremlin armado",
  },
  cozy: {
    quoteEn: "Slow down. I saw you do one good thing already.",
    quoteEs: "Baja un cambio. Ya te vi hacer una cosa bien.",
    hintEn: "soft blanket mode armed",
    hintEs: "modo manta suave armado",
  },
  cryptid: {
    quoteEn: "Interesting choice. Not optimal, but almost none are.",
    quoteEs: "Eleccion interesante. Optima no era, pero casi ninguna lo es.",
    hintEn: "dry observer armed",
    hintEs: "observadora seca armada",
  },
  egg: {
    quoteEn: "Stay with me a bit. I think today might be the day.",
    quoteEs: "Quedate un ratito. Siento que hoy podria ser el dia.",
    hintEn: "almost hatching",
    hintEs: "por nacer",
  },
  hype: {
    quoteEn: "That click had conviction. I respect it.",
    quoteEs: "Ese click tuvo conviccion. Lo respeto.",
    hintEn: "maximum encouragement armed",
    hintEs: "maximo empuje armado",
  },
  noir: {
    quoteEn: "Another search. You are chasing something again.",
    quoteEs: "Otra busqueda. Andas persiguiendo algo otra vez.",
    hintEn: "rain-soaked detective armed",
    hintEs: "detective bajo lluvia armado",
  },
  philosopher: {
    quoteEn: "Every closed tab is a life unlived.",
    quoteEs: "Cada pestana cerrada es una vida no vivida.",
    hintEn: "tiny existentialist armed",
    hintEs: "existencialista minima armada",
  },
};

export function SiteMochiLandingSection() {
  const { isSpanish } = useLanguage();
  const {
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
    openConfig,
  } = useSiteMochi();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const currentCharacter = catalog?.characters.find(
    (c) => c.key === config.character,
  );
  const currentPersonality = catalog?.personalities.find(
    (p) => p.key === config.personality,
  );
  const currentFlavor =
    PERSONALITY_FLAVORS[currentPersonality?.key ?? config.personality] ??
    PERSONALITY_FLAVORS.cozy;
  const currentPersonalityLabel = currentPersonality
    ? getSiteMochiPersonalityDisplayLabel(currentPersonality, isSpanish)
    : isSpanish
      ? "Acogedora"
      : "Cozy";

  return (
    <section className="landing-stage relative min-h-screen flex flex-col overflow-hidden bg-background">

      {/* ── Atmosphere ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, color-mix(in srgb, var(--brand-accent) 6%, transparent) 0%, transparent 100%)",
        }}
      />
      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "160px 160px",
        }}
      />

      {/* ── Stage ── */}
      <div
        className="relative z-20 flex-1 flex flex-col items-center justify-center pt-20"
        style={{
          paddingBottom: "calc(235px + 2rem)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(14px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}
      >
        {/* Character halo + sprite */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 340,
              height: 340,
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--brand-accent) 18%, transparent) 0%, transparent 68%)",
              animation: "mochi-ring 4.5s ease-in-out infinite",
            }}
          />

          {/* Pixel sparkles */}
          {SPARKLE_POSITIONS.map((s, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: `calc(50% + ${s.x}px)`,
                top: `calc(50% + ${s.y}px)`,
                width: s.size,
                height: s.size,
                background: "var(--brand-accent)",
                borderRadius: 1,
                animation: `mochi-sparkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
              }}
            />
          ))}

          {/* The character */}
          {currentCharacter ? (
            <>
              <div
                className="absolute left-[-1rem] top-8 hidden rounded-2xl border border-border/60 bg-background/78 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur md:block"
                style={{ transform: "rotate(-6deg)" }}
              >
                <p
                  className="font-mono uppercase text-muted-foreground/60"
                  style={{ fontSize: "0.55rem", letterSpacing: "0.2em" }}
                >
                  {isSpanish ? "cuerpo" : "shell"}
                </p>
                <p
                  className="mt-1 font-mono font-bold uppercase text-foreground"
                  style={{ fontSize: "0.72rem", letterSpacing: "0.16em" }}
                >
                  {currentCharacter.label}
                </p>
              </div>

              <div
                className="absolute right-[-1rem] top-28 hidden rounded-2xl border border-border/60 bg-background/78 px-4 py-3 text-right shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur md:block"
                style={{ transform: "rotate(6deg)" }}
              >
                <p
                  className="font-mono uppercase text-muted-foreground/60"
                  style={{ fontSize: "0.55rem", letterSpacing: "0.2em" }}
                >
                  {isSpanish ? "mente" : "mind"}
                </p>
                <p
                  className="mt-1 font-mono font-bold uppercase text-foreground"
                  style={{ fontSize: "0.72rem", letterSpacing: "0.16em" }}
                >
                  {currentPersonalityLabel}
                </p>
              </div>

              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 228,
                  height: 228,
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--foreground) 26%, transparent) 0%, color-mix(in srgb, var(--foreground) 16%, transparent) 46%, transparent 78%)",
                  boxShadow:
                    "0 22px 70px color-mix(in srgb, var(--foreground) 18%, transparent)",
                }}
              />
              <div
                className="absolute rounded-full pointer-events-none border border-foreground/12"
                style={{
                  width: 180,
                  height: 180,
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--background) 8%, transparent) 0%, transparent 72%)",
                }}
              />

              <img
                key={currentCharacter.key}
                src={currentCharacter.iconUrl}
                alt={currentCharacter.label}
                className="character-sprite"
                style={{
                  width: 260,
                  height: 260,
                  objectFit: "contain",
                  imageRendering: "pixelated",
                  filter:
                    "drop-shadow(0 0 40px color-mix(in srgb, var(--brand-accent) 35%, transparent))",
                  animation: "mochi-float 3.8s ease-in-out infinite",
                }}
              />
            </>
          ) : (
            <div
              className="rounded-3xl bg-muted/25 animate-pulse"
              style={{ width: 260, height: 260 }}
            />
          )}
        </div>

        {/* Name + tagline */}
        <div
          className="mt-7 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "none" : "translateY(8px)",
            transition: "opacity 1s 0.25s ease, transform 1s 0.25s ease",
          }}
        >
          {currentCharacter ? (
            <>
              <p
                className="font-mono font-bold uppercase text-foreground"
                style={{ fontSize: "1.35rem", letterSpacing: "0.22em" }}
              >
                {currentCharacter.label}
              </p>
              <p
                className="mt-1.5 font-mono uppercase text-muted-foreground/50"
                style={{ fontSize: "0.62rem", letterSpacing: "0.28em" }}
              >
                {isSpanish
                  ? "· listo para acompañarte ·"
                  : "· ready to accompany you ·"}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 font-mono uppercase text-foreground"
                  style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}
                >
                  <Sparkles className="h-3 w-3" />
                  {currentPersonalityLabel}
                </span>
                <span
                  className="rounded-full border border-border bg-background/55 px-3 py-1 font-mono uppercase text-muted-foreground"
                  style={{ fontSize: "0.58rem", letterSpacing: "0.18em" }}
                >
                  {isSpanish ? currentFlavor.hintEs : currentFlavor.hintEn}
                </span>
              </div>
              <p className="mx-auto mt-4 max-w-xl px-6 text-sm leading-relaxed text-foreground/82">
                <span aria-hidden="true">&ldquo;</span>
                {isSpanish ? currentFlavor.quoteEs : currentFlavor.quoteEn}
                <span aria-hidden="true">&rdquo;</span>
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openConfig}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/72 px-4 py-2 font-mono uppercase text-foreground transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.18em" }}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {isSpanish ? "abrir controles" : "open controls"}
                </button>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/55 px-4 py-2 font-mono uppercase text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.18em" }}
                >
                  {isSpanish ? "bajar desktop" : "get desktop"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto h-5 w-36 animate-pulse rounded bg-muted/30" />
              <div className="mx-auto mt-2 h-3 w-48 animate-pulse rounded bg-muted/20" />
            </>
          )}
        </div>
      </div>

      {/* ── Bottom: character select + links ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          background:
            "linear-gradient(to top, var(--background) 55%, transparent)",
          paddingBottom: "1.75rem",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(20px)",
          transition: "opacity 0.9s 0.35s ease, transform 0.9s 0.35s ease",
        }}
      >
        {/* Divider line */}
        <div
          className="mx-auto mb-4"
          style={{
            height: 1,
            maxWidth: 480,
            background:
              "linear-gradient(to right, transparent, color-mix(in srgb, var(--brand-accent) 25%, var(--border)), transparent)",
          }}
        />

        <div className="mb-2 text-center">
          <p
            className="font-mono uppercase text-muted-foreground/42"
            style={{ fontSize: "0.55rem", letterSpacing: "0.28em" }}
          >
            {isSpanish ? "elige la mente" : "choose the mind"}
          </p>
        </div>

        <div
          className="flex gap-2 overflow-x-auto px-5 justify-center landing-strip"
          style={{ scrollbarWidth: "none" }}
        >
          {catalogLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`mind-${i}`}
                className="shrink-0 animate-pulse rounded-full bg-muted/25"
                style={{ width: 96, height: 34 }}
              />
            ))}

          {!catalogLoading &&
            catalog?.personalities.map((personality) => {
              const active = config.personality === personality.key;
              return (
                <button
                  key={personality.key}
                  type="button"
                  onClick={() => updateConfig({ personality: personality.key })}
                  className="shrink-0 rounded-full border px-4 py-2 transition-all duration-200"
                  style={{
                    borderColor: active ? "var(--brand-accent)" : "var(--border)",
                    background: active
                      ? "color-mix(in srgb, var(--brand-accent) 12%, transparent)"
                      : "color-mix(in srgb, var(--muted) 18%, transparent)",
                    boxShadow: active
                      ? "0 0 12px color-mix(in srgb, var(--brand-accent) 20%, transparent)"
                      : "none",
                  }}
                >
                  <span
                    className="font-mono font-bold uppercase"
                    style={{
                      fontSize: "0.58rem",
                      letterSpacing: "0.15em",
                      color: active ? "var(--brand-accent)" : "var(--muted-foreground)",
                    }}
                  >
                    {getSiteMochiPersonalityDisplayLabel(personality, isSpanish)}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="mt-4 mb-2 text-center">
          <p
            className="font-mono uppercase text-muted-foreground/42"
            style={{ fontSize: "0.55rem", letterSpacing: "0.28em" }}
          >
            {isSpanish ? "elige el cuerpo" : "choose the shell"}
          </p>
        </div>

        {/* Character strip */}
        <div
          className="flex gap-2 overflow-x-auto px-5 justify-center landing-strip"
          style={{ scrollbarWidth: "none" }}
        >
          {catalogLoading &&
            Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 animate-pulse rounded-xl bg-muted/25"
                style={{ width: 64, height: 58 }}
              />
            ))}

          {!catalogLoading &&
            catalog?.characters.map((character) => {
              const active = config.character === character.key;
              return (
                <button
                  key={character.key}
                  type="button"
                  onClick={() => updateConfig({ character: character.key })}
                  className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-200"
                  style={{
                    borderColor: active
                      ? "var(--brand-accent)"
                      : "var(--border)",
                    background: active
                      ? "color-mix(in srgb, var(--brand-accent) 10%, transparent)"
                      : "color-mix(in srgb, var(--muted) 18%, transparent)",
                    boxShadow: active
                      ? "0 0 12px color-mix(in srgb, var(--brand-accent) 20%, transparent)"
                      : "none",
                  }}
                >
                  <img
                    src={character.iconUrl}
                    alt=""
                    style={{
                      width: 28,
                      height: 28,
                      imageRendering: "pixelated",
                      objectFit: "contain",
                    }}
                  />
                  <span
                    className="font-mono font-bold uppercase"
                    style={{
                      fontSize: "0.58rem",
                      letterSpacing: "0.12em",
                      color: active
                        ? "var(--brand-accent)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {character.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
        </div>

        {catalogError && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={() => reloadCatalog().catch(() => undefined)}
              className="inline-flex items-center gap-1.5 font-mono uppercase text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontSize: "0.6rem", letterSpacing: "0.15em" }}
            >
              <RefreshCw className="h-3 w-3" />
              {isSpanish ? "reintentar" : "retry"}
            </button>
          </div>
        )}

        {/* Ghost nav */}
        <div className="flex items-center justify-center gap-5 mt-4">
          <Link
            href="/download"
            className="font-mono uppercase text-muted-foreground/45 hover:text-muted-foreground transition-colors"
            style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
          >
            {isSpanish ? "descargar" : "get the app"}
          </Link>
          <span
            className="font-mono text-muted-foreground/20"
            style={{ fontSize: "0.6rem" }}
          >
            ·
          </span>
          <Link
            href="/marketplace"
            className="font-mono uppercase text-muted-foreground/45 hover:text-muted-foreground transition-colors"
            style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
          >
            marketplace
          </Link>
          <span
            className="font-mono text-muted-foreground/20"
            style={{ fontSize: "0.6rem" }}
          >
            ·
          </span>
          <Link
            href="/help"
            className="font-mono uppercase text-muted-foreground/45 hover:text-muted-foreground transition-colors"
            style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
          >
            {isSpanish ? "ayuda" : "help"}
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes mochi-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-20px); }
        }
        @keyframes mochi-ring {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.07); }
        }
        @keyframes mochi-sparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.6) rotate(0deg); }
          50%       { opacity: 0.85; transform: scale(1.4) rotate(45deg); }
        }
        .landing-strip::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
