"use client";

import { MessageSquare, Bot, Sparkles, Palette, ArrowLeftRight } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import { ProjectFeedbackBox } from "./project-feedback-box";
import { useLanguage } from "./language-provider";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat with Personality",
    description:
      "Your shimeji talks back in a voice you choose — cozy, philosophical, chaotic, or noir.",
  },
  {
    icon: Bot,
    title: "AI Agent Mode",
    description:
      "Connect an OpenClaw gateway and your shimeji becomes an agent with access to online and onchain tools.",
  },
  {
    icon: Sparkles,
    title: "Proactive Comments",
    description:
      "Enable proactive messages and your shimeji will gently react to what you're browsing.",
  },
  {
    icon: Palette,
    title: "Handcrafted Sprites",
    description:
      "Commission a custom shimeji through the Factory. Each one is hand-animated with unique art.",
  },
  {
    icon: ArrowLeftRight,
    title: "Stellar Wallet Integration",
    description:
      "Connect Freighter to reserve portals and handle payments on the Stellar network.",
  },
];

export function FeaturesSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="features" className="py-8 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              {isSpanish ? "¿Qué puede hacer tu Shimeji?" : "What Can Your Shimeji Do?"}
            </h2>
            <p className="text-lg text-foreground mt-4 max-w-xl mx-auto">
              {isSpanish
                ? "Más que una mascota: un compañero con IA que conversa, opina y actúa cuando lo necesitas"
                : "More than a mascot — a companion that chats, reacts, and acts when you need it"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-card rounded-3xl p-8 border border-[#FF9999] transition-all"
              >
                <div className="w-12 h-12 bg-[#FF6666] rounded-2xl flex items-center justify-center mb-6 transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2">
                  {isSpanish
                    ? feature.title === "AI Chat with Personality"
                      ? "Chat IA con personalidad"
                      : feature.title === "AI Agent Mode"
                        ? "Modo agente IA"
                        : feature.title === "Proactive Comments"
                          ? "Comentarios espontáneos"
                          : feature.title === "Handcrafted Sprites"
                            ? "Sprites hechos a mano"
                            : "Integración con Stellar"
                    : feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isSpanish
                    ? feature.title === "AI Chat with Personality"
                      ? "Tu shimeji te responde con la personalidad que elijas: acogedora, filosófica, caótica o noir."
                      : feature.title === "AI Agent Mode"
                        ? "Conecta un gateway OpenClaw y tu shimeji se convierte en un agente con acceso a herramientas online y onchain."
                        : feature.title === "Proactive Comments"
                          ? "Activa mensajes proactivos y tu shimeji reaccionará con comentarios suaves a lo que ves."
                          : feature.title === "Handcrafted Sprites"
                            ? "Encarga un shimeji personalizado en Factory. Cada uno se anima a mano con arte único."
                            : "Conecta Freighter para reservar portales y manejar pagos en la red Stellar."
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
