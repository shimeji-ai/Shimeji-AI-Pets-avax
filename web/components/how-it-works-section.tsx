"use client";

import { Download, MessageSquare, Sparkles, Bot } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";

const steps = [
  {
    icon: Download,
    step: "01",
    title: "Install the Extension",
    description:
      "Download the Chrome extension and your shimeji will appear on every page you visit.",
  },
  {
    icon: MessageSquare,
    step: "02",
    title: "Chat with Your Shimeji",
    description:
      "Click your companion to open chat. Choose a personality and add your API key to start talking.",
  },
  {
    icon: Bot,
    step: "03",
    title: "Enable the AI Agent",
    description:
      "Switch to AI Agent mode and connect OpenClaw so your shimeji can act online and onchain.",
  },
  {
    icon: Sparkles,
    step: "04",
    title: "Commission a Custom Shimeji",
    description:
      "Open a portal in the Factory, set an intention, and receive a handcrafted companion with unique sprites.",
  },
];

export function HowItWorksSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="how-it-works" className="py-8 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance">
              {isSpanish ? "Cómo Funciona" : "How It Works"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div
                key={step.title}
                className="group relative bg-card rounded-3xl p-8 border border-[#FF9999] transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 bg-[#FF6666] rounded-2xl flex items-center justify-center transition-colors">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-bold text-border  transition-colors font-mono">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3">
                  {isSpanish
                    ? step.step === "01"
                      ? "Instala la extensión"
                      : step.step === "02"
                        ? "Chatea con tu shimeji"
                        : step.step === "03"
                          ? "Activa el agente IA"
                          : "Encarga un shimeji único"
                    : step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isSpanish
                    ? step.step === "01"
                      ? "Descarga la extensión de Chrome y tu shimeji aparecerá en cada página que visites."
                      : step.step === "02"
                        ? "Haz clic en tu compañero para abrir el chat. Elige una personalidad y agrega tu API key para empezar."
                        : step.step === "03"
                          ? "Cambia al modo AI Agent y conecta OpenClaw para que pueda actuar online y onchain."
                          : "Abre un portal en Factory, define una intención y recibe un compañero hecho a mano con sprites únicos."
                    : step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
