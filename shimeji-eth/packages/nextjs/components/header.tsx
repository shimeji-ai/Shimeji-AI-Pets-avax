"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DownloadButton from "./download-button";
import { useLanguage } from "./language-provider";
import { LanguageSwitcher } from "./language-switcher";
import { SparkleAnimation } from "./sparkle-animation";
import { Menu, X } from "lucide-react";

export function Header() {
  const { isSpanish } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isGetStartedHovered, setIsGetStartedHovered] = useState(false);
  const [isFeaturesHovered, setIsFeaturesHovered] = useState(false);
  const [isFaqHovered, setIsFaqHovered] = useState(false);
  const [isMarketplaceHovered, setIsMarketplaceHovered] = useState(false);
  const [isDownloadAppHovered, setIsDownloadAppHovered] = useState(false);

  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div className="max-w-6xl mx-auto neural-card rounded-2xl border border-white/10">
        <div className="flex items-center justify-between h-16 px-6 w-full">
          <div
            className="relative"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <Link href="/" className="flex items-center gap-3" prefetch={false}>
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Image src="/logo.png" alt="Shimeji Logo" width={36} height={36} />
              </div>
              <span className="text-lg font-semibold text-foreground tracking-tight">Shimeji AI Pets</span>
            </Link>
            <SparkleAnimation isHovering={isLogoHovered} />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <div
              className="relative"
              onMouseEnter={() => setIsGetStartedHovered(true)}
              onMouseLeave={() => setIsGetStartedHovered(false)}
            >
              <a
                href="#get-started"
                className="hover:cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {isSpanish ? "Empezar" : "Get Started"}
              </a>
              <SparkleAnimation isHovering={isGetStartedHovered} />
            </div>
            <div
              className="relative"
              onMouseEnter={() => setIsFeaturesHovered(true)}
              onMouseLeave={() => setIsFeaturesHovered(false)}
            >
              <a
                href="#features"
                className="hover:cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {isSpanish ? "Características" : "Features"}
              </a>
              <SparkleAnimation isHovering={isFeaturesHovered} />
            </div>
            <div
              className="relative"
              onMouseEnter={() => setIsFaqHovered(true)}
              onMouseLeave={() => setIsFaqHovered(false)}
            >
              <a
                href="#faq"
                className="hover:cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                FAQ
              </a>
              <SparkleAnimation isHovering={isFaqHovered} />
            </div>
            <div
              className="relative"
              onMouseEnter={() => setIsMarketplaceHovered(true)}
              onMouseLeave={() => setIsMarketplaceHovered(false)}
            >
              <Link
                href="/factory"
                prefetch={false}
                className="hover:cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {isSpanish ? "Fábrica" : "Factory"}
              </Link>
              <SparkleAnimation isHovering={isMarketplaceHovered} />
            </div>
            <Link
              href="/help"
              prefetch={false}
              className="hover:cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {isSpanish ? "Ayuda" : "Help"}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <div
              className="relative"
              onMouseEnter={() => setIsDownloadAppHovered(true)}
              onMouseLeave={() => setIsDownloadAppHovered(false)}
            >
              <DownloadButton />
              <SparkleAnimation isHovering={isDownloadAppHovered} />
            </div>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden px-6 pb-6 border-t border-border">
            <nav className="flex flex-col gap-4 pt-4">
              <a
                href="#get-started"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Empezar" : "Get Started"}
              </a>
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Características" : "Features"}
              </a>
              <a
                href="#faq"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </a>
              <Link
                href="/factory"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Fábrica" : "Factory"}
              </Link>
              <Link
                href="/help"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Ayuda" : "Help"}
              </Link>
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <DownloadButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
