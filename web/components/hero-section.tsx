"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wand2 } from "lucide-react";
import { ShimejiCharacter } from "./shimeji-character";
import { Link as ScrollLink } from "react-scroll";
import { SparkleAnimation } from "./sparkle-animation";
import { useLanguage } from "./language-provider";

export function HeroSection() {
  const { isSpanish } = useLanguage();
  const [isHowItWorksHovered, setIsHowItWorksHovered] = useState(false);
  const [isViewCollectionHovered, setIsViewCollectionHovered] = useState(false);

  return (
    <section className="relative bg-[#330066] text-primary-foreground min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-24">
      <div className="max-w-7xl mx-auto w-full">
        <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-center lg:items-start w-full">
          {/* Left content (h1, info cards, CTA) */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:mr-10">
            {/* Large background typography */}
            <h1 className="text-[11vw] sm:text-[9vw] lg:text-[7vw] font-bold leading-none tracking-tighter text-balance lg:text-left">
              Shimeji Factory
            </h1>

            {/* Info cards */}
            <div className="flex flex-col sm:flex-row items-start justify-between w-full max-w-4xl mt-8 gap-8">
              <div className="max-w-sm text-left sm:text-left">
                <p className="text-lg leading-relaxed">
                  {isSpanish
                    ? "Un compañero digital que vive en tu navegador. Chatea desde cualquier pestaña, recibe avisos y conecta tu agente para que haga cosas online y onchain por vos."
                    : "A digital companion that lives in your browser. Chat from any tab, get gentle nudges, or connect your agent to handle online and onchain tasks for you."}
                </p>              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 flex flex-row gap-3">
              <div
                className="relative"
                onMouseEnter={() => setIsHowItWorksHovered(true)}
                onMouseLeave={() => setIsHowItWorksHovered(false)}
              >
                <ScrollLink to="how-it-works" smooth={true} duration={300}>
                  <Button
                    size="lg"
                    className="bg-[#FFCC66] hover:bg-[#FF6666] text-black rounded-full hover:cursor-pointer px-8 gap-2 text-base"
                  >
                    {isSpanish ? "Cómo funciona" : "How it works"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </ScrollLink>
                <SparkleAnimation isHovering={isHowItWorksHovered} />
              </div>
              <div
                className="relative"
                onMouseEnter={() => setIsViewCollectionHovered(true)}
                onMouseLeave={() => setIsViewCollectionHovered(false)}
              >
                <Link href="/factory">
                  <Button
                    size="lg"
                    className="bg-[#FF99CC] hover:bg-[#FF6666] text-black rounded-full hover:cursor-pointer px-8 gap-2 text-base"
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
          <div className="relative mt-8 lg:mt-0">
            <div className="relative">
              {/* 3D platform effect */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-[#FF9999] rounded-xl shadow-lg transform perspective-1000 rotate-x-60" />
              <ShimejiCharacter />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
