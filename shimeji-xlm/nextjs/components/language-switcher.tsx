"use client";

import { useLanguage } from "./language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const nextLanguage = language === "en" ? "es" : "en";
  const flag = language === "en" ? "🇺🇸" : "🇪🇸";
  const title = language === "en" ? "Switch to Spanish" : "Cambiar a inglés";

  return (
    <div className="language-switcher-shell inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
      <button
        type="button"
        onClick={() => setLanguage(nextLanguage)}
        title={title}
        aria-label={title}
        className="language-switcher-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-base leading-none transition-colors"
      >
        <span aria-hidden="true">{flag}</span>
      </button>
    </div>
  );
}
