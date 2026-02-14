"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { NavHeader } from "@/components/nav-header";
import { Footer } from "@/components/footer";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/countdown-timer";
import { CurrencyToggle } from "@/components/currency-toggle";
import { Sparkles, Wallet, CheckCircle, Loader2 } from "lucide-react";
import { fetchActiveAuction, buildBidXlmTx, buildBidUsdcTx } from "@/lib/auction";
import type { AuctionInfo, BidInfo } from "@/lib/auction";
import {
  getServer,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  STELLAR_NETWORK,
  STELLAR_NETWORK_LABEL,
  USDC_ISSUER,
} from "@/lib/contracts";

const LOCAL_BURNER_STORAGE_KEY = "shimeji_local_burner_secret";
const MAINNET_XLM_ONRAMP_URL = "https://stellar.org/products-and-tools/moneygram";

type WalletMode = "burner" | "freighter" | "none";
type WalletBalances = {
  xlm: string;
  usdc: string;
};

export default function FactoryPage() {
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState<"XLM" | "USDC">("XLM");
  const [bidAmount, setBidAmount] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidError, setBidError] = useState("");
  const [auction, setAuction] = useState<AuctionInfo | null>(null);
  const [highestBid, setHighestBid] = useState<BidInfo | null>(null);
  const [auctionId, setAuctionId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [walletMode, setWalletMode] = useState<WalletMode>(
    STELLAR_NETWORK === "local" ? "burner" : "freighter"
  );
  const [burnerSecret, setBurnerSecret] = useState<string | null>(null);
  const [burnerPublicKey, setBurnerPublicKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalances>({ xlm: "0", usdc: "0" });
  const [balancesError, setBalancesError] = useState("");
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const { isSpanish } = useLanguage();
  const { isConnected, publicKey, isAvailable } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);
  const isLocalNetwork = STELLAR_NETWORK === "local";
  const isTestnetNetwork = STELLAR_NETWORK === "testnet";
  const isMainnetNetwork = STELLAR_NETWORK === "mainnet";

  const loadAuction = useCallback(async () => {
    try {
      const data = await fetchActiveAuction();
      if (data) {
        setAuction(data.auction);
        setHighestBid(data.highestBid);
        setAuctionId(data.auctionId);
      }
    } catch {
      // Contract not deployed or no auctions yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAuction();
  }, [loadAuction]);

  useEffect(() => {
    if (!isLocalNetwork || !mounted) return;

    let cancelled = false;
    async function setupBurner() {
      const { Keypair } = await import("@stellar/stellar-sdk");
      let secret = window.localStorage.getItem(LOCAL_BURNER_STORAGE_KEY);
      if (!secret) {
        secret = Keypair.random().secret();
        window.localStorage.setItem(LOCAL_BURNER_STORAGE_KEY, secret);
      }
      const keypair = Keypair.fromSecret(secret);
      if (cancelled) return;
      setBurnerSecret(secret);
      setBurnerPublicKey(keypair.publicKey());
      setWalletMode((prev) => (prev === "none" ? "burner" : prev));
    }

    setupBurner().catch(() => {
      setBidError(
        isSpanish
          ? "No se pudo inicializar la wallet burner local."
          : "Could not initialize local burner wallet."
      );
    });

    return () => {
      cancelled = true;
    };
  }, [isLocalNetwork, isSpanish, mounted]);

  const activePublicKey = useMemo(() => {
    if (!isLocalNetwork) return publicKey;
    if (walletMode === "burner") return burnerPublicKey;
    if (walletMode === "freighter") return publicKey;
    return null;
  }, [burnerPublicKey, isLocalNetwork, publicKey, walletMode]);

  const hasFreighterConnection = Boolean(isConnected && publicKey);
  const hasConnectedWallet = Boolean(activePublicKey);

  const loadBalances = useCallback(async (address: string | null) => {
    if (!address) {
      setBalances({ xlm: "0", usdc: "0" });
      setBalancesError("");
      return;
    }

    setBalancesLoading(true);
    setBalancesError("");
    try {
      const baseUrl = HORIZON_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/accounts/${address}`);
      if (!response.ok) {
        if (response.status === 404) {
          setBalances({ xlm: "0", usdc: "0" });
          setBalancesError(
            isSpanish
              ? "La cuenta no existe en esta red todavía. Usa Faucet para fondearla."
              : "This account does not exist on this network yet. Use Faucet to fund it."
          );
          return;
        }
        throw new Error("Could not load account balances.");
      }
      const data = (await response.json()) as {
        balances?: Array<{
          asset_type?: string;
          asset_code?: string;
          asset_issuer?: string;
          balance?: string;
        }>;
      };

      const xlmBalance =
        data.balances?.find((entry) => entry.asset_type === "native")?.balance ?? "0";
      const usdcBalance =
        data.balances?.find(
          (entry) => entry.asset_code === "USDC" && entry.asset_issuer === USDC_ISSUER
        )?.balance ?? "0";

      setBalances({ xlm: xlmBalance, usdc: usdcBalance });
      setBalancesError("");
    } catch {
      setBalances({ xlm: "0", usdc: "0" });
      setBalancesError(
        isSpanish
          ? "No se pudieron cargar los balances para esta red."
          : "Could not load balances for this network."
      );
    } finally {
      setBalancesLoading(false);
    }
  }, [isSpanish]);

  useEffect(() => {
    if (!mounted) return;
    loadBalances(activePublicKey);
  }, [activePublicKey, loadBalances, mounted]);

  const ensureLocalUsdcTrustline = useCallback(async (): Promise<boolean> => {
    if (!isLocalNetwork || !burnerPublicKey || !burnerSecret || !USDC_ISSUER) return false;
    const { Asset, BASE_FEE, Horizon, Keypair, Operation, TransactionBuilder } = await import(
      "@stellar/stellar-sdk"
    );
    const horizon = new Horizon.Server(HORIZON_URL.replace(/\/$/, ""));
    let burnerAccount;
    try {
      burnerAccount = await horizon.loadAccount(burnerPublicKey);
    } catch {
      // Account may still be creating right after faucet funding.
      return false;
    }
    const hasTrustline = burnerAccount.balances.some((entry) => {
      return (
        "asset_code" in entry &&
        "asset_issuer" in entry &&
        entry.asset_code === "USDC" &&
        entry.asset_issuer === USDC_ISSUER
      );
    });
    if (hasTrustline) return true;

    const trustTx = new TransactionBuilder(burnerAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset("USDC", USDC_ISSUER),
        })
      )
      .setTimeout(30)
      .build();

    trustTx.sign(Keypair.fromSecret(burnerSecret));
    await horizon.submitTransaction(trustTx);
    return true;
  }, [burnerPublicKey, burnerSecret, isLocalNetwork]);

  const handleFaucet = useCallback(async () => {
    if (isMainnetNetwork) {
      window.open(MAINNET_XLM_ONRAMP_URL, "_blank", "noopener,noreferrer");
      return;
    }

    if (!activePublicKey) {
      setBidError(
        t(
          "Connect a wallet first to use faucet.",
          "Conecta una wallet primero para usar el faucet."
        )
      );
      return;
    }

    setBidError("");
    setIsFaucetLoading(true);
    try {
      const requestBody = { address: activePublicKey };
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as {
        error?: string;
        needsTrustline?: boolean;
        pendingAccount?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || t("Faucet failed.", "Falló el faucet."));
      }

      if (payload.pendingAccount) {
        throw new Error(
          t(
            "XLM funded. Account is still activating. Press Faucet again in a moment.",
            "XLM fondeado. La cuenta todavía se está activando. Presioná Faucet otra vez en un momento."
          )
        );
      }

      if (payload.needsTrustline) {
        if (isLocalNetwork && walletMode === "burner") {
          const trustlineReady = await ensureLocalUsdcTrustline();
          if (!trustlineReady) {
            throw new Error(
              t(
                "XLM funded. Account is still activating. Press Faucet again in a moment for USDC.",
                "XLM fondeado. La cuenta todavía se está activando. Presioná Faucet otra vez en un momento para USDC."
              )
            );
          }
          const retry = await fetch("/api/faucet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          const retryPayload = (await retry.json()) as { error?: string; needsTrustline?: boolean };
          if (!retry.ok) {
            throw new Error(retryPayload.error || t("USDC faucet failed.", "Falló el faucet de USDC."));
          }
          if (retryPayload.needsTrustline) {
            throw new Error(
              t(
                "USDC trustline is still pending. Press Faucet again in a few seconds.",
                "La trustline de USDC sigue pendiente. Presioná Faucet otra vez en unos segundos."
              )
            );
          }
        } else {
          setBidError(
            t(
              "USDC trustline required in your wallet before receiving USDC.",
              "Se requiere trustline de USDC en tu wallet antes de recibir USDC."
            )
          );
        }
      }

      await loadBalances(activePublicKey);
    } catch (error) {
      setBidError(
        error instanceof Error ? error.message : t("Could not fund wallet.", "No se pudo fondear la wallet.")
      );
    } finally {
      setIsFaucetLoading(false);
    }
  }, [
    activePublicKey,
    ensureLocalUsdcTrustline,
    isLocalNetwork,
    isMainnetNetwork,
    loadBalances,
    t,
    walletMode,
  ]);

  const minimumBid = auction
    ? currency === "XLM"
      ? Number(auction.startingPriceXlm) / 1e7
      : Number(auction.startingPriceUsdc) / 1e7
    : currency === "XLM"
      ? 500
      : 50;

  const handleBid = async () => {
    setBidError("");
    setBidSuccess(false);
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      setBidError(t("Enter a valid bid amount.", "Ingresa un monto válido."));
      return;
    }
    if (!activePublicKey) {
      setBidError(t("Connect your wallet to place a bid.", "Conecta tu wallet para ofertar."));
      return;
    }
    if (amount < minimumBid) {
      setBidError(
        t(`Minimum bid is ${minimumBid} ${currency}.`, `La oferta mínima es ${minimumBid} ${currency}.`)
      );
      return;
    }
    setIsBidding(true);

    try {
      const bidderAddress = activePublicKey;
      const rawAmount = BigInt(Math.round(amount * 1e7));
      const txXdr =
        currency === "XLM"
          ? await buildBidXlmTx(bidderAddress, auctionId, rawAmount)
          : await buildBidUsdcTx(bidderAddress, auctionId, rawAmount);

      // Submit
      const { Keypair, TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
      const server = getServer();
      let signedXdr = txXdr;
      if (isLocalNetwork && walletMode === "burner" && burnerSecret) {
        const localTx = TB.fromXDR(txXdr, NETWORK_PASSPHRASE);
        localTx.sign(Keypair.fromSecret(burnerSecret));
        signedXdr = localTx.toXDR();
      } else {
        const freighterApi = await import("@stellar/freighter-api");
        const result = await freighterApi.signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        if (typeof result === "string") {
          throw new Error("Signing was cancelled");
        }
        signedXdr = result.signedTxXdr;
      }

      const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      await server.sendTransaction(tx);

      setBidSuccess(true);
      setBidAmount("");
      // Reload auction data
      setTimeout(() => {
        loadAuction();
        loadBalances(bidderAddress);
      }, 3000);
    } catch (error) {
      setBidError(
        error instanceof Error ? error.message : t("Could not submit bid.", "No se pudo enviar la oferta.")
      );
    } finally {
      setIsBidding(false);
    }
  };

  const formatBalance = (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return raw;
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatBid = (bid: BidInfo) => {
    const amount = Number(bid.amount) / 1e7;
    return `${amount.toLocaleString()} ${bid.currency === "Xlm" ? "XLM" : "USDC"}`;
  };

  const shortAddress = (address: string | null) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const showHeaderFaucet = isLocalNetwork || isTestnetNetwork || isMainnetNetwork;
  const headerWalletLabel = isLocalNetwork
    ? walletMode === "burner"
      ? shortAddress(burnerPublicKey)
        ? t(`Burner ${shortAddress(burnerPublicKey)}`, `Burner ${shortAddress(burnerPublicKey)}`)
        : t("Burner", "Burner")
      : walletMode === "freighter"
        ? shortAddress(publicKey)
          ? t(`Freighter ${shortAddress(publicKey)}`, `Freighter ${shortAddress(publicKey)}`)
          : t("Freighter", "Freighter")
        : t("Wallet", "Wallet")
    : "";

  const headerWalletButton = isLocalNetwork ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 border-white/20 bg-white/10 text-foreground hover:bg-white/20"
      onClick={() => {
        if (walletMode === "burner") {
          setWalletMode("freighter");
          return;
        }
        if (walletMode === "freighter") {
          setWalletMode(burnerPublicKey ? "burner" : "none");
          return;
        }
        setWalletMode(burnerPublicKey ? "burner" : "freighter");
      }}
    >
      {headerWalletLabel}
    </Button>
  ) : null;

  const headerFaucetButton = showHeaderFaucet ? (
    <button
      type="button"
      onClick={handleFaucet}
      disabled={isFaucetLoading || (!isMainnetNetwork && !activePublicKey)}
      title={
        isMainnetNetwork
          ? t(
              "Open MoneyGram ramps (official Stellar ecosystem onramp).",
              "Abrir MoneyGram ramps (onramp oficial del ecosistema Stellar)."
            )
          : t("Load test funds from faucet.", "Cargar fondos de prueba desde faucet.")
      }
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={isFaucetLoading ? "animate-pulse" : ""}>💸</span>
    </button>
  ) : null;

  const headerRightSlot = showHeaderFaucet ? (
    <div className="flex items-center gap-2">
      {headerWalletButton}
      {headerFaucetButton}
    </div>
  ) : null;

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader
        showConnectButton={!isLocalNetwork || walletMode === "freighter"}
        rightSlot={headerRightSlot}
      />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-[var(--brand-accent)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                {t("Auction", "Subasta")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Bid on a handcrafted shimeji. The highest bidder wins a unique desktop companion minted as an NFT.",
                  "Ofertá por un shimeji artesanal. El mejor postor gana una mascota de escritorio única acuñada como NFT."
                )}
              </p>
            </div>
          </div>

          {!mounted || loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-transparent mb-4"></div>
              <p className="text-muted-foreground">{t("Loading...", "Cargando...")}</p>
            </div>
          ) : hasConnectedWallet ? (
            <div className="neural-card rounded-2xl p-6 mb-10">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Left column: Egg + auction info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-[10.5rem] h-[10.5rem] flex items-center justify-center shrink-0">
                      <img
                        src="/egg-sit.png"
                        alt={t("Shimeji Egg", "Huevo Shimeji")}
                        className="w-[9rem] h-[9rem] object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {t("Custom Handcrafted Shimeji", "Shimeji artesanal personalizado")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "This auction awards a unique handcrafted shimeji minted as an NFT on Stellar. The winner receives a custom desktop pet with original sprites and full AI chat.",
                          "Esta subasta otorga un shimeji único artesanal acuñado como NFT en Stellar. El ganador recibe una mascota de escritorio personalizada con sprites originales y chat AI completo."
                        )}
                      </p>
                    </div>
                  </div>

                  {auction ? (
                    <div className="mt-6 space-y-4">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          {t("Time remaining", "Tiempo restante")}
                        </p>
                        <CountdownTimer
                          endTime={auction.endTime}
                          labels={
                            isSpanish
                              ? { days: "días", hours: "hrs", minutes: "min", seconds: "seg" }
                              : undefined
                          }
                        />
                      </div>

                      {highestBid ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            {t("Current highest bid", "Oferta más alta actual")}
                          </p>
                          <p className="text-2xl font-bold text-foreground">{formatBid(highestBid)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("by", "por")} {highestBid.bidder.slice(0, 6)}...{highestBid.bidder.slice(-4)}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            {t("Starting price", "Precio inicial")}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            ~${(Number(auction.startingPriceUsdc) / 1e7).toFixed(0)} USD
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("No bids yet. Be the first!", "Aún no hay ofertas. ¡Sé el primero!")}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                      <p className="text-muted-foreground">
                        {t(
                          "No active auction right now. Check back soon!",
                          "No hay subasta activa en este momento. ¡Volvé pronto!"
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right column: Bid card */}
                <div className="w-full lg:w-[300px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {t("Place a Bid", "Hacer una oferta")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("Connected as", "Conectado como")}{" "}
                      {activePublicKey ? `${activePublicKey.slice(0, 6)}...${activePublicKey.slice(-4)}` : "Wallet"}
                      {isLocalNetwork
                        ? walletMode === "burner"
                          ? ` (${t("Burner", "Burner")})`
                          : ` (${t("Freighter", "Freighter")})`
                        : "."}
                    </p>

                    {isLocalNetwork ? (
                      <div className="mb-4">
                        <label className="block text-xs text-muted-foreground mb-2">
                          {t("Wallet mode", "Modo de wallet")}
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={walletMode === "burner" ? "default" : "outline"}
                            className={
                              walletMode === "burner"
                                ? "neural-button h-8 px-3"
                                : "h-8 px-3 border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                            }
                            onClick={() => setWalletMode("burner")}
                            disabled={!burnerPublicKey}
                          >
                            {t("Burner", "Burner")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={walletMode === "freighter" ? "default" : "outline"}
                            className={
                              walletMode === "freighter"
                                ? "neural-button h-8 px-3"
                                : "h-8 px-3 border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                            }
                            onClick={() => setWalletMode("freighter")}
                          >
                            {t("Freighter", "Freighter")}
                          </Button>
                        </div>
                        {walletMode === "freighter" && !hasFreighterConnection ? (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            {t(
                              "Connect Freighter to load balances and bid.",
                              "Conecta Freighter para cargar balances y ofertar."
                            )}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mb-4">
                      <label className="block text-xs text-muted-foreground mb-2">
                        {t("Currency", "Moneda")}
                      </label>
                      <CurrencyToggle value={currency} onChange={setCurrency} />
                    </div>

                    <div className="mb-2">
                      <label className="block text-xs text-muted-foreground mb-2">
                        {t("Your bid", "Tu oferta")}
                      </label>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`${minimumBid}`}
                        min={0}
                        step="any"
                        className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(`Min: ${minimumBid} ${currency}`, `Mín: ${minimumBid} ${currency}`)}
                        {highestBid ? ` (+5%)` : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-2 text-sm border-t border-white/10 mt-3">
                      <span>{t("Network", "Red")}</span>
                      <span className="font-semibold">{STELLAR_NETWORK_LABEL}</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        {t("Available balances", "Saldos disponibles")}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span>XLM</span>
                        <span className="font-semibold">
                          {balancesLoading ? t("Loading...", "Cargando...") : `${formatBalance(balances.xlm)} XLM`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span>USDC</span>
                        <span className="font-semibold">
                          {balancesLoading ? t("Loading...", "Cargando...") : `${formatBalance(balances.usdc)} USDC`}
                        </span>
                      </div>
                      {balancesError ? (
                        <p className="mt-2 text-[11px] text-amber-300/90">{balancesError}</p>
                      ) : null}
                      <div className="mt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleFaucet}
                          disabled={isFaucetLoading || (!isMainnetNetwork && !activePublicKey)}
                          className="h-8 w-full border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                        >
                          {isFaucetLoading
                            ? t("Loading funds...", "Cargando fondos...")
                            : isMainnetNetwork
                              ? t("Open XLM Onramp", "Abrir Onramp XLM")
                              : t("Faucet (XLM/USDC)", "Faucet (XLM/USDC)")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {bidSuccess ? (
                    <div className="mt-4 bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                      <CheckCircle className="w-6 h-6 text-[var(--brand-accent)] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        {t("Bid placed!", "¡Oferta realizada!")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "Your bid has been submitted. You'll be refunded if outbid.",
                          "Tu oferta fue enviada. Se te reembolsará si alguien supera tu oferta."
                        )}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleBid}
                      disabled={isBidding || !auction || auction.finalized}
                      className="mt-4 w-full neural-button rounded-xl py-6"
                    >
                      {isBidding ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> {t("Placing bid...", "Ofertando...")}
                        </span>
                      ) : (
                        t("Place Bid", "Ofertar")
                      )}
                    </Button>
                  )}
                  {bidError ? (
                    <p className="mt-3 text-xs text-red-500">{bidError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 mb-8 neural-card rounded-2xl">
              <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
              {isLocalNetwork ? (
                <>
                  <p className="text-muted-foreground text-center mb-4 max-w-sm">
                    {walletMode === "none"
                      ? t(
                          "Burner wallet is disconnected. Use the Wallet button in the header to reconnect burner, or switch to Freighter.",
                          "La wallet burner está desconectada. Usa el botón Wallet en el header para reconectar burner, o cambia a Freighter."
                        )
                      : t(
                          "Freighter mode selected. Connect Freighter to bid, or switch back to burner from the header.",
                          "Modo Freighter seleccionado. Conecta Freighter para ofertar, o vuelve a burner desde el header."
                        )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                      onClick={() => setWalletMode("burner")}
                      disabled={!burnerPublicKey}
                    >
                      {t("Use Burner", "Usar Burner")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                      onClick={() => setWalletMode("freighter")}
                    >
                      {t("Use Freighter", "Usar Freighter")}
                    </Button>
                  </div>
                  {walletMode === "freighter" ? (
                    <div className="mt-4">
                      {isAvailable ? (
                        <FreighterConnectButton />
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">
                          {isSpanish ? (
                            <>
                              No detectamos Freighter.{" "}
                              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                                Instalá Freighter
                              </a>
                              .
                            </>
                          ) : (
                            <>
                              Freighter not detected.{" "}
                              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                                Install Freighter
                              </a>
                              .
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-center mb-4 max-w-sm">
                    {isAvailable ? (
                      isSpanish
                        ? "Conecta tu wallet Freighter para participar en la subasta."
                        : "Connect your Freighter wallet to participate in the auction."
                    ) : (
                      isSpanish ? (
                        <>
                          No detectamos Freighter.{" "}
                          <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                            Instalá Freighter
                          </a>{" "}
                          para continuar.
                        </>
                      ) : (
                        <>
                          Freighter not detected.{" "}
                          <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                            Install Freighter
                          </a>{" "}
                          to continue.
                        </>
                      )
                    )}
                  </p>
                  <FreighterConnectButton />
                </>
              )}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}
