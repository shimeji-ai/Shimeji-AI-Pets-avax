"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Circle,
  CircleHelp,
  Download,
  MonitorSmartphone,
  Settings2,
  ShoppingBag,
  Sparkles,
  Volume2,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import {
  useSiteMochi,
  type SiteMochiCharacterOption,
} from "@/components/site-mochi-provider";
import { getSiteMochiPersonalityDisplayLabel } from "@/lib/site-mochi-personality-labels";

type ShortcutCardProps = {
  icon: LucideIcon;
  label: string;
  hint: string;
  href?: string;
  onClick?: () => void;
};

type LandingCharacterOption = SiteMochiCharacterOption & {
  stageSrc?: string;
};

const FALLBACK_CHARACTER: LandingCharacterOption = {
  key: "mochi",
  label: "Mochi",
  iconUrl: "/deploy-seed/local/sprites/mochi-idle.png",
  spritesBaseUri: null,
  stageSrc: "/deploy-seed/local/sprites/mochi-idle.png",
};

const HOME_CHARACTERS: LandingCharacterOption[] = [
  FALLBACK_CHARACTER,
  {
    key: "blob",
    label: "Blob",
    iconUrl: "/deploy-seed/local/sprites/blob-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/blob-idle.png",
  },
  {
    key: "ghost",
    label: "Ghost",
    iconUrl: "/deploy-seed/local/sprites/ghost-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/ghost-idle.png",
  },
  {
    key: "kitten",
    label: "Kitten",
    iconUrl: "/deploy-seed/local/sprites/kitten-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/kitten-idle.png",
  },
  {
    key: "penguin",
    label: "Penguin",
    iconUrl: "/deploy-seed/local/sprites/penguin-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/penguin-idle.png",
  },
  {
    key: "bunny",
    label: "Bunny",
    iconUrl: "/deploy-seed/local/sprites/bunny-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/bunny-idle.png",
  },
  {
    key: "egg",
    label: "Egg",
    iconUrl: "/deploy-seed/local/sprites/egg-idle.png",
    spritesBaseUri: null,
    stageSrc: "/deploy-seed/local/sprites/egg-idle.png",
  },
];

const HOME_PERSONALITIES = [
  { key: "cozy", label: "Cozy" },
  { key: "chaotic", label: "Chaotic" },
  { key: "cryptid", label: "Cryptid" },
  { key: "egg", label: "Egg" },
  { key: "hype", label: "Hype Beast" },
  { key: "noir", label: "Noir" },
  { key: "philosopher", label: "Philosopher" },
];

const PERSONALITY_FLAVORS: Record<
  string,
  {
    noteEn: string;
    noteEs: string;
    quoteEn: string;
    quoteEs: string;
  }
> = {
  chaotic: {
    noteEn: "Gremlin commentary for weird tabs.",
    noteEs: "Comentario gremlin para pestanas raras.",
    quoteEn: "This tab feels illegal in a fun way.",
    quoteEs: "Esta pestana se siente ilegal, pero divertida.",
  },
  cozy: {
    noteEn: "Gentle warmth for long nights online.",
    noteEs: "Calma suave para noches largas online.",
    quoteEn: "Slow down. I saw you do one good thing already.",
    quoteEs: "Baja un cambio. Ya te vi hacer una cosa bien.",
  },
  cryptid: {
    noteEn: "Dry observations and awkward truths.",
    noteEs: "Observaciones secas y verdades incomodas.",
    quoteEn: "Interesting choice. Not optimal, but almost none are.",
    quoteEs: "Eleccion interesante. Optima no era, pero casi ninguna lo es.",
  },
  egg: {
    noteEn: "Shy, hopeful, almost hatching.",
    noteEs: "Timida, esperanzada, casi por nacer.",
    quoteEn: "Stay with me a bit. I think today might be the day.",
    quoteEs: "Quedate un ratito. Siento que hoy podria ser el dia.",
  },
  hype: {
    noteEn: "Pure encouragement for every click.",
    noteEs: "Puro empuje para cada click.",
    quoteEn: "That click had conviction. I respect it.",
    quoteEs: "Ese click tuvo conviccion. Lo respeto.",
  },
  noir: {
    noteEn: "A tiny detective for suspicious pages.",
    noteEs: "Un detective minimo para paginas sospechosas.",
    quoteEn: "Another search. You are chasing something again.",
    quoteEs: "Otra busqueda. Andas persiguiendo algo otra vez.",
  },
  philosopher: {
    noteEn: "Existential thoughts between tabs.",
    noteEs: "Pensamientos existenciales entre pestanas.",
    quoteEn: "Every closed tab is a life unlived.",
    quoteEs: "Cada pestana cerrada es una vida no vivida.",
  },
};

function buildStageSpriteSrc(character: LandingCharacterOption | null | undefined) {
  const target = character ?? FALLBACK_CHARACTER;
  if (target.spritesBaseUri) {
    return `${target.spritesBaseUri.replace(/\/+$/, "")}/stand-neutral.png`;
  }
  if (target.stageSrc) {
    return target.stageSrc;
  }
  if (target.iconUrl.startsWith("/deploy-seed/")) {
    return target.iconUrl;
  }
  return `/api/site-mochi/sprite/${encodeURIComponent(target.key)}/stand-neutral.png`;
}

function ShortcutCard({ icon: Icon, label, hint, href, onClick }: ShortcutCardProps) {
  const content: ReactNode = (
    <>
      <span className="flex h-15 w-15 items-center justify-center rounded-[1.2rem] border border-white/20 bg-white/40 shadow-[0_18px_35px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105 group-hover:bg-white/55">
        <Icon className="h-5 w-5 text-foreground" />
      </span>
      <div className="mt-2.5 text-center">
        <div className="text-sm font-semibold tracking-[-0.03em] text-foreground drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
          {label}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60">
          {hint}
        </div>
      </div>
    </>
  );

  const className =
    "group flex min-h-[112px] flex-col items-center justify-start rounded-[1.4rem] px-2 py-3 transition-all duration-300 hover:-translate-y-1";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function SiteMochiLandingSection() {
  const { isSpanish, language, setLanguage } = useLanguage();
  const {
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
    openConfig,
  } = useSiteMochi();
  const [clock, setClock] = useState(() => new Date());
  const [stageSpriteSrc, setStageSpriteSrc] = useState(() =>
    buildStageSpriteSrc(FALLBACK_CHARACTER),
  );

  const t = (en: string, es: string) => (isSpanish ? es : en);
  const characters: LandingCharacterOption[] =
    (catalog?.characters?.length ?? 0) > 0 ? catalog?.characters ?? [] : HOME_CHARACTERS;
  const personalities =
    (catalog?.personalities?.length ?? 0) > 0 ? catalog?.personalities ?? [] : HOME_PERSONALITIES;
  const currentCharacter =
    characters.find((entry) => entry.key === config.character) ??
    characters[0] ??
    FALLBACK_CHARACTER;
  const currentPersonality = personalities.find(
    (entry) => entry.key === config.personality,
  );
  const currentFlavor =
    PERSONALITY_FLAVORS[currentPersonality?.key ?? config.personality] ??
    PERSONALITY_FLAVORS.cozy;
  const currentPersonalityLabel = currentPersonality
    ? getSiteMochiPersonalityDisplayLabel(currentPersonality, isSpanish)
    : isSpanish
      ? "Acogedora"
      : "Cozy";
  const currentCharacterKey = currentCharacter.key;
  const currentCharacterIconUrl = currentCharacter.iconUrl;
  const currentCharacterSpritesBaseUri = currentCharacter.spritesBaseUri;
  const currentCharacterStageSrc = currentCharacter.stageSrc;

  useEffect(() => {
    setStageSpriteSrc(
      currentCharacterStageSrc
        ? currentCharacterStageSrc
        : currentCharacterSpritesBaseUri
          ? `${currentCharacterSpritesBaseUri.replace(/\/+$/, "")}/stand-neutral.png`
          : `/api/site-mochi/sprite/${encodeURIComponent(currentCharacterKey)}/stand-neutral.png`,
    );
  }, [currentCharacterKey, currentCharacterSpritesBaseUri, currentCharacterStageSrc]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);

  const timeLabel = new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(clock);
  const dayLabel = new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(clock);

  return (
    <section className="relative min-h-screen overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(112,164,222,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_55%)]" />
      <div className="pointer-events-none absolute right-8 top-28 text-[18vw] font-black uppercase leading-none tracking-[-0.14em] text-foreground/[0.05]">
        OS
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-2rem)] max-w-7xl flex-col lg:h-[calc(100svh-3rem)] lg:min-h-0">
        <div className="sticky top-0 z-30 rounded-[1.2rem] border border-white/25 bg-background/60 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="hidden items-center gap-4 sm:flex">
                <span className="text-sm font-semibold text-foreground">Mochi OS</span>
                <span className="text-sm text-foreground/75">{t("Desktop", "Escritorio")}</span>
                <span className="text-sm text-foreground/75">{t("Companion", "Companion")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex rounded-full border border-border bg-card/70 p-1">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    language === "en" ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("es")}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    language === "es" ? "bg-foreground text-background" : "text-muted-foreground"
                  }`}
                >
                  ES
                </button>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-muted-foreground sm:inline-flex">
                <Wifi className="h-4 w-4" />
                <Volume2 className="h-4 w-4" />
              </div>

              <div className="rounded-[1rem] border border-border bg-card/75 px-3 py-2 text-right shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {dayLabel}
                </p>
                <p className="text-sm font-semibold tracking-[-0.03em] text-foreground">
                  {timeLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid flex-1 gap-5 lg:min-h-0 lg:grid-cols-[120px_minmax(0,1fr)_250px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:auto-rows-max lg:content-start lg:grid-cols-1">
            <ShortcutCard
              icon={ShoppingBag}
              href="/marketplace"
              label={t("Marketplace", "Marketplace")}
              hint={t("wallet + auctions", "wallet + subastas")}
            />
            <ShortcutCard
              icon={Download}
              href="/download"
              label={t("Download", "Descarga")}
              hint={t("desktop build", "version desktop")}
            />
            <ShortcutCard
              icon={CircleHelp}
              href="/help"
              label={t("Help", "Ayuda")}
              hint={t("setup + feedback", "setup + feedback")}
            />
            <ShortcutCard
              icon={Settings2}
              onClick={openConfig}
              label={t("Config", "Config")}
              hint={t("open panel", "abrir panel")}
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/25 bg-card/55 shadow-[0_30px_110px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#fb7185]" />
                <span className="h-3 w-3 rounded-full bg-[#fbbf24]" />
                <span className="h-3 w-3 rounded-full bg-[#34d399]" />
                <span className="ml-2 text-sm font-semibold tracking-[-0.03em] text-foreground">
                  Mochi Companion.app
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("connect lives in marketplace", "connect vive en marketplace")}
              </div>
            </div>

            <div className="grid flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_220px] lg:p-5">
              <div
                className="flex min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-white/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--foreground) 14%, transparent), color-mix(in srgb, var(--foreground) 22%, var(--background)) 58%, color-mix(in srgb, var(--brand-accent) 10%, var(--background)) 100%)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/55">
                      {t("wallpaper pet", "mascota de escritorio")}
                    </p>
                    <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                      {currentCharacter.label}
                    </h1>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    {currentPersonalityLabel}
                  </div>
                </div>

                <div className="relative mt-5 flex flex-1 items-center justify-center">
                  <div className="absolute h-64 w-64 rounded-full border border-white/10 bg-white/5 blur-[1px]" />
                  <div className="absolute h-56 w-56 rounded-full border border-white/10" />
                  <div className="absolute h-44 w-44 rounded-full bg-black/18 blur-2xl" />
                  <div className="absolute left-3 top-5 rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-white/70 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                    <p className="text-[11px] uppercase tracking-[0.22em]">
                      {t("shell", "cuerpo")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {currentCharacter.label}
                    </p>
                  </div>
                  <div className="absolute right-3 top-16 rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3 text-right text-white/70 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                    <p className="text-[11px] uppercase tracking-[0.22em]">
                      {t("mind", "mente")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {currentPersonalityLabel}
                    </p>
                  </div>

                  <img
                    src={stageSpriteSrc}
                    alt={currentCharacter.label}
                    onError={() => setStageSpriteSrc(currentCharacterIconUrl)}
                    className="relative z-10 h-56 w-56 object-contain drop-shadow-[0_28px_44px_rgba(0,0,0,0.34)] sm:h-72 sm:w-72"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_160px]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4 text-white/85 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                      {t("current mood", "mood actual")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/72">
                      {isSpanish ? currentFlavor.noteEs : currentFlavor.noteEn}
                    </p>
                    <p className="mt-3 text-base leading-relaxed tracking-[-0.02em] text-white">
                      <span aria-hidden="true">&ldquo;</span>
                      {isSpanish ? currentFlavor.quoteEs : currentFlavor.quoteEn}
                      <span aria-hidden="true">&rdquo;</span>
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 text-white/78 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                      {t("device", "dispositivo")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                      {t(
                        "Routes behave like desktop apps. Config opens the live panel.",
                        "Las rutas funcionan como apps del escritorio. Config abre el panel vivo.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <div className="rounded-[1.8rem] border border-white/20 bg-background/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("System", "Sistema")}
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-card/65 px-3 py-3 text-sm">
                      <span className="text-foreground/80">{t("Shell", "Shell")}</span>
                      <span className="font-semibold text-foreground">{currentCharacter.label}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-card/65 px-3 py-3 text-sm">
                      <span className="text-foreground/80">{t("Persona", "Persona")}</span>
                      <span className="font-semibold text-foreground">{currentPersonalityLabel}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-card/65 px-3 py-3 text-sm">
                      <span className="text-foreground/80">{t("Wallet", "Wallet")}</span>
                      <span className="font-semibold text-foreground">{t("in Marketplace", "en Marketplace")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-[1.8rem] border border-white/20 bg-background/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("Mood stack", "Stack de mood")}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:min-h-0 lg:flex-1 lg:auto-rows-max lg:grid-cols-1 lg:overflow-y-auto">
                    {catalogLoading && personalities.length === 0
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={`personality-skeleton-${index}`}
                            className="h-14 animate-pulse rounded-2xl border border-border bg-card/60"
                          />
                        ))
                      : personalities.map((personality) => {
                          const active = config.personality === personality.key;
                          return (
                            <button
                              key={personality.key}
                              type="button"
                              onClick={() => updateConfig({ personality: personality.key })}
                              className={`rounded-[1.2rem] border px-3 py-3 text-left transition-all ${
                                active
                                  ? "border-foreground bg-foreground text-background shadow-[0_16px_32px_rgba(0,0,0,0.15)]"
                                  : "border-border bg-card/60 text-foreground hover:border-foreground/30 hover:bg-card"
                              }`}
                            >
                              <div className="text-xs font-semibold uppercase tracking-[0.2em]">
                                {getSiteMochiPersonalityDisplayLabel(personality, isSpanish)}
                              </div>
                              <div className={`mt-1 text-xs ${active ? "text-background/75" : "text-muted-foreground"}`}>
                                {isSpanish
                                  ? PERSONALITY_FLAVORS[personality.key]?.noteEs || currentFlavor.noteEs
                                  : PERSONALITY_FLAVORS[personality.key]?.noteEn || currentFlavor.noteEn}
                              </div>
                            </button>
                          );
                        })}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/20 bg-background/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("Status", "Estado")}
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/85">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                      <span>{t("Desktop online", "Escritorio online")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                      <span>{t("Use icons as app launchers", "Usa los iconos como lanzadores")}</span>
                    </div>
                    {catalogError ? (
                      <button
                        type="button"
                        onClick={() => reloadCatalog().catch(() => undefined)}
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-card"
                      >
                        {t("Retry catalog", "Reintentar catalogo")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/70 bg-background/40 px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {t("Dock", "Dock")}
                  </p>
                  <p className="text-sm text-foreground/80">
                    {t("Swap the shell without leaving the desktop.", "Cambia el cuerpo sin salir del escritorio.")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {catalogLoading && characters.length === 0
                  ? Array.from({ length: 7 }).map((_, index) => (
                      <div
                        key={`dock-skeleton-${index}`}
                        className="h-20 w-20 shrink-0 animate-pulse rounded-[1.4rem] border border-border bg-card/60"
                      />
                    ))
                  : characters.map((character) => {
                      const active = config.character === character.key;
                      return (
                        <button
                          key={character.key}
                          type="button"
                          onClick={() => updateConfig({ character: character.key })}
                          className={`shrink-0 rounded-[1.4rem] border px-3 py-3 text-center transition-all ${
                            active
                              ? "border-foreground bg-foreground text-background shadow-[0_16px_34px_rgba(0,0,0,0.15)]"
                              : "border-border bg-card/65 text-foreground hover:border-foreground/35 hover:bg-card"
                          }`}
                        >
                          <img
                            src={character.iconUrl}
                            alt=""
                            className={`mx-auto h-9 w-9 object-contain ${active ? "brightness-0 invert" : ""}`}
                            style={{ imageRendering: "pixelated" }}
                          />
                          <div className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "text-background/80" : "text-muted-foreground"}`}>
                            {character.label.split(" ")[0]}
                          </div>
                        </button>
                      );
                    })}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:min-h-0">
            <div className="rounded-[1.8rem] border border-white/20 bg-card/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("Desktop", "Escritorio")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                {t(
                  "This page is the OS shell. Routes launch from icons, not from a marketing stack.",
                  "Esta pagina es la carcasa del SO. Las rutas salen de iconos, no de una pila de marketing.",
                )}
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-white/20 bg-card/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("Control center", "Centro de control")}
              </p>
              <div className="mt-4 space-y-3 text-sm text-foreground/85">
                <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-background/65 px-3 py-3">
                  <span>{t("Network", "Red")}</span>
                  <span className="font-semibold text-foreground">{t("Online", "Online")}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-background/65 px-3 py-3">
                  <span>{t("Audio", "Audio")}</span>
                  <span className="font-semibold text-foreground">{t("Enabled", "Activo")}</span>
                </div>
                <div className="flex items-center justify-between rounded-[1.2rem] border border-border bg-background/65 px-3 py-3">
                  <span>{t("Companion", "Companion")}</span>
                  <span className="font-semibold text-foreground">{currentCharacter.label}</span>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-background/65 px-3 py-3 text-muted-foreground">
                  {t(
                    "Desktop icons on the left are the only app launchers.",
                    "Los iconos del escritorio a la izquierda son los unicos lanzadores.",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
