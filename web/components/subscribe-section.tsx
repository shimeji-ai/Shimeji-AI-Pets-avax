"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmailSubscribeModal } from "@/components/email-subscribe-modal";
import { ScrollAnimation } from "./scroll-animation";
import { Bell, Mail } from "lucide-react";
import { useLanguage } from "./language-provider";

export function SubscribeSection() {
  const { isSpanish } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="subscribe" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-4xl mx-auto">
          <div className="neural-card rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--brand-accent)]">
                  <Mail className="w-8 h-8" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-semibold mb-2">
                  {isSpanish ? "Mantente al día" : "Stay in the Loop"}
                </h2>
                <p className="text-muted-foreground">
                  {isSpanish
                    ? "Recibe avisos sobre nuevas funciones, soporte para todas las colecciones y lanzamientos de la plataforma."
                    : "Get notified about new features, support for all collections, and platform launches. Be the first to know when we release updates!"}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="neural-button rounded-xl px-6 py-6 text-lg"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  {isSpanish ? "Suscribirme" : "Subscribe"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollAnimation>

      <EmailSubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="updates"
        title={isSpanish ? "Mantente al día" : "Stay in the Loop"}
        subtitle={
          isSpanish
            ? "Recibe avisos sobre nuevas funciones y shimejis"
            : "Get notified about new features and shimejis"
        }
        buttonText={isSpanish ? "Suscribirme" : "Subscribe"}
      />
    </section>
  );
}
