"use client";

import { Download, MessageSquare, Bot, Sparkles } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import Link from "next/link";
import { useLanguage } from "./language-provider";

const steps = [
  {
    icon: Download,
    step: "01",
    titleEn: "Install the Extension",
    titleEs: "Instala la extensión",
    descriptionEn: "Download the Chrome extension and your shimeji will appear on every page you visit.",
    descriptionEs: "Descarga la extensión de Chrome y tu shimeji aparecerá en cada página que visites.",
  },
  {
    icon: MessageSquare,
    step: "02",
    titleEn: "Add an API Key",
    titleEs: "Agrega una API key",
    descriptionEn: "Get an OpenRouter key and paste it in the popup. You can also use Ollama for local models.",
    descriptionEs: "Consigue una key de OpenRouter y pegala en el popup. También podés usar Ollama para modelos locales.",
  },
  {
    icon: Bot,
    step: "03",
    titleEn: "Chat & Enable Agent Mode",
    titleEs: "Chatea y activa el modo agente",
    descriptionEn: "Click your shimeji to chat. Switch to AI Agent mode with OpenClaw for online and onchain actions.",
    descriptionEs: "Hace clic en tu shimeji para chatear. Cambia al modo AI Agent con OpenClaw para acciones online y onchain.",
  },
  {
    icon: Sparkles,
    step: "04",
    titleEn: "Commission a Custom Shimeji",
    titleEs: "Encarga un shimeji único",
    descriptionEn: "Buy an egg in the Factory, set an intention, and receive a handcrafted pet with unique sprites.",
    descriptionEs: "Compra un huevo en Factory, define una intención y recibe una mascota hecha a mano con sprites únicos.",
  },
];

export function HowItWorksSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="get-started" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-28 sm:scroll-mt-32">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.step}
                className="group relative neural-card rounded-3xl p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 text-[var(--brand-accent)]">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-semibold text-white/10 transition-colors font-mono">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3">
                  {isSpanish ? step.titleEs : step.titleEn}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.step === "01" ? (
                    isSpanish ? (
                      <>
                        <Link
                          href="/download"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Descarga la extensión de Chrome
                        </Link>{" "}
                        y tu shimeji aparecerá en cada página que visites.
                      </>
                    ) : (
                      <>
                        <Link
                          href="/download"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Download the Chrome extension
                        </Link>{" "}
                        and your shimeji will appear on every page you visit.
                      </>
                    )
                  ) : (
                    step.step === "04" ? (
                      isSpanish ? (
                        <>
                          <Link
                            href="/factory"
                            className="font-semibold underline decoration-2 underline-offset-2"
                          >
                            Compra un huevo en Factory
                          </Link>
                          , define una intención y recibe una mascota hecha a mano
                          con sprites únicos.
                        </>
                      ) : (
                        <>
                          <Link
                            href="/factory"
                            className="font-semibold underline decoration-2 underline-offset-2"
                          >
                            Buy an egg in the Factory
                          </Link>
                          , set an intention, and receive a handcrafted pet with
                          unique sprites.
                        </>
                      )
                    ) : (
                      isSpanish ? step.descriptionEs : step.descriptionEn
                    )
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
