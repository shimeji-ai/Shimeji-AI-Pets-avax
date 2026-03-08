"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { MarketplaceHubStudioSellTab } from "@/components/marketplace-hub-studio-sell-tab";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { useWalletSession } from "@/components/wallet-provider";
import { parseAmountToUnits, submitContractWrite } from "@/components/marketplace-hub-shared";
import { buildCreateFinishedNftTx } from "@/lib/nft";
import { buildListForSaleTx } from "@/lib/marketplace";
import { buildCreateItemAuctionTx } from "@/lib/auction";
import type { MarketplaceMyStudioResponse } from "@/lib/marketplace-hub-types";

const EMPTY_STUDIO: MarketplaceMyStudioResponse = {
  wallet: "",
  profile: null,
  ownedNfts: [],
  myListings: [],
  myCommissionOrdersAsArtist: [],
  myCommissionOrdersAsBuyer: [],
  mySwapListings: [],
  incomingSwapBidsForMyListings: [],
  myOutgoingSwapBids: [],
  commissionEggLock: {
    canListNewCommissionEgg: false,
    reason: "Connect a wallet to create commission egg listings.",
    activeCommissionEggListingId: null,
    blockingOrderId: null,
  },
  auctionCapability: {
    itemAuctionsAvailable: true,
    reason: "",
  },
  generatedAt: 0,
};

type CreateMintPackageRequest = Parameters<typeof MarketplaceHubStudioSellTab>[0]["onCreateNftPackage"] extends (
  request: infer T,
) => unknown
  ? T
  : never;

export function CharacterCreatorPageClient() {
  const { isSpanish } = useLanguage();
  const { publicKey, isConnected, isConnecting, connect, signTransaction } = useWalletSession();
  const t = (en: string, es: string) => (isSpanish ? es : en);

  const [studio, setStudio] = useState<MarketplaceMyStudioResponse>(EMPTY_STUDIO);
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioError, setStudioError] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [txMessage, setTxMessage] = useState("");

  async function loadStudio(wallet: string) {
    setStudioLoading(true);
    setStudioError("");
    try {
      const response = await fetch(`/api/marketplace/my-studio?wallet=${encodeURIComponent(wallet)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MarketplaceMyStudioResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load studio");
      }
      setStudio(payload);
      return payload;
    } catch (error) {
      setStudioError(error instanceof Error ? error.message : "Failed to load studio.");
      return null;
    } finally {
      setStudioLoading(false);
    }
  }

  useEffect(() => {
    if (!publicKey) {
      setStudio({ ...EMPTY_STUDIO, generatedAt: Date.now() });
      setStudioError("");
      return;
    }
    void loadStudio(publicKey);
  }, [publicKey]);

  async function handleCreateNftPackage(request: CreateMintPackageRequest) {
    if (!publicKey) {
      setTxMessage(t("Connect your wallet to mint.", "Conectá tu wallet para mintear."));
      return;
    }

    setTxBusy(true);
    setTxMessage("");
    try {
      const mintCopies =
        request.mode === "unique" ? 1 : Math.max(1, Math.min(Number.parseInt(String(request.copies), 10) || 1, 50));
      const previousOwnedTokenIds = new Set((studio.ownedNfts || []).map((item) => item.tokenId));

      for (let index = 0; index < mintCopies; index += 1) {
        const mintTx = await buildCreateFinishedNftTx(publicKey, request.tokenUri);
        await submitContractWrite(mintTx, signTransaction, publicKey);
        setTxMessage(
          t(
            `Minting in progress (${index + 1}/${mintCopies})...`,
            `Minteo en progreso (${index + 1}/${mintCopies})...`,
          ),
        );
      }

      const refreshedStudio = await loadStudio(publicKey);
      if (!refreshedStudio) {
        throw new Error(t("Mint completed but studio refresh failed.", "El mint salió pero falló la actualización del estudio."));
      }

      const mintedTokens = refreshedStudio.ownedNfts
        .filter((item) => item.tokenUri === request.tokenUri && !previousOwnedTokenIds.has(item.tokenId))
        .sort((a, b) => a.tokenId - b.tokenId);

      if (mintedTokens.length === 0) {
        throw new Error(
          t(
            "Mint submitted, but the new NFT tokens were not found yet. Refresh and try listing again.",
            "El mint fue enviado, pero los nuevos tokens todavía no aparecen. Actualizá e intentá publicar otra vez.",
          ),
        );
      }

      if (request.listMode === "fixed_price") {
        const price = parseAmountToUnits(request.listPrice || "");
        const currency = request.listCurrency === "Avax" ? "Avax" : "Usdc";
        for (const token of mintedTokens) {
          const listTx = await buildListForSaleTx(publicKey, token.tokenId, price, currency);
          await submitContractWrite(listTx, signTransaction, publicKey);
        }
      } else if (request.listMode === "auction") {
        const price = parseAmountToUnits(request.auctionPrice || "");
        const currency = request.auctionCurrency === "Avax" ? "Avax" : "Usdc";
        const durationHours = Math.max(1, Number.parseInt(request.auctionDurationHours || "24", 10) || 24);
        for (const token of mintedTokens) {
          const auctionTx = await buildCreateItemAuctionTx(publicKey, token.tokenId, price, currency, durationHours * 3600);
          await submitContractWrite(auctionTx, signTransaction, publicKey);
        }
      }

      setTxMessage(
        request.listMode === "fixed_price"
          ? t("NFT minted and listed successfully.", "NFT minteado y publicado correctamente.")
          : request.listMode === "auction"
            ? t("NFT minted and sent to auction successfully.", "NFT minteado y enviado a subasta correctamente.")
            : t("NFT minted successfully.", "NFT minteado correctamente."),
      );
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to mint NFT.");
    } finally {
      setTxBusy(false);
    }
  }

  const steps = [
    {
      num: "1",
      label: t("Art", "Arte"),
      sub: t("Cover + sprites", "Portada + sprites"),
      color: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
    },
    {
      num: "2",
      label: t("Validate", "Validar"),
      sub: t("37 required sprites", "37 sprites requeridos"),
      color: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200",
    },
    {
      num: "3",
      label: t("Mint", "Mintear"),
      sub: t("IPFS + blockchain", "IPFS + blockchain"),
      color: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
    },
  ];

  return (
    <>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-28 md:px-6 lg:px-8">
        <div className="neural-card rounded-3xl border border-cyan-300/15 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Character Creator</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t("Load sprites locally, preview, and mint at the end", "Cargá sprites en local, previsualizá y minteá recién al final")}
              </h1>
              <p className="mt-3 text-sm leading-7 text-foreground/80 sm:text-base">
                {t(
                  "Upload sprites one by one or import a folder, test your character in the browser, and only go through IPFS, mint, and listing/auction at the very end.",
                  "Podés subir sprites uno por uno o importar una carpeta, probar el personaje en la web y recién al final pasar por IPFS, mint y listado/subasta.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                {steps.map(({ num, label, sub, color }) => (
                  <div key={num} className="flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${color}`}>
                      {num}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-emerald-400/50 hover:bg-emerald-400/25 hover:shadow-[0_0_16px_rgba(52,211,153,0.15)] disabled:opacity-60"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("Connect wallet", "Conectar wallet")}
                </button>
              ) : null}
              {publicKey ? (
                <button
                  type="button"
                  onClick={() => void loadStudio(publicKey)}
                  disabled={studioLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-foreground/80 transition-all hover:border-white/25 hover:bg-white/10 hover:text-foreground disabled:opacity-60"
                >
                  {studioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t("Refresh studio", "Actualizar estudio")}
                </button>
              ) : null}
            </div>
          </div>
          {studioError ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-foreground">
              {studioError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6 lg:px-8">
        <MarketplaceHubStudioSellTab
          t={t}
          studio={studio}
          tokenPreviews={{}}
          txBusy={txBusy}
          publicKey={publicKey}
          showCreatePanel
          showTradePanel={false}
          onCreateListing={async () => {}}
          onCreateAuction={async () => {}}
          onCreateNftPackage={(request) => void handleCreateNftPackage(request)}
          onCancelListing={async () => {}}
          onCreateSwapOffer={async () => {}}
          onAcceptSwapBid={async () => {}}
          onCancelSwapListing={async () => {}}
          onCancelSwapBid={async () => {}}
        />
      </section>

      {txMessage ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-border bg-black/80 p-3 text-sm text-foreground shadow-2xl backdrop-blur">
          {txMessage}
        </div>
      ) : null}
    </>
  );
}
