"use client";

import { Download, Bot, Sparkles } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import Link from "next/link";
import { useLanguage } from "./language-provider";

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
      "Configure the AI Brain and start chatting.",
    descriptionEs:
      "Configurá el Cerebro AI de tu Shimeji y empezá a chatear.",
  },
  {
    icon: Sparkles,
    step: "03",
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
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight text-balance">
              {isSpanish ? "Cómo empezar" : "How to get started"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
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
                          Descargá
                        </Link>{" "}
                         la extensión de navegador o la app de escritorio.
                      </>
                    ) : (
                      <>
                        <Link
                          href="/download"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Grab 
                        </Link>{" "}
                        the browser extension or the desktop app.
                      </>
                    )
                  ) : step.step === "03" ? (
                    isSpanish ? (
                      <>
                        <Link
                          href="/#subasta"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Ofertá en la subasta
                        </Link>
                        {" "}para ganar una mascota artesanal acuñada como NFT.
                      </>
                    ) : (
                      <>
                        <Link
                          href="/#subasta"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Bid in the auction
                        </Link>
                        {" "}to win a handcrafted pet minted as an NFT.
                      </>
                    )
                  ) : step.step === "02" ? (
                    isSpanish ? (
                      <>
                        {step.descriptionEs} {" "}
                        <Link
                          href="/help"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Centro de ayuda
                        </Link>
                      </>
                    ) : (
                      <>
                        {step.descriptionEn} {" "}
                        <Link
                          href="/help"
                          className="font-semibold underline decoration-2 underline-offset-2"
                        >
                          Help center
                        </Link>
                      </>
                    )
                  ) : (
                    isSpanish ? step.descriptionEs : step.descriptionEn
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
