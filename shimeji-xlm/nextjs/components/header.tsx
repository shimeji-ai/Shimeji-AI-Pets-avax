"use client";

import { useState, useEffect, useRef } from "react";
import { Droplets, Menu, Settings, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SparkleAnimation } from "./sparkle-animation";
import { useLanguage } from "./language-provider";
import { FreighterConnectButton } from "./freighter-connect-button";
import { useFreighter } from "./freighter-provider";
import { HORIZON_URL, STELLAR_NETWORK, USDC_ISSUER } from "@/lib/contracts";
import { resolveMediaUrl } from "@/components/marketplace-hub-shared";

const MAINNET_XLM_ONRAMP_URL = "https://stellar.org/products-and-tools/moneygram";
const DEFAULT_PROFILE_AVATAR_SRC = "/placeholder-user.jpg";

const NAV_LINKS = [
  { href: "/marketplace", pathMatch: "/marketplace", labelEn: "Marketplace", labelEs: "Mercado" },
  // { href: "/collection", pathMatch: "/collection", labelEn: "Collection", labelEs: "Colección" },
  { href: "/download", pathMatch: "/download", labelEn: "Download", labelEs: "Descarga" },
  { href: "/help", pathMatch: "/help", labelEn: "Help", labelEs: "Ayuda" },
];

export function Header() {
  const { isSpanish } = useLanguage();
  const { publicKey, isConnected, isConnecting, isDetecting, disconnect } = useFreighter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [walletProfileDisplayName, setWalletProfileDisplayName] = useState<string>("");
  const [walletProfileAvatarUrl, setWalletProfileAvatarUrl] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<{ xlm: string; usdc: string }>({ xlm: "-", usdc: "-" });
  const isMainnetNetwork = STELLAR_NETWORK === "mainnet";
  const headerRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Close menus when clicking outside the header
  useEffect(() => {
    if (!isMenuOpen && !isProfileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!publicKey) {
      setWalletProfileDisplayName("");
      setWalletProfileAvatarUrl(null);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/artist-profiles/${encodeURIComponent(publicKey)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: { displayName?: string; avatarUrl?: string } | null;
        };
        if (cancelled) return;
        const profile = payload?.profile || null;
        setWalletProfileDisplayName(String(profile?.displayName || "").trim());
        setWalletProfileAvatarUrl(resolveMediaUrl(profile?.avatarUrl || "") || null);
      } catch {
        if (cancelled) return;
        setWalletProfileDisplayName("");
        setWalletProfileAvatarUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  useEffect(() => {
    let cancelled = false;

    if (!publicKey) {
      setWalletBalances({ xlm: "-", usdc: "-" });
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          `${HORIZON_URL.replace(/\/$/, "")}/accounts/${encodeURIComponent(publicKey)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Failed to load balances");
        const payload = (await response.json()) as {
          balances?: Array<{
            asset_type?: string;
            asset_code?: string;
            asset_issuer?: string;
            balance?: string;
          }>;
        };
        if (cancelled) return;
        const xlm =
          payload.balances?.find((entry) => entry.asset_type === "native")?.balance ?? "0";
        const usdc =
          payload.balances?.find(
            (entry) => entry.asset_code === "USDC" && entry.asset_issuer === USDC_ISSUER,
          )?.balance ?? "0";
        setWalletBalances({ xlm, usdc });
      } catch {
        if (cancelled) return;
        setWalletBalances({ xlm: "-", usdc: "-" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

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

  const walletLabel = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : null;
  const profileTitle = walletProfileDisplayName || (isSpanish ? "Mi perfil" : "My profile");
  const profileConfigHref = "/settings";
  const myProfileHref = publicKey ? `/profile/${encodeURIComponent(publicKey)}` : "/settings";
  const menuActionClass =
    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-white/5";
  const formatBalance = (value: string) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
              <div className="w-9 h-9 rounded-xl bg-foreground/8 border border-border flex items-center justify-center">
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
            <Link
              href="/settings"
              aria-label={isSpanish ? "Configuración del shimeji" : "Shimeji settings"}
              title={isSpanish ? "Configuración del shimeji" : "Shimeji settings"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/8 text-foreground hover:bg-foreground/15 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Link>
            {!isConnected || !publicKey ? (
              <>
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
                  className="auction-faucet-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/8 text-lg hover:bg-foreground/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className={isFaucetLoading ? "animate-pulse" : ""}>💸</span>
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-foreground/8 px-2 py-1 hover:bg-foreground/15"
                  title={isSpanish ? "Abrir menú de perfil" : "Open profile menu"}
                >
                  <span className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
                    <img
                      src={walletProfileAvatarUrl || DEFAULT_PROFILE_AVATAR_SRC}
                      alt={profileTitle}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </span>
                </button>

                {isProfileMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur"
                  >
                    <div className="border-b border-border p-2">
                      <Link
                        href={myProfileHref}
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
                      >
                        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
                          <img
                            src={walletProfileAvatarUrl || DEFAULT_PROFILE_AVATAR_SRC}
                            alt={profileTitle}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{profileTitle}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {walletLabel || (isSpanish ? "Wallet conectada" : "Connected wallet")}
                          </span>
                        </span>
                      </Link>
                    </div>

                    <div className="border-b border-border px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                          <p className="text-muted-foreground">XLM</p>
                          <p className="truncate font-medium text-foreground">{formatBalance(walletBalances.xlm)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                          <p className="text-muted-foreground">USDC</p>
                          <p className="truncate font-medium text-foreground">{formatBalance(walletBalances.usdc)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => void handleFaucet()}
                        disabled={isFaucetLoading || (!isMainnetNetwork && !publicKey)}
                        className={`${menuActionClass} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <Droplets className={`h-4 w-4 ${isFaucetLoading ? "animate-pulse" : ""}`} />
                        {isMainnetNetwork
                          ? isSpanish
                            ? "Cargar fondos (XLM)"
                            : "Load funds (XLM)"
                          : isSpanish
                            ? "Cargar fondos"
                            : "Load funds"}
                      </button>
                      <Link
                        href={profileConfigHref}
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={menuActionClass}
                      >
                        <Settings className="h-4 w-4" />
                        {isSpanish ? "Configuración" : "Settings"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          disconnect();
                          setIsProfileMenuOpen(false);
                        }}
                        disabled={isConnecting || isDetecting}
                        className={`${menuActionClass} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <X className="h-4 w-4" />
                        {isDetecting
                          ? isSpanish
                            ? "Detectando wallet..."
                            : "Detecting wallet..."
                          : isConnecting
                            ? isSpanish
                              ? "Conectando..."
                              : "Connecting..."
                            : isSpanish
                              ? "Desconectar wallet"
                              : "Disconnect wallet"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/settings"
              aria-label={isSpanish ? "Configuración del shimeji" : "Shimeji settings"}
              title={isSpanish ? "Configuración del shimeji" : "Shimeji settings"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/8 text-foreground hover:bg-foreground/15 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Link>
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
              <div className="flex flex-col gap-2 pt-4">
                <FreighterConnectButton />
                <button
                  type="button"
                  onClick={handleFaucet}
                  disabled={isFaucetLoading || (!isMainnetNetwork && !publicKey)}
                  className="auction-faucet-button inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground/8 px-4 text-sm font-semibold hover:bg-foreground/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className={isFaucetLoading ? "animate-pulse" : ""}>
                    {isMainnetNetwork
                      ? isSpanish
                        ? "Rampa XLM"
                        : "XLM Ramp"
                      : isSpanish
                        ? "Cargar fondos"
                        : "Load funds"}
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
