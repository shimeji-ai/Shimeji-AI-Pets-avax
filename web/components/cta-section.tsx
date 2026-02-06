"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
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
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <ScrollAnimation variants={variants}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center rounded-3xl border border-[#1159CC]/25 bg-white/88 backdrop-blur p-8 md:p-12 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-balance text-[#000000]">
              {isSpanish
                ? "Tu compañero IA te espera"
                : "Your AI companion is waiting"}
            </h2>
            <p className="mb-4 max-w-lg mx-auto text-[#000000]">
              {isSpanish
                ? "Descarga la extensión, elige una personalidad y empieza a chatear. O activa el modo agente para tareas online y onchain."
                : "Download the extension, pick a personality, and start chatting. Or enable agent mode for online and onchain tasks."}
            </p>
            <p className="mb-8 max-w-lg mx-auto text-[#000000]/80">
              {isSpanish
                ? "La extensión es gratis e incluye una mascota por defecto. Encarga un shimeji único en Factory si quieres algo hecho a medida."
                : "The extension is free and includes a default mascot. Commission a unique shimeji in the Factory if you want something custom."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <DownloadButton />
              <Link href="/factory">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-2 border-[#1159CC]/40 bg-white hover:bg-[#FFCC66] hover:border-[#1159CC] hover:cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isSpanish ? "Visitar Fábrica" : "Visit Factory"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ScrollAnimation>
    </section>
  );
}
