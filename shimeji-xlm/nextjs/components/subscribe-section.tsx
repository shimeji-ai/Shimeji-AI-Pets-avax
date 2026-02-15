"use client";

import { useLanguage } from "./language-provider";

export function SubscribeSection() {
  const { isSpanish } = useLanguage();

  return (
    <section id="subscribe" className="py-12 md:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="neural-card rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--brand-accent)]">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">
                {isSpanish ? "Mantente al día" : "Stay in the Loop"}
              </h2>
              <p className="text-muted-foreground">
                {isSpanish
                  ? "Seguinos en X para enterarte de nuevas funciones, soporte para todas las colecciones y lanzamientos de la plataforma."
                  : "Follow us on X to stay updated on new features, support for all collections, and platform launches."}
              </p>
            </div>
            <div className="flex-shrink-0">
              <a
                href="https://x.com/ShimejiFactory"
                target="_blank"
                rel="noopener noreferrer"
                className="neural-button rounded-xl px-6 py-3 text-lg inline-flex items-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {isSpanish ? "Seguir en X" : "Follow on X"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
