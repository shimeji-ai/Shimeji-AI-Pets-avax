"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  Download,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { SettingsMenu } from "@/components/settings-menu";

type ShortcutCardProps = {
  icon: LucideIcon;
  label: string;
  href: string;
};

function ShortcutCard({ icon: Icon, label, href }: ShortcutCardProps) {
  return (
    <Link
      href={href}
      className="group flex w-[96px] flex-col items-center gap-3 rounded-[1.6rem] p-2 text-center transition-transform duration-200 hover:-translate-y-1"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/20 bg-white/45 shadow-[0_18px_35px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors duration-200 group-hover:bg-white/60">
        <Icon className="h-6 w-6 text-foreground" />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
        {label}
      </span>
    </Link>
  );
}

export function SiteMochiLandingSection() {
  const { isSpanish, language } = useLanguage();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);

  const t = (en: string, es: string) => (isSpanish ? es : en);
  const locale = language === "es" ? "es-AR" : "en-US";
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(clock);
  const dayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(clock);

  const shortcuts = [
    {
      href: "/marketplace",
      icon: ShoppingBag,
      label: t("Marketplace", "Marketplace"),
    },
    {
      href: "/download",
      icon: Download,
      label: t("Download", "Descarga"),
    },
    {
      href: "/help",
      icon: CircleHelp,
      label: t("Help", "Ayuda"),
    },
  ] satisfies ShortcutCardProps[];

  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:h-screen lg:min-h-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(112,164,222,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_55%)]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-2rem)] max-w-7xl flex-col lg:h-[calc(100svh-3rem)] lg:min-h-0">
        <div className="sticky top-0 z-30 rounded-[1.2rem] border border-white/25 bg-background/60 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  Mochi Agents
                </p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/55">
                  {t("desktop shell", "shell del escritorio")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-[1rem] border border-border bg-card/75 px-3 py-2 text-right shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {dayLabel}
                </p>
                <p className="text-sm font-semibold tracking-[-0.03em] text-foreground">
                  {timeLabel}
                </p>
              </div>
              <SettingsMenu />
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex flex-1 overflow-hidden rounded-[2rem] border border-white/25 bg-card/50 shadow-[0_30px_110px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(61,43,82,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.09)_1px,transparent_1px)] [background-size:88px_88px]" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center">
              <div className="text-[22vw] font-black uppercase leading-none tracking-[-0.16em] text-foreground/[0.05]">
                OS
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.38em] text-foreground/30">
                Mochi Agents
              </div>
            </div>
          </div>

          <div className="relative z-10 grid auto-rows-max grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:content-start">
            {shortcuts.map((shortcut) => (
              <ShortcutCard key={shortcut.href} {...shortcut} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
