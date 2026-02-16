"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";
import { ScrollAnimation } from "./scroll-animation";
import { Bot, Download, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Download,
    step: "01",
    titleEn: "Install",
    titleEs: "Instalá",
    descriptionEn: "Grab the Chrome extension or the desktop app for Windows, macOS, and Linux.",
    descriptionEs: "Descargá la extensión de Chrome o la app desktop para Windows, macOS y Linux.",
  },
  {
    icon: Bot,
    step: "02",
    titleEn: "Set Up Your AI",
    titleEs: "Configurá tu IA",
    descriptionEn:
      "Open settings, configure a provider (OpenRouter, Ollama, or OpenClaw) and start chatting. On desktop you also get a built-in terminal.",
    descriptionEs:
      "Abrí los ajustes, configurá un proveedor (OpenRouter, Ollama u OpenClaw) y empezá a chatear. En desktop también tenés una terminal integrada.",
  },
  {
    icon: Sparkles,
    step: "03",
    titleEn: "Commission a Custom Shimeji",
    titleEs: "Encargá un shimeji único",
    descriptionEn: "Buy an egg in the Factory, set an intention, and receive a handcrafted pet.",
    descriptionEs: "Compra un huevo en Factory, definí una intención y recibí una mascota hecha a mano.",
  },
];

export function HowItWorksSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="get-started" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Guía rápida" : "Quick guide"}
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight text-balance">
              {isSpanish ? "Empezar" : "Get Started"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(step => (
              <div
                key={step.step}
                className="group relative neural-card rounded-3xl p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 text-[var(--brand-accent)]">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-semibold text-white/10 transition-colors font-mono">{step.step}</span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3">{isSpanish ? step.titleEs : step.titleEn}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.step === "01" ? (
                    isSpanish ? (
                      <>
                        <Link href="/download" className="font-semibold underline decoration-2 underline-offset-2">
                          Descargá la extensión de Chrome
                        </Link>{" "}
                        o la app desktop para Windows, macOS y Linux.
                      </>
                    ) : (
                      <>
                        <Link href="/download" className="font-semibold underline decoration-2 underline-offset-2">
                          Grab the Chrome extension
                        </Link>{" "}
                        or the desktop app for Windows, macOS, and Linux.
                      </>
                    )
                  ) : step.step === "03" ? (
                    isSpanish ? (
                      <>
                        <Link href="/factory" className="font-semibold underline decoration-2 underline-offset-2">
                          Comprá un huevo en Factory
                        </Link>
                        , definí una intención y recibí una mascota hecha a mano.
                      </>
                    ) : (
                      <>
                        <Link href="/factory" className="font-semibold underline decoration-2 underline-offset-2">
                          Buy an egg in the Factory
                        </Link>
                        , set an intention, and receive a handcrafted pet.
                      </>
                    )
                  ) : isSpanish ? (
                    step.descriptionEs
                  ) : (
                    step.descriptionEn
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
