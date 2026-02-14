"use client";

import { useState, useEffect, useCallback } from "react";
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
  const { isSpanish } = useLanguage();
  const { isConnected, publicKey, isAvailable } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);

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
    if (!publicKey) {
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
      const rawAmount = BigInt(Math.round(amount * 1e7));
      const txXdr =
        currency === "XLM"
          ? await buildBidXlmTx(publicKey, auctionId, rawAmount)
          : await buildBidUsdcTx(publicKey, auctionId, rawAmount);

      // Sign with Freighter
      const freighterApi = await import("@stellar/freighter-api");
      const result = await freighterApi.signTransaction(txXdr, {
        networkPassphrase: "Test SDF Network ; September 2015",
      });
      if (typeof result === "string") {
        throw new Error("Signing was cancelled");
      }

      // Submit
      const { SorobanRpc, TransactionBuilder: TB } = await import("@stellar/stellar-sdk");
      const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");
      const tx = TB.fromXDR(result.signedTxXdr, "Test SDF Network ; September 2015");
      await server.sendTransaction(tx);

      setBidSuccess(true);
      setBidAmount("");
      // Reload auction data
      setTimeout(() => loadAuction(), 3000);
    } catch (error) {
      setBidError(
        error instanceof Error ? error.message : t("Could not submit bid.", "No se pudo enviar la oferta.")
      );
    } finally {
      setIsBidding(false);
    }
  };

  const formatBid = (bid: BidInfo) => {
    const amount = Number(bid.amount) / 1e7;
    return `${amount.toLocaleString()} ${bid.currency === "Xlm" ? "XLM" : "USDC"}`;
  };

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader showConnectButton />

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
          ) : isConnected ? (
            <div className="neural-card rounded-2xl p-6 mb-10">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Left column: Egg + auction info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 flex items-center justify-center">
                      <img src="/egg-sit.png" alt={t("Shimeji Egg", "Huevo Shimeji")} className="w-12 h-12 object-contain" />
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
                      {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Freighter"}.
                    </p>

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
                      <span className="font-semibold">Stellar Testnet</span>
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
            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}
