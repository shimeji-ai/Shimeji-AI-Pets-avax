"use client";

import { Download, MessageSquare, Bot, Sparkles } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import Link from "next/link";
import { useLanguage } from "./language-provider";

const steps = [
  {
    icon: Download,
    step: "01",
    titleEn: "Install",
    titleEs: "Instalar",
    descriptionEn: "Install with the Chrome extension or the desktop app on Windows, macOS, and Linux.",
    descriptionEs: "Instalá con la extensión de Chrome o la app desktop en Windows, macOS y Linux.",
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
    titleEn: "Win a Custom Shimeji",
    titleEs: "Ganá un shimeji único",
    descriptionEn: "Bid in the auction to win a handcrafted pet minted as an NFT.",
    descriptionEs: "Ofertá en la subasta para ganar una mascota artesanal acuñada como NFT.",
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
                          Instalá Shimeji AI Pets
                        </Link>{" "}
                        con la extensión de Chrome o la app desktop para Windows,
                        macOS y Linux.
                      </>
                    ) : (
                      <>
                        <Link
                          href="/download"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Install Shimeji AI Pets
                        </Link>{" "}
                        with the Chrome extension or the desktop app for Windows,
                        macOS, and Linux.
                      </>
                    )
                  ) : (
                    step.step === "04" ? (
                      isSpanish ? (
                        <>
                          <Link
                            href="/#auction"
                            className="font-semibold underline decoration-2 underline-offset-2"
                          >
                            Ofertá en la subasta
                          </Link>
                          {" "}para ganar una mascota artesanal acuñada como NFT
                          con sprites únicos.
                        </>
                      ) : (
                        <>
                          <Link
                            href="/#auction"
                            className="font-semibold underline decoration-2 underline-offset-2"
                          >
                            Bid in the auction
                          </Link>
                          {" "}to win a handcrafted pet minted as an NFT.
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
