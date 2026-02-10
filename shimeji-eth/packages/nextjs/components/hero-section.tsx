"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "./language-provider";
import { ShimejiCharacter } from "./shimeji-character";
import { SparkleAnimation } from "./sparkle-animation";
import { ArrowRight, Wand2 } from "lucide-react";
import { Button } from "~~/components/ui/button";

export function HeroSection() {
  const { isSpanish } = useLanguage();
  const [isHowItWorksHovered, setIsHowItWorksHovered] = useState(false);
  const [isViewCollectionHovered, setIsViewCollectionHovered] = useState(false);

  return (
    <section className="relative neural-hero min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-24">
      <div className="max-w-7xl mx-auto w-full">
        <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-center lg:items-center lg:gap-8 w-full">
          {/* Left content (h1, info cards, CTA) */}
          <div className="flex flex-col items-center text-center lg:items-center lg:text-center lg:mx-auto lg:max-w-[44%]">
            {/* Large background typography */}
            <h1 className="text-[11vw] sm:text-[9vw] lg:text-[6.5vw] font-semibold leading-none tracking-tight text-balance lg:text-left">
              {isSpanish ? "Mascotas AI gratis" : "Free AI pets"}
            </h1>

            {/* Info cards */}
            <div className="flex flex-col sm:flex-row items-start justify-between w-full max-w-4xl mt-8 gap-8">
              <div className="max-w-sm text-left sm:text-left">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {isSpanish ? (
                    <>
                      Animaciones NFT para tu navegador: mascotas decorativas que chatean con IA o despiertan como agentes OpenClaw para hacer tareas online y onchain.{' '}
                      <Link href="/download" prefetch={false} className="underline font-medium">
                        Pruébalas gratis
                      </Link>
                    </>
                  ) : (
                    <>
                      Decorative NFT pets for your browser that chat through Ollama/OpenRouter or awaken as OpenClaw agents to handle online and onchain errands.{' '}
                      <Link href="/download" prefetch={false} className="underline font-medium">
                        Try them for free
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 flex flex-row gap-3">
              <div
                className="relative"
                onMouseEnter={() => setIsHowItWorksHovered(true)}
                onMouseLeave={() => setIsHowItWorksHovered(false)}
              >
                <a href="#get-started">
                  <Button size="lg" className="neural-button rounded-full hover:cursor-pointer px-8 gap-2 text-base">
                    {isSpanish ? "Cómo funciona" : "How it works"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <SparkleAnimation isHovering={isHowItWorksHovered} />
              </div>
              <div
                className="relative"
                onMouseEnter={() => setIsViewCollectionHovered(true)}
                onMouseLeave={() => setIsViewCollectionHovered(false)}
              >
                <Link href="/factory" prefetch={false}>
                  <Button
                    size="lg"
                    className="neural-button-outline rounded-full hover:cursor-pointer px-8 gap-2 text-base"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isSpanish ? "Visitar Fábrica" : "Visit Factory"}
                  </Button>
                </Link>
                <SparkleAnimation isHovering={isViewCollectionHovered} />
              </div>
            </div>
          </div>

          {/* Right content (ShimejiCharacter) */}
          <div className="relative mt-8 lg:mt-0 lg:mx-auto lg:scale-125 lg:transform">
            <div className="relative">
              <div className="absolute inset-x-0 -bottom-6 mx-auto h-16 w-52 rounded-2xl neural-outline bg-white/5 blur-[2px]" />
              <ShimejiCharacter />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
