"use client";

import Link from "next/link";
import {
  CircleHelp,
  Download,
  Settings2,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteMochi } from "@/components/site-mochi-provider";

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
  const { isSpanish } = useLanguage();
  const { openConfig } = useSiteMochi();

  const t = (en: string, es: string) => (isSpanish ? es : en);

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
    <section className="relative min-h-screen overflow-hidden pt-10 lg:h-screen lg:min-h-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(112,164,222,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_55%)]" />

      <div className="relative flex min-h-screen flex-col lg:h-screen lg:min-h-0">
        <div className="fixed inset-x-0 top-0 z-30 border-b-2 border-white/25 bg-background/70 px-2 py-1.5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-none border border-foreground/15 bg-foreground text-background">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            <button
              type="button"
              onClick={openConfig}
              aria-label={t("Open mochi settings", "Abrir ajustes del mochi")}
              title={t("Open mochi settings", "Abrir ajustes del mochi")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-none border-2 border-foreground/15 bg-card/85 text-foreground shadow-[3px_3px_0_rgba(24,18,37,0.12)] transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(24,18,37,0.12)]"
            >
              <Settings2 className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

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
