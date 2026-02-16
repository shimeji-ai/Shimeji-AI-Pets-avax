"use client";

import { useLanguage } from "./language-provider";
import { ProjectFeedbackBox } from "./project-feedback-box";
import { ScrollAnimation } from "./scroll-animation";
import { ArrowLeftRight, Bot, MessageSquare, Palette, Sparkles } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat with Personality",
    description: "Your shimeji talks back in a voice you choose — cozy, philosophical, chaotic, or noir.",
  },
  {
    icon: Bot,
    title: "AI Agent Mode",
    description:
      "Connect an OpenClaw gateway and your shimeji becomes an agent with access to online and onchain tools.",
  },
  {
    icon: Sparkles,
    title: "Multi Shimeji",
    description: "Run up to five pets at once, each with its own personality and brain.",
  },
  {
    icon: Palette,
    title: "Handcrafted Sprites",
    description: "Commission a custom shimeji through the Factory. Each egg is hand-animated with unique art.",
  },
  {
    icon: ArrowLeftRight,
    title: "Ethereum Wallet Integration",
    description: "Connect your Ethereum wallet to reserve eggs and handle payments onchain.",
  },
];

export function FeaturesSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
          
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "¿Qué puede hacer tu Shimeji?" : "What Can Your Shimeji Do?"}
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
              {isSpanish
                ? "Una mascota con IA que conversa y hace cosas por ti"
                : "A pet that chats and does things for you"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div
                key={feature.title}
                className="group neural-card rounded-3xl p-8 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 transition-colors text-[var(--brand-accent)]">
                  <feature.icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isSpanish
                    ? feature.title === "AI Chat with Personality"
                      ? "Chat IA con personalidad"
                      : feature.title === "AI Agent Mode"
                        ? "Modo agente IA"
                        : feature.title === "Multi Shimeji"
                          ? "Multi shimejis"
                          : feature.title === "Handcrafted Sprites"
                            ? "Sprites hechos a mano"
                            : "Integración con Ethereum"
                    : feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isSpanish
                    ? feature.title === "AI Chat with Personality"
                      ? "Tu shimeji te responde con la personalidad que elijas."
                      : feature.title === "AI Agent Mode"
                        ? "Conecta OpenClaw y tu shimeji se convierte en un agente con acceso a herramientas online y onchain."
                        : feature.title === "Multi Shimeji"
                          ? "Muestra hasta cinco mascotas a la vez, cada uno con su apariencia y cerebro."
                          : feature.title === "Handcrafted Sprites"
                            ? "Encarga un shimeji personalizado en Factory. Cada huevo se anima a mano con arte único."
                            : "Conecta tu wallet de Ethereum para reservar huevos y manejar pagos onchain."
                    : feature.description}
                </p>
              </div>
            ))}
          </div>

          <ProjectFeedbackBox />
        </div>
      </ScrollAnimation>
    </section>
  );
}
