"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Github } from "lucide-react";
import DownloadButton from "./download-button";
import { ScrollAnimation } from "./scroll-animation";
import { useLanguage } from "./language-provider";

export function CtaSection() {
  const { isSpanish } = useLanguage();
  const variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  };

  return (
    <section id="cta" className="py-20 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center rounded-3xl neural-card p-8 md:p-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight text-balance text-foreground">
              {isSpanish
                ? "Tu mascota IA te espera"
                : "Your AI pet is waiting"}
            </h2>
            <p className="mb-4 max-w-lg mx-auto text-muted-foreground">
              {isSpanish
                ? "Descarga la extensión, elige una personalidad y empieza a chatear. O activa el modo agente para tareas online y onchain."
                : "Download the extension, pick a personality, and start chatting. Or enable agent mode for online and onchain tasks."}
            </p>
            <p className="mb-8 max-w-lg mx-auto text-muted-foreground/80">
              {isSpanish
                ? "La extensión es gratis e incluye una mascota por defecto. Participá en la subasta para conseguir un shimeji personalizado."
                : "The extension is free and includes a default mascot. Join the auction to get a custom shimeji."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <DownloadButton />
              <Link href="/auction">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl neural-button-outline hover:cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isSpanish ? "Ver Subasta" : "View Auction"}
                </Button>
              </Link>
              <Link
                href="https://github.com/luloxi/Shimeji-AI-Pets"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl neural-button-outline hover:cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
