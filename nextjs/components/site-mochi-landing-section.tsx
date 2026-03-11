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
      className="group flex w-[104px] flex-col items-center gap-2 rounded-none p-1 text-center transition-transform duration-150 hover:-translate-y-1"
    >
      <span className="relative flex h-16 w-16 items-center justify-center rounded-none border-2 border-foreground/15 bg-white/55 shadow-[4px_4px_0_rgba(24,18,37,0.18)] backdrop-blur-sm transition-all duration-150 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:bg-white/68 group-hover:shadow-[2px_2px_0_rgba(24,18,37,0.18)]">
        <span className="absolute left-1 top-1 h-1.5 w-1.5 bg-white/75" />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-foreground/12" />
        <Icon className="h-6 w-6 text-foreground" strokeWidth={2.25} />
      </span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/85">
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
        <div className="sticky top-0 z-30 rounded-none border-2 border-white/25 bg-background/60 px-4 py-2.5 shadow-[6px_6px_0_rgba(24,18,37,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-foreground/15 bg-foreground text-background shadow-[4px_4px_0_rgba(24,18,37,0.15)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
                  Mochi Agents
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/55">
                  {t("desktop shell", "shell del escritorio")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-none border-2 border-border bg-card/80 px-3 py-2 text-right shadow-[4px_4px_0_rgba(24,18,37,0.12)]">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {dayLabel}
                </p>
                <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  {timeLabel}
                </p>
              </div>
              <div className="[&_button]:rounded-none [&_button]:border-2 [&_button]:border-foreground/15 [&_button]:bg-card/80 [&_button]:font-mono [&_button]:shadow-[4px_4px_0_rgba(24,18,37,0.12)]">
                <SettingsMenu />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex flex-1 overflow-hidden rounded-none border-2 border-white/25 bg-card/50 shadow-[8px_8px_0_rgba(24,18,37,0.14)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center">
              <div className="font-mono text-[22vw] font-black uppercase leading-none tracking-[-0.16em] text-foreground/[0.06]">
                OS
              </div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.42em] text-foreground/34">
                Mochi Agents
              </div>
            </div>
          </div>

          <div className="relative z-10 grid auto-rows-max grid-cols-2 gap-5 p-5 sm:grid-cols-3 lg:content-start">
            {shortcuts.map((shortcut) => (
              <ShortcutCard key={shortcut.href} {...shortcut} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
