"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SparkleAnimation } from "./sparkle-animation";
import DownloadButton from "./download-button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language-provider";
import { FreighterConnectButton } from "./freighter-connect-button";

interface NavHeaderProps {
  showConnectButton?: boolean;
  rightSlot?: React.ReactNode;
}

export function NavHeader({ showConnectButton = false, rightSlot }: NavHeaderProps) {
  const { isSpanish } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div className="max-w-6xl mx-auto neural-card rounded-2xl border border-white/10">
        <div className="flex items-center justify-between h-16 px-6 w-full">
          <div
            className="relative"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Shimeji Logo"
                  width={36}
                  height={36}
                />
              </div>
              <span className="text-lg font-semibold text-foreground tracking-tight">
                Shimeji AI Pets
              </span>
            </Link>
            <SparkleAnimation isHovering={isLogoHovered} />
          </div>

          <nav className="hidden lg:flex items-center gap-8">
           <Link
              href="/auction#subasta"
              className="header-auction-link text-sm transition-colors font-medium"
            >
              {isSpanish ? "Subasta" : "Auction"}
            </Link>
            <Link
              href="/collection"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {isSpanish ? "Colección" : "Collection"}
            </Link>
            <Link
              href="/help"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {isSpanish ? "Ayuda" : "Help"}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3">
              <LanguageSwitcher />
              <DownloadButton />
              {rightSlot}
              {showConnectButton && <FreighterConnectButton />}
            </div>
            {rightSlot && <div className="lg:hidden">{rightSlot}</div>}
            <button
              className="inline-flex items-center justify-center lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden px-6 pb-6 border-t border-border">
            <nav className="flex flex-col gap-4 pt-4">
              <Link
                href="/auction#subasta"
                className="header-auction-link transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Subasta" : "Auction"}
              </Link>
              <Link
                href="/collection"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Colección" : "Collection"}
              </Link>
              <Link
                href="/download"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {isSpanish ? "Descargar" : "Download"}
              </Link>
              <Link
                href="/help"
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
                {showConnectButton && <FreighterConnectButton />}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
