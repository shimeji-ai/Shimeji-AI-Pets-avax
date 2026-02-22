"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Settings2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SparkleAnimation } from "./sparkle-animation";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language-provider";
import { FreighterConnectButton } from "./freighter-connect-button";
import { useFreighter } from "./freighter-provider";
import { useSiteShimeji } from "./site-shimeji-provider";
import { STELLAR_NETWORK } from "@/lib/contracts";

const MAINNET_XLM_ONRAMP_URL = "https://stellar.org/products-and-tools/moneygram";

const NAV_LINKS = [
  { href: "/auction", pathMatch: "/auction", labelEn: "Auction", labelEs: "Subasta" },
  // { href: "/collection", pathMatch: "/collection", labelEn: "Collection", labelEs: "Colección" },
  { href: "/download", pathMatch: "/download", labelEn: "Download", labelEs: "Descarga" },
  { href: "/help", pathMatch: "/help", labelEn: "Help", labelEs: "Ayuda" },
];

export function Header() {
  const { isSpanish } = useLanguage();
  const { publicKey } = useFreighter();
  const { openConfig } = useSiteShimeji();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const isMainnetNetwork = STELLAR_NETWORK === "mainnet";
  const headerRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside the header
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const isActive = (pathMatch: string) => {
    if (pathMatch === "/") return pathname === "/";
    return pathname.startsWith(pathMatch);
  };

  const handleFaucet = async () => {
    if (isMainnetNetwork) {
      window.open(MAINNET_XLM_ONRAMP_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (!publicKey) return;
    setIsFaucetLoading(true);
    try {
      await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: publicKey }),
      });
    } finally {
      setIsFaucetLoading(false);
    }
  };

  return (
    <header ref={headerRef} className="fixed top-4 left-4 right-4 z-50">
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

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => setHoveredLink(link.href)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                <Link
                  href={link.href}
                  className={`hover:cursor-pointer text-sm transition-colors font-medium ${
                    isActive(link.pathMatch)
                      ? "header-active-link"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isSpanish ? link.labelEs : link.labelEn}
                </Link>
                <SparkleAnimation isHovering={hoveredLink === link.href} />
              </div>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={openConfig}
              title={isSpanish ? "Configurar Shimeji del sitio" : "Configure website shimeji"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-foreground hover:bg-white/20"
              aria-label={isSpanish ? "Abrir configuración del Shimeji del sitio" : "Open website shimeji settings"}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <FreighterConnectButton />
            <button
              type="button"
              onClick={handleFaucet}
              disabled={isFaucetLoading || (!isMainnetNetwork && !publicKey)}
              title={
                isMainnetNetwork
                  ? isSpanish
                    ? "Abrir MoneyGram ramps (onramp oficial del ecosistema Stellar)."
                    : "Open MoneyGram ramps (official Stellar ecosystem onramp)."
                  : isSpanish
                    ? "Cargar fondos de prueba desde faucet."
                    : "Load test funds from faucet."
              }
              className="auction-faucet-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={isFaucetLoading ? "animate-pulse" : ""}>💸</span>
            </button>
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={openConfig}
              className="p-2"
              aria-label={
                isSpanish
                  ? "Abrir configuración del Shimeji del sitio"
                  : "Open website shimeji settings"
              }
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              className="p-2"
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
          <div className="md:hidden px-6 pb-6 border-t border-border">
            <nav className="flex flex-col gap-4 pt-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors font-medium ${
                    isActive(link.pathMatch)
                      ? "header-active-link"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {isSpanish ? link.labelEs : link.labelEn}
                </Link>
              ))}
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openConfig();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>{isSpanish ? "Configurar Shimeji web" : "Web Shimeji settings"}</span>
                </button>
                <FreighterConnectButton />
                <button
                  type="button"
                  onClick={handleFaucet}
                  disabled={isFaucetLoading || (!isMainnetNetwork && !publicKey)}
                  className="auction-faucet-button inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className={isFaucetLoading ? "animate-pulse" : ""}>
                    {isMainnetNetwork
                      ? isSpanish
                        ? "Rampa XLM"
                        : "XLM Ramp"
                      : isSpanish
                        ? "Faucet"
                        : "Faucet"}
                  </span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
