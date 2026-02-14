"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { ShimejiCharacter } from "@/components/shimeji-character";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/countdown-timer";
import { CurrencyToggle } from "@/components/currency-toggle";
import { CheckCircle, Loader2, Copy, Check } from "lucide-react";
import { fetchActiveAuction, buildBidXlmTx, buildBidUsdcTx } from "@/lib/auction";
import type { AuctionInfo, BidInfo } from "@/lib/auction";
import {
  AUCTION_CONTRACT_ID,
  getServer,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  STELLAR_NETWORK,
  STELLAR_NETWORK_LABEL,
  USDC_ISSUER,
} from "@/lib/contracts";

const LOCAL_BURNER_STORAGE_KEY = "shimeji_local_burner_secret";
const MAINNET_XLM_ONRAMP_URL = "https://stellar.org/products-and-tools/moneygram";
const TOKEN_SCALE = BigInt(10_000_000);
const MIN_INCREMENT_BPS = BigInt(500);
const BPS_DENOMINATOR = BigInt(10_000);

type WalletMode = "burner" | "freighter" | "none";
type WalletBalances = {
  xlm: string;
  usdc: string;
};

function formatBidInput(value: number): string {
  const rounded = Math.max(0, Math.round(value * 1e7) / 1e7);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(7).replace(/\.?0+$/, "");
}

function ceilDiv(a: bigint, b: bigint): bigint {
  const zero = BigInt(0);
  const one = BigInt(1);
  if (b <= zero) return zero;
  return (a + b - one) / b;
}

function isSameBid(a: BidInfo, b: BidInfo): boolean {
  return a.bidder === b.bidder && a.amount === b.amount && a.currency === b.currency;
}

export function AuctionSection() {
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState<"XLM" | "USDC">("XLM");
  const [bidAmounts, setBidAmounts] = useState<{ XLM: string; USDC: string }>({
    XLM: "500",
    USDC: "50",
  });
  const [isBidding, setIsBidding] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidError, setBidError] = useState("");
  const [auction, setAuction] = useState<AuctionInfo | null>(null);
  const [highestBid, setHighestBid] = useState<BidInfo | null>(null);
  const [recentOffers, setRecentOffers] = useState<BidInfo[]>([]);
  const [copiedBidder, setCopiedBidder] = useState<string | null>(null);
  const [currentBidCurrencyView, setCurrentBidCurrencyView] = useState<"XLM" | "USDC">("XLM");
  const [showAuctionEndDate, setShowAuctionEndDate] = useState(false);
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
  const { publicKey, isAvailable, signTransaction } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);
  const isLocalNetwork = STELLAR_NETWORK === "local";
  const isTestnetNetwork = STELLAR_NETWORK === "testnet";
  const isMainnetNetwork = STELLAR_NETWORK === "mainnet";
  const auctionExplorerUrl = useMemo(() => {
    if (!AUCTION_CONTRACT_ID) return null;
    if (isTestnetNetwork) {
      return `https://stellar.expert/explorer/testnet/contract/${AUCTION_CONTRACT_ID}`;
    }
    if (isMainnetNetwork) {
      return `https://stellar.expert/explorer/public/contract/${AUCTION_CONTRACT_ID}`;
    }
    return null;
  }, [isMainnetNetwork, isTestnetNetwork]);

  const loadAuction = useCallback(async () => {
    try {
      const data = await fetchActiveAuction();
      if (data) {
        setAuction(data.auction);
        setHighestBid(data.highestBid);
        setRecentOffers(data.recentBids);
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

  const hasConnectedWallet = Boolean(activePublicKey);
  const bidAmount = bidAmounts[currency];

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

  const minimumBidByCurrency = useMemo(() => {
    if (!auction) {
      return { XLM: 500, USDC: 50 };
    }

    const startingXlmRaw = auction.startingPriceXlm;
    const startingUsdcRaw = auction.startingPriceUsdc;
    const rate = auction.xlmUsdcRate;

    let minXlmRaw = startingXlmRaw;
    let minUsdcRaw = startingUsdcRaw;

    if (highestBid) {
      const highestRaw = highestBid.amount;
      const highestNormUsdc =
        highestBid.currency === "Usdc"
          ? highestRaw
          : (highestRaw * rate) / TOKEN_SCALE;

      const requiredNormUsdc =
        highestNormUsdc + (highestNormUsdc * MIN_INCREMENT_BPS) / BPS_DENOMINATOR;

      minUsdcRaw = requiredNormUsdc > minUsdcRaw ? requiredNormUsdc : minUsdcRaw;

      const requiredXlmRaw =
        rate > BigInt(0) ? ceilDiv(requiredNormUsdc * TOKEN_SCALE, rate) : minXlmRaw;
      minXlmRaw = requiredXlmRaw > minXlmRaw ? requiredXlmRaw : minXlmRaw;
    }

    return {
      XLM: Number(minXlmRaw) / 1e7,
      USDC: Number(minUsdcRaw) / 1e7,
    };
  }, [auction, highestBid]);
  const minimumBid = minimumBidByCurrency[currency];
  const minimumBidText = formatBidInput(minimumBid);

  useEffect(() => {
    if (auction?.finalized) return;
    setBidAmounts((prev) => {
      const next = { ...prev };
      let changed = false;
      (["XLM", "USDC"] as const).forEach((code) => {
        const parsed = Number.parseFloat(prev[code]);
        if (!prev[code] || !Number.isFinite(parsed) || parsed < minimumBidByCurrency[code]) {
          next[code] = formatBidInput(minimumBidByCurrency[code]);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [auction, minimumBidByCurrency]);

  const handleBid = async () => {
    setBidError("");
    setBidSuccess(false);
    let amount = parseFloat(bidAmounts[currency]);
    if (!amount || amount <= 0) {
      if (minimumBid > 0) {
        amount = minimumBid;
        setBidAmounts((prev) => ({ ...prev, [currency]: minimumBidText }));
      } else {
        setBidError(t("Enter a valid bid amount.", "Ingresa un monto válido."));
        return;
      }
    }
    if (amount < minimumBid) {
      amount = minimumBid;
      setBidAmounts((prev) => ({ ...prev, [currency]: minimumBidText }));
    }
    if (!amount || amount <= 0) {
      setBidError(t("Enter a valid bid amount.", "Ingresa un monto válido."));
      return;
    }
    if (!activePublicKey) {
      setBidError(t("Connect your wallet to place a bid.", "Conecta tu wallet para ofertar."));
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
        signedXdr = await signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: bidderAddress,
        });
      }

      const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      await server.sendTransaction(tx);

      const submittedBid: BidInfo = {
        bidder: bidderAddress,
        amount: rawAmount,
        currency: currency === "XLM" ? "Xlm" : "Usdc",
      };
      setRecentOffers((prev) => [submittedBid, ...prev].slice(0, 8));

      setBidSuccess(true);
      setBidAmounts((prev) => ({ ...prev, [currency]: minimumBidText }));
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

  const formatTokenAmount = (rawUnits: bigint | number) => {
    const value = Number(rawUnits) / 1e7;
    if (!Number.isFinite(value)) return "0";
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const auctionDateLabel = useMemo(() => {
    const sourceDate = auction ? new Date(auction.startTime * 1000) : new Date();
    return sourceDate.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [auction]);
  const auctionEndDateLabel = useMemo(() => {
    if (!auction) return "";
    return new Date(auction.endTime * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [auction]);
  const currentBidDisplayValue = useMemo(() => {
    if (!highestBid || !auction) {
      return t("No bids yet", "Sin ofertas aún");
    }

    const highestCurrency = highestBid.currency === "Xlm" ? "XLM" : "USDC";
    if (highestCurrency === currentBidCurrencyView) {
      return `${formatTokenAmount(highestBid.amount)} ${highestCurrency}`;
    }

    const rate = auction.xlmUsdcRate;
    if (rate <= BigInt(0)) {
      return `${formatTokenAmount(highestBid.amount)} ${highestCurrency}`;
    }

    if (currentBidCurrencyView === "USDC" && highestBid.currency === "Xlm") {
      const converted = (highestBid.amount * rate) / TOKEN_SCALE;
      return `${formatTokenAmount(converted)} USDC`;
    }

    if (currentBidCurrencyView === "XLM" && highestBid.currency === "Usdc") {
      const converted = ceilDiv(highestBid.amount * TOKEN_SCALE, rate);
      return `${formatTokenAmount(converted)} XLM`;
    }

    return `${formatTokenAmount(highestBid.amount)} ${highestCurrency}`;
  }, [auction, currentBidCurrencyView, highestBid, isSpanish]);

  const shortAddress = (address: string | null) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const copyBidderAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedBidder(address);
      window.setTimeout(() => {
        setCopiedBidder((current) => (current === address ? null : current));
      }, 1400);
    } catch {
      setBidError(t("Could not copy address.", "No se pudo copiar la dirección."));
    }
  };

  const latestOffers = useMemo(() => {
    const merged: BidInfo[] = [];
    const pushUnique = (bid: BidInfo | null) => {
      if (!bid) return;
      if (merged.some((entry) => isSameBid(entry, bid))) return;
      merged.push(bid);
    };

    recentOffers.forEach((bid) => pushUnique(bid));
    if (highestBid) {
      const rest = merged.filter((entry) => !isSameBid(entry, highestBid));
      return [highestBid, ...rest].slice(0, 4);
    }

    return [...merged]
      .sort((a, b) => Number(b.amount - a.amount))
      .slice(0, 4);
  }, [highestBid, recentOffers]);

  const showHeaderFaucet = isLocalNetwork || isTestnetNetwork || isMainnetNetwork;
  const headerWalletLabel = isLocalNetwork
    ? walletMode === "burner"
      ? shortAddress(burnerPublicKey)
        ? t(`Burner ${shortAddress(burnerPublicKey)}`, `Burner ${shortAddress(burnerPublicKey)}`)
        : t("Burner", "Burner")
      : walletMode === "freighter"
        ? shortAddress(publicKey)
          ? t(`Wallet ${shortAddress(publicKey)}`, `Wallet ${shortAddress(publicKey)}`)
          : t("Wallet", "Wallet")
        : t("Wallet Off", "Wallet Off")
    : "";

  const headerWalletButton = isLocalNetwork ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 border-white/20 bg-white/10 text-foreground hover:bg-white/20"
      onClick={() => {
        if (walletMode === "burner") {
          setWalletMode("none");
          return;
        }
        if (walletMode === "none") {
          setWalletMode("freighter");
          return;
        }
        setWalletMode(burnerPublicKey ? "burner" : "none");
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
      className="auction-faucet-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={isFaucetLoading ? "animate-pulse" : ""}>💸</span>
    </button>
  ) : null;

  const walletConnectPrompt = (
    <div className="mt-4 flex flex-col items-center gap-3">
      <p className="text-muted-foreground text-center max-w-sm">
        {t("Connect your wallet to participate in the auction.", "Conecta tu billetera para participar en la subasta.")}
      </p>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <span className="auction-wallet-bunny-wrap" aria-hidden="true">
          <img src="/bunny-hero.png" alt="" className="auction-wallet-bunny" />
        </span>
        <FreighterConnectButton />
        <span className="auction-wallet-bunny-wrap is-right" aria-hidden="true">
          <img src="/bunny-hero.png" alt="" className="auction-wallet-bunny" />
        </span>
      </div>
      {!isAvailable ? (
        <p className="text-xs text-muted-foreground text-center max-w-md">
          {isSpanish ? (
            <>
              Si usas Lobstr en mobile, abrí esta web desde el navegador interno de Lobstr. También podés{" "}
              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                instalar Freighter
              </a>
              .
            </>
          ) : (
            <>
              If you use Lobstr on mobile, open this site from Lobstr&apos;s in-app browser. You can also{" "}
              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                install Freighter
              </a>
              .
            </>
          )}
        </p>
      ) : null}
    </div>
  );

  const isAuctionLoading = !mounted || loading;

  return (
    <section
      id="auction"
      className={`pt-28 px-4 ${isAuctionLoading ? "min-h-screen pb-10" : "pb-16"}`}
    >
      <div className="max-w-6xl mx-auto">
        {isAuctionLoading ? (
          <div className="auction-loading-screen flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center gap-4">
            <div className="auction-loading-track">
              <div className="auction-loading-runner">
                <div className="auction-loading-bunny">
                  <img
                    src="/bunny-hero.png"
                    alt={t("Loading auction", "Cargando subasta")}
                    className="h-28 w-28 object-contain drop-shadow-2xl"
                  />
                  <span className="auction-loading-sparkle auction-loading-sparkle-a">✦</span>
                  <span className="auction-loading-sparkle auction-loading-sparkle-b">✦</span>
                  <span className="auction-loading-sparkle auction-loading-sparkle-c">✦</span>
                </div>
              </div>
            </div>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              {t("Loading auction...", "Cargando subasta...")}
            </p>
          </div>
          ) : (
            <>
              <div className="mb-6 rounded-3xl p-1 md:p-2">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-start">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-[15rem] h-[15rem] md:w-[20rem] md:h-[20rem] flex items-center justify-center">
                      <ShimejiCharacter />
                    </div>
                    {auction ? (
                      <div className="mt-5 flex w-full justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAuctionEndDate((prev) => !prev)}
                          className="inline-flex items-center justify-center bg-transparent p-0 text-center"
                        >
                          <div className="flex h-[64px] items-center justify-center">
                            {showAuctionEndDate ? (
                              <p className="px-2 text-center text-xl font-semibold leading-tight text-foreground md:text-2xl">
                                {auctionEndDateLabel}
                              </p>
                            ) : (
                              <div className="w-full">
                                <CountdownTimer
                                  endTime={auction.endTime}
                                  labels={
                                    isSpanish
                                      ? { days: "días", hours: "hrs", minutes: "min", seconds: "seg" }
                                      : undefined
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {auction ? (
                    <div>
                      <p className="text-sm text-muted-foreground">{auctionDateLabel}</p>
                      <p className="mt-1 max-w-3xl text-xl font-semibold leading-tight text-foreground md:text-2xl">
                        {t(
                          "Bid on a handcrafted shimeji. The highest bidder wins a unique desktop companion minted as an NFT.",
                          "Ofertá por un shimeji artesanal. Gana una mascota de escritorio única acuñada como NFT."
                        )}
                      </p>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-2">
                            {t("Currency", "Moneda")}
                          </label>
                          <CurrencyToggle
                            value={currency}
                            onChange={(nextCurrency) => {
                              setCurrency(nextCurrency);
                              setCurrentBidCurrencyView(nextCurrency);
                              setBidError("");
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentBidCurrencyView((prev) => (prev === "XLM" ? "USDC" : "XLM"))
                          }
                          className="self-start rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10 sm:self-auto sm:text-right"
                        >
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("Current bid", "Oferta actual")}
                          </p>
                          <p className="mt-0.5 text-base font-semibold text-foreground">{currentBidDisplayValue}</p>
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) =>
                            setBidAmounts((prev) => ({ ...prev, [currency]: e.target.value }))
                          }
                          placeholder={minimumBidText}
                          min={0}
                          step="any"
                          className="w-full flex-1 rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                        />
                        <Button
                          onClick={handleBid}
                          disabled={isBidding || !auction || auction.finalized || !hasConnectedWallet}
                          className="w-full sm:w-auto sm:min-w-[170px] auction-bid-button rounded-xl py-6 text-lg font-black tracking-wide"
                        >
                          {isBidding ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> {t("Placing bid...", "Ofertando...")}
                            </span>
                          ) : (
                            t("OFFER!", "¡OFERTAR!")
                          )}
                        </Button>
                      </div>
                      {!hasConnectedWallet ? walletConnectPrompt : null}

                      <p className="mt-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs text-muted-foreground">
                        {t("Available balance", "Saldo disponible")}:{" "}
                        <span className="font-semibold text-foreground">
                          {balancesLoading
                            ? t("Loading...", "Cargando...")
                            : `${formatBalance(currency === "XLM" ? balances.xlm : balances.usdc)} ${currency}`}
                        </span>
                        <span className="auction-network-badge ml-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] align-middle">
                          <span>{t("Network", "Red")}:</span>
                          <span className="font-semibold">{STELLAR_NETWORK_LABEL}</span>
                        </span>
                      </p>
                      {balancesError ? (
                        <p className="mt-2 text-[11px] text-amber-300/90">{balancesError}</p>
                      ) : null}
                      <div className="mt-3 rounded-xl border border-white/10 bg-transparent p-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {t("Latest offers", "Últimas ofertas")}
                        </p>
                        <div className="mt-2 space-y-2">
                          {latestOffers.map((offer, index) => {
                            const isTop = index === 0;
                            return (
                              <div
                                key={`${offer.bidder}-${offer.amount.toString()}-${offer.currency}-${index}`}
                                className={`auction-offer-row flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                  isTop ? "auction-offer-row-top" : ""
                                }`}
                              >
                                <span className="flex min-w-0 flex-1 flex-col pr-3 leading-tight">
                                  <span className="flex min-w-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => copyBidderAddress(offer.bidder)}
                                      title={t("Copy wallet address", "Copiar dirección")}
                                      aria-label={t("Copy wallet address", "Copiar dirección")}
                                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-foreground/60 transition hover:text-foreground focus-visible:outline-none"
                                    >
                                      {copiedBidder === offer.bidder ? (
                                        <Check className="h-2.5 w-2.5" />
                                      ) : (
                                        <Copy className="h-2.5 w-2.5" />
                                      )}
                                    </button>
                                    <span
                                      className={`min-w-0 flex-1 overflow-x-auto whitespace-nowrap pr-1 font-mono text-[11px] ${
                                        isTop ? "font-semibold text-foreground" : "text-muted-foreground"
                                      }`}
                                    >
                                      {offer.bidder}
                                    </span>
                                  </span>
                                  {isTop ? (
                                    <span className="text-[11px] uppercase tracking-wide text-foreground/75">
                                      {t("Offer to beat", "Oferta a vencer")}
                                    </span>
                                  ) : null}
                                </span>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="font-semibold text-foreground">{formatBid(offer)}</span>
                                </div>
                              </div>
                            );
                          })}
                          {latestOffers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {t("No bids yet.", "Aún no hay ofertas.")}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-xs text-muted-foreground backdrop-blur-sm">
                        <p className="mb-2 uppercase tracking-wider">
                          {t("On-chain verification", "Verificación on-chain")}
                        </p>
                        {auctionExplorerUrl ? (
                          <div className="space-y-2">
                            <a
                              href={auctionExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground"
                            >
                              {t("Auction contract on Stellar Expert", "Contrato de subasta en Stellar Expert")}
                            </a>
                            <p>
                              {t("Contract ID", "ID del contrato")}:{" "}
                              <a
                                href={auctionExplorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono break-all underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground"
                              >
                                {AUCTION_CONTRACT_ID}
                              </a>
                            </p>
                          </div>
                        ) : (
                          <p>
                            {t(
                              "Explorer link available on testnet/mainnet.",
                              "Link de explorador disponible en testnet/mainnet."
                            )}
                          </p>
                        )}
                        <p className="auction-escrow-note mt-3 inline-block max-w-full rounded-lg border border-amber-400/60 bg-amber-300/20 px-3 py-2 text-foreground">
                          <span className="font-semibold">{t("Escrow", "Escrow")}: </span>
                          <a
                            href="https://trustlesswork.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="auction-escrow-link underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground"
                          >
                            Trustless Work
                          </a>
                          {t(
                            " is integrated as escrow for auction funds.",
                            " está integrado como escrow para los fondos de la subasta."
                          )}
                        </p>
                      </div>

                      {bidSuccess ? (
                        <div className="mt-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-[var(--brand-accent)]" />
                            <p className="text-sm font-semibold text-foreground">
                              {t("Bid placed!", "¡Oferta realizada!")}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {bidError ? (
                        <p className="mt-3 text-xs text-red-500">{bidError}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-transparent p-6 text-center">
                      <p className="text-muted-foreground">
                        {t(
                          "No active auction right now. Check back soon!",
                          "No hay subasta activa en este momento. ¡Volvé pronto!"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

      </div>
    </section>
  );
}
