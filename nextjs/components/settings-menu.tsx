"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, X } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";
import { useLanguage } from "./language-provider";
import { useSiteMochi } from "./site-mochi-provider";
import { SoundFields } from "./site-mochi-config-panel";

// ── Theme meta ────────────────────────────────────────────────────────────────

const THEME_META: { key: Theme; labelEn: string; labelEs: string; accent: string }[] = [
  { key: "neural", labelEn: "Neural", labelEs: "Neural", accent: "#86f0ff" },
  { key: "black-pink", labelEn: "Black-Pink", labelEs: "Black-Pink", accent: "#ff78c8" },
  { key: "kawaii", labelEn: "Kawaii", labelEs: "Kawaii", accent: "#e87fff" },
  { key: "pastel", labelEn: "Pastel", labelEs: "Pastel", accent: "#b48ccf" },
];

// ── Provider fields (compact, inline) ────────────────────────────────────────

function ProviderFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig, canUseCurrentProvider, freeSiteMessagesRemaining } = useSiteMochi();

  const inputCls =
    "w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)] placeholder:text-muted-foreground/50";

  if (config.provider === "site") {
    return (
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        {isSpanish
          ? `Créditos gratuitos del sitio. Restantes: ${freeSiteMessagesRemaining ?? 0}. Cuando se terminen, cambiá de proveedor.`
          : `Site free credits. Remaining: ${freeSiteMessagesRemaining ?? 0}. When they run out, switch provider.`}
      </div>
    );
  }

  if (config.provider === "openrouter") {
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            API Key
          </span>
          <input
            type="password"
            value={config.openrouterApiKey}
            onChange={(e) => updateConfig({ openrouterApiKey: e.target.value })}
            placeholder="sk-or-v1-..."
            className={inputCls}
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
            onChange={(e) => updateConfig({ openrouterModel: e.target.value })}
            placeholder="openai/gpt-4o-mini"
            className={inputCls}
          />
        </label>
        <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${canUseCurrentProvider ? "border-emerald-500/40 bg-emerald-500/10 text-foreground" : "border-amber-500/40 bg-amber-500/10 text-foreground"}`}>
          {canUseCurrentProvider
            ? (isSpanish ? "✓ Listo para chatear" : "✓ Ready to chat")
            : (isSpanish ? "Completá la API key para chatear" : "Enter your API key to chat")}
        </div>
      </div>
    );
  }

  if (config.provider === "ollama") {
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ollama URL
          </span>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(e) => updateConfig({ ollamaUrl: e.target.value })}
            placeholder="http://127.0.0.1:11434"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <input
            type="text"
            value={config.ollamaModel}
            onChange={(e) => updateConfig({ ollamaModel: e.target.value })}
            placeholder="gemma3:1b"
            className={inputCls}
          />
        </label>
      </div>
    );
  }

  // openclaw
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        {isSpanish
          ? "OpenClaw en web usa solo pairing code de un solo uso. Ya no se configura Gateway URL/token aquí."
          : "OpenClaw on web now uses one-time pairing codes only. Gateway URL/token is no longer configured here."}
      </div>
      <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${canUseCurrentProvider ? "border-emerald-500/40 bg-emerald-500/10 text-foreground" : "border-amber-500/40 bg-amber-500/10 text-foreground"}`}>
        {canUseCurrentProvider
          ? (isSpanish ? "✓ Sesión OpenClaw activa" : "✓ OpenClaw session active")
          : (isSpanish ? "Generá un pairing code en 'Más ajustes del mochi'" : "Generate a pairing code in 'More mochi settings'")}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isSpanish, language, setLanguage } = useLanguage();
  const {
    config,
    updateConfig,
    openConfig,
    resetConfig,
  } = useSiteMochi();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const selectCls =
    "w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isSpanish ? "Ajustes" : "Settings"}
        title={isSpanish ? "Ajustes" : "Settings"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/8 text-foreground hover:bg-foreground/15 transition-colors"
      >
        <Settings className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={isSpanish ? "Ajustes del sitio" : "Site settings"}
          className="mochi-settings-panel config-contrast-panel absolute right-0 top-full mt-2 w-80 max-h-[82vh] overflow-y-auto rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur z-50"
        >
          {/* ── Panel header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
            <span className="text-sm font-semibold text-foreground">
              {isSpanish ? "Configuración" : "Settings"}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-foreground/8 text-muted-foreground hover:bg-foreground/15"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── Mochi section ── */}
          <div className="border-b border-border px-4 py-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Mochi" : "Mochi"}
            </p>

            {/* Soul + Size */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  soul.md
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openConfig();
                  }}
                  className={`${selectCls} text-left`}
                >
                  {isSpanish ? "Abrir editor de soul.md" : "Open soul.md editor"}
                </button>
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{isSpanish ? "Tamaño" : "Size"}</span>
                  <span>{config.sizePercent}%</span>
                </div>
                <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
                  <input
                    type="range"
                    min={60}
                    max={180}
                    step={5}
                    value={config.sizePercent}
                    onChange={(e) => updateConfig({ sizePercent: Number(e.target.value) })}
                    className="w-full accent-[var(--brand-accent)]"
                  />
                </div>
              </label>
            </div>

            {/* Provider selector */}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isSpanish ? "Proveedor de IA" : "AI Provider"}
              </span>
              <select
                value={config.provider}
                onChange={(e) =>
                  updateConfig({
                    provider: e.target.value as "site" | "openrouter" | "ollama" | "openclaw",
                  })
                }
                className={selectCls}
              >
                <option value="site">{isSpanish ? "Créditos del sitio (gratis)" : "Site credits (free)"}</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama</option>
                <option value="openclaw">OpenClaw</option>
              </select>
            </label>

            {/* Provider-specific fields */}
            <ProviderFields />

            {/* Security note */}
            <p className="text-xs text-muted-foreground">
              🔒 {isSpanish
                ? "Las keys se guardan solo en tu navegador (localStorage)."
                : "Keys are stored only in your browser (localStorage)."}
            </p>
          </div>

          {/* ── Sound section ── */}
          <div className="border-b border-border px-4 py-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Sonido" : "Sound"}
            </p>
            <SoundFields />
          </div>

          {/* ── Site theme section ── */}
          <div className="border-b border-border px-4 py-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Tema del sitio" : "Site Theme"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {THEME_META.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    theme === t.key
                      ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: t.accent }}
                  />
                  {isSpanish ? t.labelEs : t.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* ── Language section ── */}
          <div className="border-b border-border px-4 py-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Idioma" : "Language"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "en" as const, flag: "🇺🇸", label: "English" },
                  { key: "es" as const, flag: "🇦🇷", label: "Español" },
                ]
              ).map((lang) => (
                <button
                  key={lang.key}
                  type="button"
                  onClick={() => setLanguage(lang.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    language === lang.key
                      ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <button
              type="button"
              onClick={() => {
                openConfig();
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-[var(--brand-accent)] hover:underline"
            >
              {isSpanish ? "Más ajustes del mochi →" : "More mochi settings →"}
            </button>
            <button
              type="button"
              onClick={resetConfig}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40"
            >
              {isSpanish ? "Restablecer" : "Reset"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
