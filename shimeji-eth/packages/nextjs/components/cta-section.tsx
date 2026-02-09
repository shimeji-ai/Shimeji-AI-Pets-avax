"use client";

import Link from "next/link";
import DownloadButton from "./download-button";
import { useLanguage } from "./language-provider";
import { ScrollAnimation } from "./scroll-animation";
import { Github, ShoppingBag } from "lucide-react";
import { Button } from "~~/components/ui/button";

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
              {isSpanish ? "Tu mascota IA te espera" : "Your AI pet is waiting"}
            </h2>
            <p className="mb-4 max-w-lg mx-auto text-muted-foreground">
              {isSpanish
                ? "Descarga la extensión, elige una personalidad y empieza a chatear. O activa el modo agente para tareas online y onchain."
                : "Download the extension, pick a personality, and start chatting. Or enable agent mode for online and onchain tasks."}
            </p>
            <p className="mb-8 max-w-lg mx-auto text-muted-foreground/80">
              {isSpanish
                ? "La extensión es gratis e incluye una mascota por defecto. Consigue un huevo en Factory si quieres algo hecho a medida."
                : "The extension is free and includes a default mascot. Get an egg in the Factory if you want something custom."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <DownloadButton />
              <Link href="/factory">
                <Button variant="outline" className="gap-2 rounded-xl neural-button-outline hover:cursor-pointer">
                  <ShoppingBag className="w-4 h-4" />
                  {isSpanish ? "Visitar Fábrica" : "Visit Factory"}
                </Button>
              </Link>
              <Link href="https://github.com/luloxi/Shimeji-AI-Pets" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 rounded-xl neural-button-outline hover:cursor-pointer">
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
