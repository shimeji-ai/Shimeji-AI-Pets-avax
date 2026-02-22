"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { ShimejiCharacter } from "@/components/shimeji-character";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/countdown-timer";
import { CurrencyToggle } from "@/components/currency-toggle";
import { CheckCircle, Loader2, Copy, Check, Tag, RefreshCw, Gavel } from "lucide-react";
import { fetchActiveAuction, buildBidXlmTx, buildBidUsdcTx } from "@/lib/auction";
import type { AuctionInfo, BidInfo } from "@/lib/auction";
import {
  fetchListings,
  fetchSwapOffers,
  buildBuyXlmTx,
  buildBuyUsdcTx,
  buildCancelListingTx,
  buildListForSaleTx,
  buildCreateSwapOfferTx,
  buildAcceptSwapTx,
  buildCancelSwapTx,
} from "@/lib/marketplace";
import type { ListingInfo, SwapOffer } from "@/lib/marketplace";
import {
  AUCTION_CONTRACT_ID,
  MARKETPLACE_CONTRACT_ID,
  getServer,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  STELLAR_NETWORK,
  STELLAR_NETWORK_LABEL,
  USDC_ISSUER,
} from "@/lib/contracts";

// ── Constants ────────────────────────────────────────────────────────────────

const LOCAL_BURNER_STORAGE_KEY = "shimeji_local_burner_secret";
const MAINNET_XLM_ONRAMP_URL = "https://stellar.org/products-and-tools/moneygram";
const TOKEN_SCALE = BigInt(10_000_000);
const MIN_INCREMENT_BPS = BigInt(500);
const BPS_DENOMINATOR = BigInt(10_000);

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

type Tab = "auction" | "buy" | "swap";
type WalletMode = "burner" | "freighter" | "none";
type WalletBalances = { xlm: string; usdc: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBidInput(value: number): string {
  const rounded = Math.max(0, Math.round(value * 1e7) / 1e7);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(7).replace(/\.?0+$/, "");
}

function formatShortDateTime(value: Date, includeYear: boolean) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[value.getMonth()];
  const year = value.getFullYear();
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  if (includeYear) return `${day}/${month}/${year} ${hour}:${minute}`;
  return `${day}/${month} ${hour}:${minute}`;
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

function shortAddress(address: string | null) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function formatTokenAmount(rawUnits: bigint | number) {
  const value = Number(rawUnits) / 1e7;
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ── Main component ────────────────────────────────────────────────────────────

export function MarketplaceSection() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("auction");

  // ── Wallet state ─────────────────────────────────────────────────────────
  const [walletMode, setWalletMode] = useState<WalletMode>(
    STELLAR_NETWORK === "local" ? "burner" : "freighter"
  );
  const [burnerSecret, setBurnerSecret] = useState<string | null>(null);
  const [burnerPublicKey, setBurnerPublicKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalances>({ xlm: "0", usdc: "0" });
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const { isSpanish } = useLanguage();
  const { publicKey, isAvailable, signTransaction } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);

  const isLocalNetwork = STELLAR_NETWORK === "local";
  const isTestnetNetwork = STELLAR_NETWORK === "testnet";
  const isMainnetNetwork = STELLAR_NETWORK === "mainnet";

  const activePublicKey = useMemo(() => {
    if (!isLocalNetwork) return publicKey;
    if (walletMode === "burner") return burnerPublicKey;
    if (walletMode === "freighter") return publicKey;
    return null;
  }, [burnerPublicKey, isLocalNetwork, publicKey, walletMode]);

  const hasConnectedWallet = Boolean(activePublicKey);

  // ── Auction state ────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<"XLM" | "USDC">("XLM");
  const [bidAmounts, setBidAmounts] = useState<{ XLM: string; USDC: string }>({ XLM: "500", USDC: "50" });
  const [isBidding, setIsBidding] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidError, setBidError] = useState("");
  const [auction, setAuction] = useState<AuctionInfo | null>(null);
  const [highestBid, setHighestBid] = useState<BidInfo | null>(null);
  const [recentOffers, setRecentOffers] = useState<BidInfo[]>([]);
  const [copiedBidder, setCopiedBidder] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [auctionId, setAuctionId] = useState<number>(0);
  const [auctionLoading, setAuctionLoading] = useState(true);

  // ── Buy/Swap state ────────────────────────────────────────────────────────
  const [listings, setListings] = useState<ListingInfo[]>([]);
  const [swapOffers, setSwapOffers] = useState<SwapOffer[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [swapsLoading, setSwapsLoading] = useState(true);
  const [buyCurrency, setBuyCurrency] = useState<"XLM" | "USDC">("XLM");
  const [txPending, setTxPending] = useState<string | null>(null); // listingId or swapId string
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [txError, setTxError] = useState("");

  // Sell form
  const [sellTokenId, setSellTokenId] = useState("");
  const [sellPriceXlm, setSellPriceXlm] = useState("500");
  const [sellPriceUsdc, setSellPriceUsdc] = useState("50");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellSuccess, setSellSuccess] = useState(false);
  const [sellError, setSellError] = useState("");

  // Swap form
  const [swapOfferedToken, setSwapOfferedToken] = useState("");
  const [swapDesiredToken, setSwapDesiredToken] = useState("");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [swapError, setSwapError] = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────

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
      setAuctionLoading(false);
    }
  }, []);

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await fetchListings();
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  const loadSwapOffers = useCallback(async () => {
    setSwapsLoading(true);
    try {
      const data = await fetchSwapOffers();
      setSwapOffers(data);
    } catch {
      setSwapOffers([]);
    } finally {
      setSwapsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAuction();
    loadListings();
    loadSwapOffers();
  }, [loadAuction, loadListings, loadSwapOffers]);

  // ── Burner wallet ─────────────────────────────────────────────────────────

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
    setupBurner().catch(() => setGlobalError(t("Could not initialize local burner wallet.", "No se pudo inicializar la wallet burner local.")));
    return () => { cancelled = true; };
  }, [isLocalNetwork, mounted, isSpanish]);

  // ── Balances ──────────────────────────────────────────────────────────────

  const loadBalances = useCallback(async (address: string | null) => {
    if (!address) { setBalances({ xlm: "0", usdc: "0" }); return; }
    setBalancesLoading(true);
    try {
      const response = await fetch(`${HORIZON_URL.replace(/\/$/, "")}/accounts/${address}`);
      if (!response.ok) { setBalances({ xlm: "0", usdc: "0" }); return; }
      const data = (await response.json()) as {
        balances?: Array<{ asset_type?: string; asset_code?: string; asset_issuer?: string; balance?: string }>;
      };
      const xlmBalance = data.balances?.find((e) => e.asset_type === "native")?.balance ?? "0";
      const usdcBalance = data.balances?.find((e) => e.asset_code === "USDC" && e.asset_issuer === USDC_ISSUER)?.balance ?? "0";
      setBalances({ xlm: xlmBalance, usdc: usdcBalance });
    } catch {
      setBalances({ xlm: "0", usdc: "0" });
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadBalances(activePublicKey);
  }, [activePublicKey, loadBalances, mounted]);

  // ── Faucet ────────────────────────────────────────────────────────────────

  const ensureLocalUsdcTrustline = useCallback(async (): Promise<boolean> => {
    if (!isLocalNetwork || !burnerPublicKey || !burnerSecret || !USDC_ISSUER) return false;
    const { Asset, BASE_FEE: BF, Horizon, Keypair, Operation, TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
    const horizon = new Horizon.Server(HORIZON_URL.replace(/\/$/, ""));
    let burnerAccount;
    try { burnerAccount = await horizon.loadAccount(burnerPublicKey); } catch { return false; }
    const hasTrustline = burnerAccount.balances.some(
      (e) => "asset_code" in e && "asset_issuer" in e && e.asset_code === "USDC" && e.asset_issuer === USDC_ISSUER
    );
    if (hasTrustline) return true;
    const trustTx = new TB(burnerAccount, { fee: BF, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.changeTrust({ asset: new Asset("USDC", USDC_ISSUER) }))
      .setTimeout(30).build();
    trustTx.sign(Keypair.fromSecret(burnerSecret));
    await horizon.submitTransaction(trustTx);
    return true;
  }, [burnerPublicKey, burnerSecret, isLocalNetwork]);

  const handleFaucet = useCallback(async () => {
    if (isMainnetNetwork) { window.open(MAINNET_XLM_ONRAMP_URL, "_blank", "noopener,noreferrer"); return; }
    if (!activePublicKey) return;
    setGlobalError("");
    setIsFaucetLoading(true);
    try {
      const requestBody = { address: activePublicKey };
      const res = await fetch("/api/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
      const payload = (await res.json()) as { error?: string; needsTrustline?: boolean; pendingAccount?: boolean };
      if (!res.ok) throw new Error(payload.error || t("Faucet failed.", "Falló el faucet."));
      if (payload.needsTrustline && isLocalNetwork && walletMode === "burner") {
        const ready = await ensureLocalUsdcTrustline();
        if (ready) {
          const retry = await fetch("/api/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
          if (!retry.ok) { const rp = (await retry.json()) as { error?: string }; throw new Error(rp.error || t("USDC faucet failed.", "Falló el faucet de USDC.")); }
        }
      }
      await loadBalances(activePublicKey);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : t("Could not fund wallet.", "No se pudo fondear la wallet."));
    } finally {
      setIsFaucetLoading(false);
    }
  }, [activePublicKey, ensureLocalUsdcTrustline, isLocalNetwork, isMainnetNetwork, loadBalances, t, walletMode]);

  // ── Transaction helper ────────────────────────────────────────────────────

  const signAndSubmit = useCallback(async (txXdr: string): Promise<void> => {
    const { Keypair, TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
    const server = getServer();
    let signedXdr = txXdr;
    if (isLocalNetwork && walletMode === "burner" && burnerSecret) {
      const localTx = TB.fromXDR(txXdr, NETWORK_PASSPHRASE);
      localTx.sign(Keypair.fromSecret(burnerSecret));
      signedXdr = localTx.toXDR();
    } else {
      signedXdr = await signTransaction(txXdr, { networkPassphrase: NETWORK_PASSPHRASE, address: activePublicKey! });
    }
    const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    await server.sendTransaction(tx);
  }, [activePublicKey, burnerSecret, isLocalNetwork, signTransaction, walletMode]);

  // ── Auction logic ─────────────────────────────────────────────────────────

  const minimumBidByCurrency = useMemo(() => {
    if (!auction) return { XLM: 500, USDC: 50 };
    const startXlm = auction.startingPriceXlm;
    const startUsdc = auction.startingPriceUsdc;
    const rate = auction.xlmUsdcRate;
    let minXlm = startXlm;
    let minUsdc = startUsdc;
    if (highestBid) {
      const highNorm = highestBid.currency === "Usdc" ? highestBid.amount : (highestBid.amount * rate) / TOKEN_SCALE;
      const reqNorm = highNorm + (highNorm * MIN_INCREMENT_BPS) / BPS_DENOMINATOR;
      minUsdc = reqNorm > minUsdc ? reqNorm : minUsdc;
      const reqXlm = rate > BigInt(0) ? ceilDiv(reqNorm * TOKEN_SCALE, rate) : minXlm;
      minXlm = reqXlm > minXlm ? reqXlm : minXlm;
    }
    return { XLM: Number(minXlm) / 1e7, USDC: Number(minUsdc) / 1e7 };
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
    if (!amount || amount <= 0 || amount < minimumBid) {
      amount = minimumBid;
      setBidAmounts((prev) => ({ ...prev, [currency]: minimumBidText }));
    }
    if (!activePublicKey) { setBidError(t("Connect your wallet to place a bid.", "Conecta tu wallet para ofertar.")); return; }
    setIsBidding(true);
    try {
      const rawAmount = BigInt(Math.round(amount * 1e7));
      const txXdr = currency === "XLM"
        ? await buildBidXlmTx(activePublicKey, auctionId, rawAmount)
        : await buildBidUsdcTx(activePublicKey, auctionId, rawAmount);
      await signAndSubmit(txXdr);
      const submittedBid: BidInfo = { bidder: activePublicKey, amount: rawAmount, currency: currency === "XLM" ? "Xlm" : "Usdc" };
      setHighestBid(submittedBid);
      setRecentOffers((prev) => [submittedBid, ...prev].slice(0, 8));
      setBidSuccess(true);
      setTimeout(() => { loadAuction(); loadBalances(activePublicKey); }, 3000);
    } catch (error) {
      setBidError(error instanceof Error ? error.message : t("Could not submit bid.", "No se pudo enviar la oferta."));
    } finally {
      setIsBidding(false);
    }
  };

  const latestOffers = useMemo(() => {
    const merged: BidInfo[] = [];
    const pushUnique = (bid: BidInfo | null) => {
      if (!bid) return;
      if (merged.some((e) => isSameBid(e, bid))) return;
      merged.push(bid);
    };
    recentOffers.forEach((bid) => pushUnique(bid));
    if (highestBid) {
      const rest = merged.filter((e) => !isSameBid(e, highestBid));
      return [highestBid, ...rest].slice(0, 4);
    }
    return [...merged].sort((a, b) => Number(b.amount - a.amount)).slice(0, 4);
  }, [highestBid, recentOffers]);

  const copyBidderAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedBidder(address);
      window.setTimeout(() => setCopiedBidder((cur) => (cur === address ? null : cur)), 1400);
    } catch {
      setBidError(t("Could not copy address.", "No se pudo copiar la dirección."));
    }
  };

  const currentBidDisplayValue = useMemo(() => {
    if (!highestBid || !auction) return t("No bids yet", "Sin ofertas aún");
    return `${formatTokenAmount(highestBid.amount)} ${highestBid.currency === "Xlm" ? "XLM" : "USDC"}`;
  }, [auction, highestBid, isSpanish]);

  const auctionDateLabel = useMemo(() => {
    if (!auction) return "";
    const s = new Date(auction.startTime * 1000);
    const e = new Date(auction.endTime * 1000);
    return `${formatShortDateTime(s, s.getFullYear() !== e.getFullYear())} - ${formatShortDateTime(e, s.getFullYear() !== e.getFullYear())}`;
  }, [auction]);

  const auctionExplorerUrl = useMemo(() => {
    if (!AUCTION_CONTRACT_ID) return null;
    if (isTestnetNetwork) return `https://stellar.expert/explorer/testnet/contract/${AUCTION_CONTRACT_ID}`;
    if (isMainnetNetwork) return `https://stellar.expert/explorer/public/contract/${AUCTION_CONTRACT_ID}`;
    return null;
  }, [isMainnetNetwork, isTestnetNetwork]);

  // ── Buy handlers ──────────────────────────────────────────────────────────

  const handleBuy = async (listing: ListingInfo) => {
    if (!activePublicKey) { setTxError(t("Connect wallet first.", "Conecta tu wallet primero.")); return; }
    setTxPending(`listing-${listing.listingId}`);
    setTxError("");
    setTxSuccess(null);
    try {
      const txXdr = buyCurrency === "XLM"
        ? await buildBuyXlmTx(activePublicKey, listing.listingId)
        : await buildBuyUsdcTx(activePublicKey, listing.listingId);
      await signAndSubmit(txXdr);
      setTxSuccess(`listing-${listing.listingId}`);
      setTimeout(() => { loadListings(); loadBalances(activePublicKey); setTxSuccess(null); }, 3000);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : t("Transaction failed.", "La transacción falló."));
    } finally {
      setTxPending(null);
    }
  };

  const handleCancelListing = async (listing: ListingInfo) => {
    if (!activePublicKey) return;
    setTxPending(`cancel-${listing.listingId}`);
    setTxError("");
    try {
      const txXdr = await buildCancelListingTx(activePublicKey, listing.listingId);
      await signAndSubmit(txXdr);
      setTimeout(() => { loadListings(); setTxPending(null); }, 3000);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : t("Cancel failed.", "Cancelación falló."));
      setTxPending(null);
    }
  };

  const handleSell = async () => {
    if (!activePublicKey) { setSellError(t("Connect wallet first.", "Conecta tu wallet primero.")); return; }
    const tokenId = parseInt(sellTokenId);
    if (!Number.isInteger(tokenId) || tokenId < 0) { setSellError(t("Invalid token ID.", "ID de token inválido.")); return; }
    const priceXlm = Math.round(parseFloat(sellPriceXlm) * 1e7);
    const priceUsdc = Math.round(parseFloat(sellPriceUsdc) * 1e7);
    if (!priceXlm || priceXlm <= 0 || !priceUsdc || priceUsdc <= 0) { setSellError(t("Enter valid prices.", "Ingresa precios válidos.")); return; }
    setSellLoading(true);
    setSellError("");
    setSellSuccess(false);
    try {
      const txXdr = await buildListForSaleTx(activePublicKey, tokenId, BigInt(priceXlm), BigInt(priceUsdc), BigInt(1600000));
      await signAndSubmit(txXdr);
      setSellSuccess(true);
      setSellTokenId("");
      setTimeout(() => { loadListings(); setSellSuccess(false); }, 3000);
    } catch (error) {
      setSellError(error instanceof Error ? error.message : t("Listing failed.", "Error al listar."));
    } finally {
      setSellLoading(false);
    }
  };

  // ── Swap handlers ─────────────────────────────────────────────────────────

  const handleCreateSwap = async () => {
    if (!activePublicKey) { setSwapError(t("Connect wallet first.", "Conecta tu wallet primero.")); return; }
    const offered = parseInt(swapOfferedToken);
    const desired = parseInt(swapDesiredToken);
    if (!Number.isInteger(offered) || offered < 0) { setSwapError(t("Invalid offered token ID.", "ID ofrecido inválido.")); return; }
    if (!Number.isInteger(desired) || desired < 0) { setSwapError(t("Invalid desired token ID.", "ID deseado inválido.")); return; }
    if (offered === desired) { setSwapError(t("Cannot swap a token with itself.", "No podés intercambiar el mismo token.")); return; }
    setSwapLoading(true);
    setSwapError("");
    setSwapSuccess(false);
    try {
      const txXdr = await buildCreateSwapOfferTx(activePublicKey, offered, desired);
      await signAndSubmit(txXdr);
      setSwapSuccess(true);
      setSwapOfferedToken("");
      setSwapDesiredToken("");
      setTimeout(() => { loadSwapOffers(); setSwapSuccess(false); }, 3000);
    } catch (error) {
      setSwapError(error instanceof Error ? error.message : t("Swap offer failed.", "Error al crear oferta de swap."));
    } finally {
      setSwapLoading(false);
    }
  };

  const handleAcceptSwap = async (offer: SwapOffer) => {
    if (!activePublicKey) { setTxError(t("Connect wallet first.", "Conecta tu wallet primero.")); return; }
    setTxPending(`swap-${offer.swapId}`);
    setTxError("");
    setTxSuccess(null);
    try {
      const txXdr = await buildAcceptSwapTx(activePublicKey, offer.swapId);
      await signAndSubmit(txXdr);
      setTxSuccess(`swap-${offer.swapId}`);
      setTimeout(() => { loadSwapOffers(); setTxSuccess(null); }, 3000);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : t("Accept swap failed.", "Error al aceptar el swap."));
    } finally {
      setTxPending(null);
    }
  };

  const handleCancelSwap = async (offer: SwapOffer) => {
    if (!activePublicKey) return;
    setTxPending(`cancel-swap-${offer.swapId}`);
    setTxError("");
    try {
      const txXdr = await buildCancelSwapTx(activePublicKey, offer.swapId);
      await signAndSubmit(txXdr);
      setTimeout(() => { loadSwapOffers(); setTxPending(null); }, 3000);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : t("Cancel failed.", "Cancelación falló."));
      setTxPending(null);
    }
  };

  // ── Shared sub-components ─────────────────────────────────────────────────

  const formatBalance = (raw: string) => {
    const v = Number(raw);
    return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : raw;
  };

  const formatPrice = (xlm: bigint, usdc: bigint) =>
    `${formatTokenAmount(xlm)} XLM / ${formatTokenAmount(usdc)} USDC`;

  const headerWalletLabel = isLocalNetwork
    ? walletMode === "burner"
      ? shortAddress(burnerPublicKey) ? `Burner ${shortAddress(burnerPublicKey)}` : "Burner"
      : walletMode === "freighter"
        ? shortAddress(publicKey) ? `Wallet ${shortAddress(publicKey)}` : "Wallet"
        : "Wallet Off"
    : "";

  const headerWalletButton = isLocalNetwork ? (
    <Button type="button" variant="outline" size="sm"
      className="h-9 border-white/20 bg-white/10 text-foreground hover:bg-white/20"
      onClick={() => {
        if (walletMode === "burner") { setWalletMode("none"); return; }
        if (walletMode === "none") { setWalletMode("freighter"); return; }
        setWalletMode(burnerPublicKey ? "burner" : "none");
      }}
    >
      {headerWalletLabel}
    </Button>
  ) : null;

  const headerFaucetButton = (isLocalNetwork || isTestnetNetwork || isMainnetNetwork) ? (
    <button type="button" onClick={handleFaucet} disabled={isFaucetLoading || (!isMainnetNetwork && !activePublicKey)}
      title={isMainnetNetwork ? t("Open MoneyGram ramps.", "Abrir MoneyGram ramps.") : t("Load test funds.", "Cargar fondos de prueba.")}
      className="auction-faucet-button inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={isFaucetLoading ? "animate-pulse" : ""}>💸</span>
    </button>
  ) : null;

  const walletConnectPrompt = (
    <div className="mt-4 flex flex-col items-center gap-3">
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
            <>Si usás Lobstr en mobile, abrí esta web desde el navegador interno de Lobstr. También podés{" "}
              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">instalar Freighter</a>.</>
          ) : (
            <>If you use Lobstr on mobile, open this site from Lobstr&apos;s in-app browser. You can also{" "}
              <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">install Freighter</a>.</>
          )}
        </p>
      ) : null}
    </div>
  );

  const balanceBadge = hasConnectedWallet ? (
    <p className="mt-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs text-muted-foreground break-words">
      {t("Available", "Disponible")}:{" "}
      <span className="font-semibold text-foreground">
        {balancesLoading ? t("Loading...", "Cargando...") : `${formatBalance(balances.xlm)} XLM / ${formatBalance(balances.usdc)} USDC`}
      </span>
      <span className="auction-network-badge ml-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] align-middle">
        <span>{t("Network", "Red")}:</span>
        <span className="font-semibold">{STELLAR_NETWORK_LABEL}</span>
      </span>
    </p>
  ) : null;

  // ── Tab: Auction ──────────────────────────────────────────────────────────

  const renderAuctionTab = () => {
    if (auctionLoading) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="auction-loading-track"><div className="auction-loading-runner"><div className="auction-loading-bunny">
            <img src="/bunny-hero.png" alt="" className="h-20 w-20 object-contain drop-shadow-2xl" />
            <span className="auction-loading-sparkle auction-loading-sparkle-a">✦</span>
            <span className="auction-loading-sparkle auction-loading-sparkle-b">✦</span>
            <span className="auction-loading-sparkle auction-loading-sparkle-c">✦</span>
          </div></div></div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">{t("Loading auction...", "Cargando subasta...")}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-start">
        <div className="flex flex-col items-center text-center">
          {auction ? (
            <p className="auction-shimeji-id text-2xl font-black uppercase tracking-tight sm:text-3xl">Shimeji #{auctionId}</p>
          ) : null}
          <div className="w-[15rem] h-[15rem] md:w-[24rem] md:h-[24rem] lg:w-[28rem] lg:h-[28rem] flex items-end justify-center">
            <ShimejiCharacter />
          </div>
        </div>

        {auction ? (
          <div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">{t("Currency", "Moneda")}</label>
                <CurrencyToggle value={currency} onChange={(c) => { setCurrency(c); setBidError(""); }} />
              </div>
              <button type="button" onClick={() => setShowDate((p) => !p)}
                className="flex flex-col items-center justify-center bg-transparent p-0 text-center cursor-pointer self-center">
                {showDate ? (
                  <p className="text-lg font-black text-foreground sm:text-xl">{formatShortDateTime(new Date(auction.endTime * 1000), false)}</p>
                ) : (
                  <CountdownTimer endTime={auction.endTime} compact
                    labels={isSpanish ? { days: "días", hours: "hrs", minutes: "min", seconds: "seg" } : undefined} />
                )}
              </button>
              <div className="self-start px-3 py-2 text-left sm:self-auto sm:text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Current bid", "Oferta actual")}</p>
                <p className="mt-0.5 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">{currentBidDisplayValue}</p>
              </div>
            </div>

            {hasConnectedWallet ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input type="number" value={bidAmounts[currency]}
                  onChange={(e) => setBidAmounts((p) => ({ ...p, [currency]: e.target.value }))}
                  placeholder={minimumBidText} min={0} step="any"
                  className="w-full flex-1 rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
                <Button onClick={handleBid} disabled={isBidding || !auction || auction.finalized}
                  className="w-full sm:w-auto sm:min-w-[170px] auction-bid-button rounded-xl py-6 text-lg font-black tracking-wide">
                  {isBidding ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("Placing bid...", "Ofertando...")}</span>
                    : t("OFFER!", "¡OFERTAR!")}
                </Button>
              </div>
            ) : walletConnectPrompt}

            {balanceBadge}

            <div className="mt-3 rounded-xl border border-white/10 bg-transparent p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("Latest offers", "Últimas ofertas")}</p>
              <div className="mt-2 space-y-2">
                {latestOffers.map((offer, index) => {
                  const isTop = index === 0;
                  return (
                    <div key={`${offer.bidder}-${offer.amount.toString()}-${offer.currency}-${index}`}
                      className={`auction-offer-row flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${isTop ? "auction-offer-row-top" : ""}`}>
                      <span className="flex min-w-0 flex-1 flex-col pr-3 leading-tight">
                        <span className="flex min-w-0 items-center gap-1">
                          <button type="button" onClick={() => copyBidderAddress(offer.bidder)}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-foreground/60 transition hover:cursor-pointer hover:text-foreground focus-visible:outline-none">
                            {copiedBidder === offer.bidder ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                          </button>
                          <span className={`min-w-0 flex-1 overflow-x-auto whitespace-nowrap pr-1 font-mono text-[11px] ${isTop ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {offer.bidder.length <= 8 ? offer.bidder : `${offer.bidder.slice(0, 4)}...${offer.bidder.slice(-4)}`}
                          </span>
                        </span>
                        {isTop ? <span className="text-[11px] uppercase tracking-wide text-foreground/75">{t("Offer to beat", "Oferta a vencer")}</span> : null}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-foreground">{`${Number(offer.amount) / 1e7} ${offer.currency === "Xlm" ? "XLM" : "USDC"}`}</span>
                      </div>
                    </div>
                  );
                })}
                {latestOffers.length === 0 ? <p className="text-xs text-muted-foreground">{t("No bids yet.", "Aún no hay ofertas.")}</p> : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-xs text-muted-foreground backdrop-blur-sm">
              {auctionExplorerUrl ? (
                <a href={auctionExplorerUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex max-w-full flex-wrap items-center gap-2 text-[11px] text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground">
                  <span>{t("View on Stellar Expert", "Ver en Stellar Expert")}</span>
                  <span className="font-mono text-foreground break-all hidden sm:inline">{AUCTION_CONTRACT_ID}</span>
                  <span className="font-mono text-foreground sm:hidden">{AUCTION_CONTRACT_ID.length > 8 ? `${AUCTION_CONTRACT_ID.slice(0, 4)}...${AUCTION_CONTRACT_ID.slice(-4)}` : AUCTION_CONTRACT_ID}</span>
                </a>
              ) : <p>{t("Explorer link available on testnet/mainnet.", "Link de explorador disponible en testnet/mainnet.")}</p>}
              <p className="auction-escrow-note mt-3 inline-block max-w-full rounded-lg border px-3 py-2 text-foreground">
                <a href="https://trustlesswork.com" target="_blank" rel="noopener noreferrer"
                  className="auction-escrow-link underline decoration-muted-foreground/50 underline-offset-4 hover:text-foreground">Trustless Work</a>
                {t(" is integrated as escrow for auction funds.", " está integrado como escrow para los fondos de la subasta.")}
              </p>
            </div>

            {bidSuccess ? (
              <div className="mt-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[var(--brand-accent)]" />
                  <p className="text-sm font-semibold text-foreground">{t("Bid placed!", "¡Oferta realizada!")}</p>
                </div>
              </div>
            ) : null}
            {bidError ? <p className="mt-3 text-xs text-red-500">{bidError}</p> : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-transparent p-6 text-center">
            <p className="text-muted-foreground">{t("No active auction right now. Check back soon!", "No hay subasta activa en este momento. ¡Volvé pronto!")}</p>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: Buy ──────────────────────────────────────────────────────────────

  const renderBuyTab = () => (
    <div className="space-y-6">
      {/* Sell form */}
      {hasConnectedWallet ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold text-foreground mb-3">{t("List your Shimeji for sale", "Listá tu Shimeji a la venta")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{t("Token ID", "ID de token")}</label>
              <input type="number" value={sellTokenId} onChange={(e) => setSellTokenId(e.target.value)} placeholder="0" min={0}
                className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{t("Price XLM", "Precio XLM")}</label>
              <input type="number" value={sellPriceXlm} onChange={(e) => setSellPriceXlm(e.target.value)} placeholder="500" min={0}
                className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{t("Price USDC", "Precio USDC")}</label>
              <input type="number" value={sellPriceUsdc} onChange={(e) => setSellPriceUsdc(e.target.value)} placeholder="50" min={0}
                className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
          </div>
          <Button onClick={handleSell} disabled={sellLoading} className="mt-3 auction-bid-button rounded-xl px-6 py-2 text-sm font-bold">
            {sellLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t("Listing...", "Listando...")}</span>
              : <span className="inline-flex items-center gap-2"><Tag className="w-4 h-4" />{t("List for Sale", "Listar a la venta")}</span>}
          </Button>
          {sellSuccess ? <p className="mt-2 text-xs text-green-400">{t("Listed successfully!", "¡Listado exitosamente!")}</p> : null}
          {sellError ? <p className="mt-2 text-xs text-red-500">{sellError}</p> : null}
        </div>
      ) : walletConnectPrompt}

      {/* Buy currency toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{t("Active Listings", "Listados activos")}</p>
        <CurrencyToggle value={buyCurrency} onChange={setBuyCurrency} />
      </div>

      {txError ? <p className="text-xs text-red-500">{txError}</p> : null}

      {listingsLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading listings...", "Cargando listados...")}</p>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-transparent p-6 text-center">
          <p className="text-muted-foreground">{t("No listings yet. Be the first to sell a Shimeji!", "Aún no hay listados. ¡Sé el primero en vender un Shimeji!")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const isOwnListing = listing.seller === activePublicKey;
            const isBuyPending = txPending === `listing-${listing.listingId}`;
            const isCancelPending = txPending === `cancel-${listing.listingId}`;
            const isSuccess = txSuccess === `listing-${listing.listingId}`;
            return (
              <div key={listing.listingId} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("Shimeji", "Shimeji")}</p>
                    <p className="text-xl font-black text-foreground">#{listing.tokenId}</p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {t("For Sale", "En venta")}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("Price", "Precio")}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {buyCurrency === "XLM" ? `${formatTokenAmount(listing.priceXlm)} XLM` : `${formatTokenAmount(listing.priceUsdc)} USDC`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatPrice(listing.priceXlm, listing.priceUsdc)}</p>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono truncate" title={listing.seller}>
                  {t("Seller", "Vendedor")}: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </p>
                {isSuccess ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle className="w-4 h-4" />{t("Purchased!", "¡Comprado!")}
                  </div>
                ) : isOwnListing ? (
                  <Button variant="outline" size="sm" disabled={isCancelPending}
                    onClick={() => handleCancelListing(listing)}
                    className="w-full rounded-xl border-white/20 text-xs">
                    {isCancelPending ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t("Cancelling...", "Cancelando...")}</span>
                      : t("Cancel Listing", "Cancelar listado")}
                  </Button>
                ) : hasConnectedWallet ? (
                  <Button onClick={() => handleBuy(listing)} disabled={isBuyPending}
                    className="w-full auction-bid-button rounded-xl py-2 text-sm font-bold">
                    {isBuyPending ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t("Buying...", "Comprando...")}</span>
                      : `${t("Buy with", "Comprar con")} ${buyCurrency}`}
                  </Button>
                ) : (
                  <FreighterConnectButton />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Tab: Swap ─────────────────────────────────────────────────────────────

  const renderSwapTab = () => (
    <div className="space-y-6">
      {/* Create swap offer form */}
      {hasConnectedWallet ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold text-foreground mb-3">{t("Create a Swap Offer", "Crear una oferta de intercambio")}</p>
          <p className="text-xs text-muted-foreground mb-3">{t("Offer one of your Shimejis in exchange for another.", "Ofrece uno de tus Shimejis a cambio de otro.")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{t("Your Shimeji (Token ID to offer)", "Tu Shimeji (ID a ofrecer)")}</label>
              <input type="number" value={swapOfferedToken} onChange={(e) => setSwapOfferedToken(e.target.value)} placeholder="0" min={0}
                className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{t("Desired Shimeji (Token ID you want)", "Shimeji deseado (ID que querés)")}</label>
              <input type="number" value={swapDesiredToken} onChange={(e) => setSwapDesiredToken(e.target.value)} placeholder="1" min={0}
                className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]" />
            </div>
          </div>
          <Button onClick={handleCreateSwap} disabled={swapLoading} className="mt-3 auction-bid-button rounded-xl px-6 py-2 text-sm font-bold">
            {swapLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t("Creating...", "Creando...")}</span>
              : <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />{t("Create Swap Offer", "Crear oferta de swap")}</span>}
          </Button>
          {swapSuccess ? <p className="mt-2 text-xs text-green-400">{t("Swap offer created!", "¡Oferta de swap creada!")}</p> : null}
          {swapError ? <p className="mt-2 text-xs text-red-500">{swapError}</p> : null}
        </div>
      ) : walletConnectPrompt}

      <p className="text-sm font-bold text-foreground">{t("Active Swap Offers", "Ofertas de intercambio activas")}</p>
      {txError ? <p className="text-xs text-red-500">{txError}</p> : null}

      {swapsLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading swap offers...", "Cargando ofertas de swap...")}</p>
      ) : swapOffers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-transparent p-6 text-center">
          <p className="text-muted-foreground">{t("No swap offers yet. Create the first one!", "Aún no hay ofertas de swap. ¡Creá la primera!")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {swapOffers.map((offer) => {
            const isOwnOffer = offer.offerer === activePublicKey;
            const isAcceptPending = txPending === `swap-${offer.swapId}`;
            const isCancelPending = txPending === `cancel-swap-${offer.swapId}`;
            const isSuccess = txSuccess === `swap-${offer.swapId}`;
            return (
              <div key={offer.swapId} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-foreground">
                    <span>#{offer.offeredTokenId}</span>
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <span>#{offer.desiredTokenId}</span>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {t("Swap", "Swap")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("Offerer wants to trade Shimeji", "Ofertante quiere intercambiar Shimeji")} #{offer.offeredTokenId} {t("for", "por")} #{offer.desiredTokenId}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate" title={offer.offerer}>
                  {t("By", "Por")}: {offer.offerer.slice(0, 6)}...{offer.offerer.slice(-4)}
                </p>
                {isSuccess ? (
                  <div className="flex items-center gap-2 text-green-400 text-xs">
                    <CheckCircle className="w-4 h-4" />{t("Swapped!", "¡Intercambiado!")}
                  </div>
                ) : isOwnOffer ? (
                  <Button variant="outline" size="sm" disabled={isCancelPending}
                    onClick={() => handleCancelSwap(offer)}
                    className="w-full rounded-xl border-white/20 text-xs">
                    {isCancelPending ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t("Cancelling...", "Cancelando...")}</span>
                      : t("Cancel Offer", "Cancelar oferta")}
                  </Button>
                ) : hasConnectedWallet ? (
                  <Button onClick={() => handleAcceptSwap(offer)} disabled={isAcceptPending}
                    className="w-full auction-bid-button rounded-xl py-2 text-sm font-bold">
                    {isAcceptPending ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t("Accepting...", "Aceptando...")}</span>
                      : t("Accept Swap", "Aceptar swap")}
                  </Button>
                ) : (
                  <FreighterConnectButton />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <section id="subasta" className="pt-28 px-4 min-h-screen pb-10">
        <div className="max-w-6xl mx-auto" />
      </section>
    );
  }

  const tabs: { id: Tab; label: string; labelEs: string; icon: React.ReactNode }[] = [
    { id: "auction", label: "Auction", labelEs: "Subasta", icon: <Gavel className="w-4 h-4" /> },
    { id: "buy",     label: "Buy",     labelEs: "Comprar",  icon: <Tag className="w-4 h-4" /> },
    { id: "swap",    label: "Swap",    labelEs: "Swap",     icon: <RefreshCw className="w-4 h-4" /> },
  ];

  return (
    <section id="subasta" className="pt-28 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
            {t("Marketplace", "Mercado")}
          </h1>
          <div className="flex items-center gap-2">
            {headerFaucetButton}
            {headerWalletButton}
            {!isLocalNetwork ? <FreighterConnectButton /> : null}
          </div>
        </div>

        {globalError ? <p className="mb-4 text-xs text-red-500">{globalError}</p> : null}
        {balanceBadge}

        {/* Tab bar */}
        <div className="mt-4 mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {tabs.map(({ id, label, labelEs, icon }) => (
            <button key={id} type="button"
              onClick={() => { setActiveTab(id); setTxError(""); setBidError(""); setSellError(""); setSwapError(""); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                activeTab === id
                  ? "bg-white/10 text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              <span>{isSpanish ? labelEs : label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-3xl p-1 md:p-2">
          {activeTab === "auction" && renderAuctionTab()}
          {activeTab === "buy" && renderBuyTab()}
          {activeTab === "swap" && renderSwapTab()}
        </div>

        {/* Marketplace contract badge */}
        {MARKETPLACE_CONTRACT_ID ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-muted-foreground">
            {t("Marketplace contract", "Contrato de marketplace")}:{" "}
            <span className="font-mono">{MARKETPLACE_CONTRACT_ID.slice(0, 8)}...{MARKETPLACE_CONTRACT_ID.slice(-8)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
