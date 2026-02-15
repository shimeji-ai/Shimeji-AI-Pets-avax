"use client";

import { MessageSquare, Bot, Sparkles } from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";
import AuctionButton from "./auction-button";

const features = [
  {
    icon: MessageSquare,
    titleEn: "AI Chat with Personality",
    titleEs: "Chat IA con personalidad",
    descriptionEn:
      "Your shimeji talks back in a voice you choose — cozy, philosophical, chaotic, or noir.",
    descriptionEs:
      "Tu shimeji te responde con la personalidad que elijas.",
  },
  {
    icon: Bot,
    titleEn: "AI Agent Mode",
    titleEs: "Modo agente IA",
    descriptionEn:
      "Connect an OpenClaw gateway and your shimeji becomes an agent with access to online and onchain tools.",
    descriptionEs:
      "Conecta OpenClaw y tu shimeji se convierte en un agente con acceso a herramientas online y onchain.",
  },
  {
    icon: Sparkles,
    titleEn: "Multi Shimeji",
    titleEs: "Multi shimejis",
    descriptionEn:
      "Run up to five pets at once, each with its own personality and brain.",
    descriptionEs:
      "Muestra hasta cinco mascotas a la vez, cada uno con su apariencia y cerebro.",
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
          {/* Auction highlight banner */}
          <div className="auction-highlight-banner mb-12 rounded-3xl border border-[rgba(92,255,146,0.4)] bg-[rgba(92,255,146,0.08)] p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {isSpanish ? "Hermosas, Útiles e Interactivas" : "Beautiful, Useful, Interactive"}
                </h3>
                <p className="text-foreground/80 leading-relaxed mb-1">
                  {isSpanish
                    ? "Cada mascota personalizada se crea a mano y se subasta como NFT en "
                    : "Each custom mascot is hand-crafted and auctioned as an NFT on "}
                  <a
                    href="https://stellar.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline decoration-2 underline-offset-2"
                  >
                    Stellar
                  </a>
                  .
                </p>
              </div>
              <div className="flex-shrink-0">
                <AuctionButton />
              </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground font-mono mb-4">
              {isSpanish ? "Capacidades" : "Capabilities"}
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "¿Qué puede hacer tu Shimeji?" : "What Can Your Shimeji Do?"}
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
              {isSpanish
                ? "Una mascota con IA que conversa, opina y actúa cuando lo necesitas"
                : "A pet that chats, reacts, and acts when you need it"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.titleEn}
                className="group neural-card rounded-3xl p-8 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 transition-colors text-[var(--brand-accent)]">
                  <feature.icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isSpanish ? feature.titleEs : feature.titleEn}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isSpanish ? feature.descriptionEs : feature.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
