"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleHelp,
  Download,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteMochi } from "@/components/site-mochi-provider";
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
  iconSrc,
  onOpen,
}: DesktopConfigShortcutProps & { iconSrc?: string; onOpen: (tab: ConfigPanelTab) => void }) {
  const meta = CONFIG_WINDOW_META.find((item) => item.key === configKey);
  if (!meta) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(configKey)}
      className="group flex w-[104px] flex-col items-center gap-2 rounded-none p-1 text-center transition-transform duration-150 hover:-translate-y-1"
    >
      <span className="relative flex h-16 w-16 items-center justify-center transition-all duration-150 group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
        <Image
          src={iconSrc || meta.iconSrc}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 object-contain drop-shadow-[4px_4px_0_rgba(24,18,37,0.18)]"
          style={{ imageRendering: "pixelated" }}
        />
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
  const { config, catalog } = useSiteMochi();
  const [activeDesktopWindow, setActiveDesktopWindow] = useState<ConfigPanelTab | null>(null);
  const [entryGateOpen, setEntryGateOpen] = useState(true);

  const t = (en: string, es: string) => (isSpanish ? es : en);
  const activeWindowMeta = activeDesktopWindow
    ? CONFIG_WINDOW_META.find((item) => item.key === activeDesktopWindow) ?? null
    : null;
  const selectedCharacter = catalog?.characters.find((item) => item.key === config.character) ?? null;

  const configShortcuts: DesktopConfigShortcutProps[] = [
    { configKey: "site", label: t("Theme", "Tema") },
    { configKey: "soul", label: "Soul" },
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
              <div className="flex h-6 items-center overflow-visible">
                <Image src="/logo.png" alt="Mochi" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
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
                iconSrc={shortcut.configKey === "mascot" ? selectedCharacter?.iconUrl || undefined : undefined}
                onOpen={setActiveDesktopWindow}
              />
            ))}
          </div>

          {activeDesktopWindow ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-4 pt-14 sm:p-6 sm:pt-16">
              <div className="pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-none border-2 border-border bg-background/92 text-foreground shadow-[8px_8px_0_rgba(24,18,37,0.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-border bg-card/55 px-4 py-2.5">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {activeWindowMeta
                      ? isSpanish
                        ? activeWindowMeta.labelEs
                        : activeWindowMeta.labelEn
                      : t("Configuration", "Configuracion")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDesktopWindow(null)}
                    className="rounded-none border border-border bg-background/60 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground hover:bg-background/80"
                  >
                    {t("Close", "Cerrar")}
                  </button>
                </div>
                <div className="h-[min(640px,calc(100vh-7rem))] min-h-[420px] overflow-hidden">
                  <SiteMochiCompactConfigWindow activeTab={activeDesktopWindow} />
                </div>
              </div>
            </div>
          ) : null}

          {entryGateOpen ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/72 p-4 backdrop-blur-md">
              <div className="w-full max-w-xl rounded-none border-2 border-border bg-background/94 p-5 text-foreground shadow-[8px_8px_0_rgba(24,18,37,0.18)]">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Mochi" width={40} height={40} className="h-10 w-10 object-contain" />
                  <div>
                    <div className="font-mono text-sm font-semibold uppercase tracking-[0.18em]">
                      Mochi
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("Choose how to enter", "Elegi como entrar")}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-between rounded-none border border-border bg-card/55 px-4 py-3 text-left opacity-70"
                  >
                    <span>
                      <span className="block font-mono text-xs font-semibold uppercase tracking-[0.16em]">
                        Google
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("Cloud login", "Login cloud")}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("Coming soon", "Coming soon")}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-between rounded-none border border-border bg-card/55 px-4 py-3 text-left opacity-70"
                  >
                    <span>
                      <span className="block font-mono text-xs font-semibold uppercase tracking-[0.16em]">
                        X
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("Social login", "Login social")}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("Coming soon", "Coming soon")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryGateOpen(false)}
                    className="flex items-center justify-between rounded-none border-2 border-[var(--brand-accent)] bg-[var(--brand-accent)]/12 px-4 py-3 text-left transition-colors hover:bg-[var(--brand-accent)]/18"
                  >
                    <span>
                      <span className="block font-mono text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                        {t("Local private agent", "Agente local privado")}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("Allowed on this device", "Permitido en este dispositivo")}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
                      {t("Enter", "Entrar")}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
