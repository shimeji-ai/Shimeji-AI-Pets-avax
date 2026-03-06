"use client";

import { useEffect, useRef, useState } from "react";
import { Droplets, LogOut, Menu, Settings, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAddress } from "viem";
import { SparkleAnimation } from "./sparkle-animation";
import { useLanguage } from "./language-provider";
import { ConnectWalletButton } from "./connect-wallet-button";
import { useWalletSession } from "./wallet-provider";
import { LanguageSwitcher } from "./language-switcher";
import { formatTokenAmount, resolveMediaUrl } from "@/components/marketplace-hub-shared";
import { erc20Abi, getPublicClient, SHIMEJI_NETWORK, USDC_ADDRESS } from "@/lib/contracts";

const NAV_LINKS = [
  { href: "/marketplace", pathMatch: "/marketplace", labelEn: "Marketplace", labelEs: "Mercado" },
  { href: "/download", pathMatch: "/download", labelEn: "Download", labelEs: "Descarga" },
  { href: "/help", pathMatch: "/help", labelEn: "Help", labelEs: "Ayuda" },
] as const;

type WalletBalances = {
  avax: string;
  usdc: string;
};

function shortenAddress(value: string | null) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function Header() {
  const { isSpanish } = useLanguage();
  const { publicKey, isConnected, disconnect } = useWalletSession();
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [walletProfileDisplayName, setWalletProfileDisplayName] = useState("");
  const [walletProfileAvatarUrl, setWalletProfileAvatarUrl] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ avax: "-", usdc: "-" });

  const t = (en: string, es: string) => (isSpanish ? es : en);
  const isLocalNetwork = SHIMEJI_NETWORK === "local";

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen && !isProfileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
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
        const payload = (await response.json()) as { profile?: { displayName?: string; avatarUrl?: string } | null };
        if (cancelled) return;
        const profile = payload.profile || null;
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
      setWalletBalances({ avax: "-", usdc: "-" });
      return;
    }

    void (async () => {
      try {
        const address = getAddress(publicKey);
        const client = getPublicClient();
        const [avaxBalance, usdcBalance] = await Promise.all([
          client.getBalance({ address }),
          USDC_ADDRESS
            ? client.readContract({
                address: getAddress(USDC_ADDRESS),
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
              })
            : Promise.resolve(0n),
        ]);
        if (cancelled) return;
        setWalletBalances({
          avax: formatTokenAmount(avaxBalance, 18),
          usdc: formatTokenAmount(usdcBalance as bigint, 6),
        });
      } catch {
        if (cancelled) return;
        setWalletBalances({ avax: "-", usdc: "-" });
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

  const refreshBalances = async () => {
    if (!publicKey) return;
    const client = getPublicClient();
    const address = getAddress(publicKey);
    const [avaxBalance, usdcBalance] = await Promise.all([
      client.getBalance({ address }),
      USDC_ADDRESS
        ? client.readContract({
            address: getAddress(USDC_ADDRESS),
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          })
        : Promise.resolve(0n),
    ]);
    setWalletBalances({
      avax: formatTokenAmount(avaxBalance, 18),
      usdc: formatTokenAmount(usdcBalance as bigint, 6),
    });
  };

  const handleFaucet = async () => {
    if (!publicKey || !isLocalNetwork) return;
    setIsFaucetLoading(true);
    try {
      await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: publicKey }),
      });
      await refreshBalances();
    } finally {
      setIsFaucetLoading(false);
    }
  };

  const walletLabel = shortenAddress(publicKey);
  const profileTitle = walletProfileDisplayName || t("My profile", "Mi perfil");
  const profileHref = publicKey ? `/marketplace/artist/${encodeURIComponent(publicKey)}` : "/settings";
  const menuActionClass = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-white/5";

  return (
    <header ref={headerRef} className="fixed left-4 right-4 top-4 z-50">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 neural-card">
        <div className="flex h-16 w-full items-center justify-between px-6">
          <div className="relative" onMouseEnter={() => setIsLogoHovered(true)} onMouseLeave={() => setIsLogoHovered(false)}>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-foreground/8">
                <Image src="/logo.png" alt="Shimeji Logo" width={36} height={36} />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">Shimeji AI Pets</span>
            </Link>
            <SparkleAnimation isHovering={isLogoHovered} />
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <div key={link.href} className="relative" onMouseEnter={() => setHoveredLink(link.href)} onMouseLeave={() => setHoveredLink(null)}>
                <Link href={link.href} className={`text-sm font-medium transition-colors hover:cursor-pointer ${isActive(link.pathMatch) ? "header-active-link" : "text-muted-foreground hover:text-foreground"}`}>
                  {isSpanish ? link.labelEs : link.labelEn}
                </Link>
                <SparkleAnimation isHovering={hoveredLink === link.href} />
              </div>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher />
            <Link href="/settings" aria-label={t("Shimeji settings", "Configuración del shimeji")} title={t("Shimeji settings", "Configuración del shimeji")} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-foreground/8 text-foreground transition-colors hover:bg-foreground/15">
              <Settings className="h-4 w-4" />
            </Link>
            {!isConnected || !publicKey ? (
              <ConnectWalletButton />
            ) : (
              <div className="relative">
                <button type="button" onClick={() => setIsProfileMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-full border border-border bg-white/5 px-2 py-1.5 text-left hover:bg-white/10">
                  {walletProfileAvatarUrl ? (
                    <img src={walletProfileAvatarUrl} alt={profileTitle} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/10">
                      <UserRound className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{profileTitle}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{walletLabel}</p>
                  </div>
                </button>

                {isProfileMenuOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-[rgba(8,12,18,0.96)] p-3 shadow-2xl backdrop-blur">
                    <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3">
                      {walletProfileAvatarUrl ? (
                        <img src={walletProfileAvatarUrl} alt={profileTitle} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/10">
                          <UserRound className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{profileTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{publicKey}</p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">AVAX</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{walletBalances.avax}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">USDC</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{walletBalances.usdc}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link href={profileHref} className={menuActionClass}>
                        <UserRound className="h-4 w-4" />
                        <span>{t("Public profile", "Perfil público")}</span>
                      </Link>
                      <Link href="/settings" className={menuActionClass}>
                        <Settings className="h-4 w-4" />
                        <span>{t("Settings", "Configuración")}</span>
                      </Link>
                      {isLocalNetwork ? (
                        <button type="button" onClick={() => void handleFaucet()} className={menuActionClass}>
                          <Droplets className="h-4 w-4" />
                          <span>{isFaucetLoading ? t("Funding...", "Fondeando...") : t("Fund local wallet", "Fondear wallet local")}</span>
                        </button>
                      ) : null}
                      <button type="button" onClick={() => { disconnect(); setIsProfileMenuOpen(false); }} className={menuActionClass}>
                        <LogOut className="h-4 w-4" />
                        <span>{t("Disconnect", "Desconectar")}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button type="button" aria-label={isMenuOpen ? t("Close menu", "Cerrar menú") : t("Open menu", "Abrir menú")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-foreground/8 text-foreground transition-colors hover:bg-foreground/15" onClick={() => setIsMenuOpen((current) => !current)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-white/10 px-6 py-4 md:hidden">
            <div className="mb-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-xl px-3 py-2 text-sm text-foreground hover:bg-white/5">
                  {isSpanish ? link.labelEs : link.labelEn}
                </Link>
              ))}
            </div>

            {!isConnected || !publicKey ? (
              <ConnectWalletButton />
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-sm font-semibold text-foreground">{profileTitle}</p>
                  <p className="text-xs text-muted-foreground">{walletLabel}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">AVAX</p>
                      <p className="text-foreground">{walletBalances.avax}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-muted-foreground">USDC</p>
                      <p className="text-foreground">{walletBalances.usdc}</p>
                    </div>
                  </div>
                </div>
                <Link href={profileHref} className={menuActionClass}>
                  <UserRound className="h-4 w-4" />
                  <span>{t("Public profile", "Perfil público")}</span>
                </Link>
                {isLocalNetwork ? (
                  <button type="button" onClick={() => void handleFaucet()} className={menuActionClass}>
                    <Droplets className="h-4 w-4" />
                    <span>{isFaucetLoading ? t("Funding...", "Fondeando...") : t("Fund local wallet", "Fondear wallet local")}</span>
                  </button>
                ) : null}
                <button type="button" onClick={() => disconnect()} className={menuActionClass}>
                  <LogOut className="h-4 w-4" />
                  <span>{t("Disconnect", "Desconectar")}</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
