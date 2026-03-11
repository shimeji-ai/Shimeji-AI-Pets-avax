"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleHelp,
  Download,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { CONFIG_WINDOW_META, SiteMochiCompactConfigWindow, type ConfigPanelTab } from "@/components/site-mochi-config-panel";

type DesktopConfigShortcutProps = {
  configKey: ConfigPanelTab;
  label: string;
};

type HeaderIconLinkProps = {
  href: string;
  icon: LucideIcon;
  label: string;
};

function DesktopConfigShortcut({
  configKey,
  label,
  onOpen,
}: DesktopConfigShortcutProps & { onOpen: (tab: ConfigPanelTab) => void }) {
  const meta = CONFIG_WINDOW_META.find((item) => item.key === configKey);
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onOpen(configKey)}
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
    </button>
  );
}

function HeaderIconLink({ href, icon: Icon, label }: HeaderIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="group relative inline-flex h-8 w-8 items-center justify-center text-foreground/72 transition-colors duration-150 hover:text-foreground"
    >
      <Icon className="h-4 w-4" strokeWidth={2.1} />
      <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-none border border-border bg-background/92 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground opacity-0 shadow-[3px_3px_0_rgba(24,18,37,0.12)] transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export function SiteMochiLandingSection() {
  const { isSpanish, language, setLanguage } = useLanguage();
  const [activeDesktopWindow, setActiveDesktopWindow] = useState<ConfigPanelTab | null>(null);

  const t = (en: string, es: string) => (isSpanish ? es : en);

  const configShortcuts: DesktopConfigShortcutProps[] = [
    { configKey: "chat", label: t("Provider", "Proveedor") },
    { configKey: "mascot", label: t("Mascot", "Mascota") },
    { configKey: "appearance", label: t("Chat", "Chat") },
    { configKey: "sound", label: t("Sound", "Sonido") },
  ];

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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage(language === "es" ? "en" : "es")}
                aria-label={t("Switch language", "Cambiar idioma")}
                title={t("Switch language", "Cambiar idioma")}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-none border border-foreground/10 bg-card/45 px-2 text-sm transition-all duration-150 hover:border-foreground/20 hover:bg-card/75"
              >
                <span aria-hidden="true">{language === "es" ? "🇦🇷" : "🇺🇸"}</span>
              </button>
              <HeaderIconLink href="/help" icon={CircleHelp} label={t("Help", "Ayuda")} />
              <HeaderIconLink href="/download" icon={Download} label={t("Download", "Descarga")} />
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(61,43,82,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(61,43,82,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative z-10 grid auto-rows-max grid-cols-2 gap-5 p-5 sm:grid-cols-3 lg:content-start">
            {configShortcuts.map((shortcut) => (
              <DesktopConfigShortcut
                key={shortcut.configKey}
                {...shortcut}
                onOpen={setActiveDesktopWindow}
              />
            ))}
          </div>

          {activeDesktopWindow ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-4 pt-14 sm:p-6 sm:pt-16">
              <div className="pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-none border-2 border-border bg-background/92 text-foreground shadow-[8px_8px_0_rgba(24,18,37,0.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-border bg-card/55 px-4 py-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t("Configuration", "Configuracion")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDesktopWindow(null)}
                    className="rounded-none border border-border bg-background/60 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground hover:bg-background/80"
                  >
                    {t("Close", "Cerrar")}
                  </button>
                </div>
                <div className="min-h-[420px] max-h-[calc(100vh-7rem)] overflow-hidden">
                  <SiteMochiCompactConfigWindow activeTab={activeDesktopWindow} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
