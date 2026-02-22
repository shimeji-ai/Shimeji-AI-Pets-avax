"use client";

import {
  MessageSquare, Bot, Sparkles,
  Heart, Wand2, Star,
  Flower2, Candy, Cloud,
  type LucideIcon,
} from "lucide-react";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";
import { useCurrentTheme, type SiteTheme } from "@/hooks/use-current-theme";
import AuctionButton from "./auction-button";

const themeIcons: Record<SiteTheme, [LucideIcon, LucideIcon, LucideIcon]> = {
  neural:  [MessageSquare, Bot, Sparkles],
  pink:    [Heart, Wand2, Star],
  kawaii:  [Heart, Wand2, Sparkles],
  pastel:  [Flower2, Candy, Cloud],
};

const features = [
  {
    titleEn: "AI Chat with Personality",
    titleEs: "Chat IA con personalidad",
    descriptionEn:
      "Your Shimeji talks back in a voice you choose — cozy, philosophical, chaotic, or noir.",
    descriptionEs:
      "Tu Shimeji te responde con la personalidad que elijas.",
  },
  {
    titleEn: "AI Agent Mode",
    titleEs: "Modo agente IA",
    descriptionEn:
      "Your Shimeji interacts with online and onchain tools.",
    descriptionEs:
      "Tu Shimeji interactúa con herramientas online y onchain.",
  },
  {
    titleEn: "Terminal Interaction",
    titleEs: "Interacción con la terminal",
    descriptionEn:
      "Run commands through your Shimeji.",
    descriptionEs:
      "Ejecutá comandos a través de tu Shimeji.",
  },
];

export function FeaturesSection() {
  const { isSpanish } = useLanguage();
  const theme = useCurrentTheme();
  const icons = themeIcons[theme];
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="w-full mx-auto">
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
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight">
              {isSpanish ? "¿Qué puede hacer tu Shimeji?" : "What Can Your Shimeji Do?"}
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
              {isSpanish
                ? "Una mascota con IA que conversa y hace cosas por ti"
                : "A pet that chats and does things for you"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const Icon = icons[idx];
              return (
              <div
                key={feature.titleEn}
                className="group neural-card rounded-3xl p-8 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-foreground/5 border border-foreground/10 rounded-2xl flex items-center justify-center mb-6 transition-colors text-[var(--brand-accent)]">
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isSpanish ? feature.titleEs : feature.titleEn}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isSpanish ? feature.descriptionEs : feature.descriptionEn}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
