"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Gavel, ImageIcon, Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HubTranslateFn, TokenPreview } from "@/components/marketplace-hub-shared";
import { formatTokenAmount, parseAmountToUnits, walletShort } from "@/components/marketplace-hub-shared";
import type { MarketplaceMyStudioResponse } from "@/lib/marketplace-hub-types";

type ListAction = "fixed_price" | "auction" | "swap";

type Props = {
  t: HubTranslateFn;
  studio: MarketplaceMyStudioResponse;
  tokenPreviews: Record<string, TokenPreview>;
  txBusy: boolean;
  publicKey: string | null;
  onCreateListing: (tokenId: number, price: string, currency: "Xlm" | "Usdc") => void | Promise<void>;
  onCreateAuction: (tokenId: number, priceXlm: string, priceUsdc: string, durationHours: string) => void | Promise<void>;
  onCancelListing: (listingId: number) => void | Promise<void>;
  onCreateSwapOffer: (tokenId: number, intention: string) => void | Promise<void>;
  onAcceptSwapBid: (listingId: number, bidId: number) => void | Promise<void>;
  onCancelSwapListing: (listingId: number) => void | Promise<void>;
  onCancelSwapBid: (bidId: number) => void | Promise<void>;
};

export function MarketplaceHubStudioSellTab({
  t,
  studio,
  tokenPreviews,
  txBusy,
  publicKey,
  onCreateListing,
  onCreateAuction,
  onCancelListing,
  onCreateSwapOffer,
  onAcceptSwapBid,
  onCancelSwapListing,
  onCancelSwapBid,
}: Props) {
  const [listAction, setListAction] = useState<ListAction>("fixed_price");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [swapOfferedTokenId, setSwapOfferedTokenId] = useState("");
  const [swapIntention, setSwapIntention] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState<"Xlm" | "Usdc">("Xlm");
  const [auctionPriceXlm, setAuctionPriceXlm] = useState("");
  const [auctionPriceUsdc, setAuctionPriceUsdc] = useState("");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const [swapActionBusyId, setSwapActionBusyId] = useState<string | null>(null);

  const regularNfts = studio.ownedNfts.filter((n) => !n.isCommissionEgg);
  const allNfts = studio.ownedNfts;
  const activeListings = studio.myListings.filter((l) => l.active && !l.isCommissionEgg);
  const mySwapListings = studio.mySwapListings.filter((l) => l.active);
  const incomingBids = studio.incomingSwapBidsForMyListings.filter((b) => b.active);
  const outgoingBids = studio.myOutgoingSwapBids.filter((b) => b.active);

  const nftsForAction = listAction === "swap" ? allNfts : regularNfts;
  const currentSelectedId = listAction === "swap" ? swapOfferedTokenId : selectedTokenId;

  function handleNftClick(tokenId: string) {
    if (listAction === "swap") {
      setSwapOfferedTokenId(tokenId);
    } else {
      setSelectedTokenId(tokenId);
    }
  }

  function handleSubmit() {
    if (listAction === "fixed_price") {
      const tokenId = Number.parseInt(selectedTokenId, 10);
      if (!Number.isFinite(tokenId)) return;
      void onCreateListing(tokenId, listingPrice, listingCurrency);
    } else if (listAction === "auction") {
      const tokenId = Number.parseInt(selectedTokenId, 10);
      if (!Number.isFinite(tokenId)) return;
      void onCreateAuction(tokenId, auctionPriceXlm, auctionPriceUsdc, auctionDurationHours);
    } else {
      const tokenId = Number.parseInt(swapOfferedTokenId, 10);
      if (!Number.isFinite(tokenId)) return;
      void onCreateSwapOffer(tokenId, swapIntention.trim());
    }
  }

  async function handleAcceptSwapBid(listingId: number, bidId: number) {
    setSwapActionBusyId(`accept-bid:${bidId}`);
    try { await onAcceptSwapBid(listingId, bidId); } finally { setSwapActionBusyId(null); }
  }

  async function handleCancelSwapListingLocal(listingId: number) {
    setSwapActionBusyId(`cancel-listing:${listingId}`);
    try { await onCancelSwapListing(listingId); } finally { setSwapActionBusyId(null); }
  }

  async function handleCancelSwapBidLocal(bidId: number) {
    setSwapActionBusyId(`cancel-bid:${bidId}`);
    try { await onCancelSwapBid(bidId); } finally { setSwapActionBusyId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Action tabs + NFT selection + form */}
      <div className="rounded-2xl border border-border bg-white/5 p-4">
        {/* Action selector */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setListAction("fixed_price")}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
              listAction === "fixed_price"
                ? "border-emerald-300/30 bg-emerald-400/15 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-white/5"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            {t("Fixed Price", "Precio fijo")}
          </button>
          <button
            type="button"
            onClick={() => setListAction("auction")}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
              listAction === "auction"
                ? "border-amber-300/30 bg-amber-400/15 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-white/5"
            }`}
          >
            <Gavel className="h-3.5 w-3.5" />
            {t("Auction", "Subasta")}
          </button>
          <button
            type="button"
            onClick={() => setListAction("swap")}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
              listAction === "swap"
                ? "border-blue-300/30 bg-blue-400/15 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-white/5"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t("Swap", "Swap")}
          </button>
        </div>

        {/* Auction unavailable warning */}
        {listAction === "auction" && !studio.auctionCapability.itemAuctionsAvailable ? (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-foreground">
            {studio.auctionCapability.reason}
          </div>
        ) : null}

        {/* NFT selection grid */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-foreground">
            {listAction === "swap"
              ? t("Select the NFT you want to offer", "Selecciona el NFT que quieres ofrecer")
              : t("Select an NFT to list", "Selecciona un NFT para publicar")}
          </p>
          {nftsForAction.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
              {t("No eligible NFTs found.", "No se encontraron NFTs elegibles.")}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {nftsForAction.map((token) => {
                const preview = token.tokenUri ? tokenPreviews[token.tokenUri] : null;
                const isSelected = currentSelectedId === String(token.tokenId);
                const isListed = studio.myListings.some((l) => l.active && l.tokenId === token.tokenId);
                return (
                  <button
                    key={`sell-nft-${token.tokenId}`}
                    type="button"
                    onClick={() => handleNftClick(String(token.tokenId))}
                    className={`group relative overflow-hidden rounded-xl border transition ${
                      isSelected
                        ? "border-emerald-400/50 bg-emerald-400/10 ring-1 ring-emerald-400/30"
                        : "border-border bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-white/[0.04]">
                      {preview?.imageUrl ? (
                        <img
                          src={preview.imageUrl}
                          alt={preview.name || `#${token.tokenId}`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      {isSelected ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-400/20">
                          <Check className="h-5 w-5 text-emerald-400" />
                        </div>
                      ) : null}
                      {isListed ? (
                        <div className="absolute left-1 top-1">
                          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-foreground">
                            {t("Listed", "Publicado")}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="p-1.5 text-center">
                      <p className="text-[10px] font-medium text-foreground">#{token.tokenId}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Form fields based on action */}
        <div className="mt-4 space-y-3">
          {listAction === "fixed_price" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("Price", "Precio")}
                </label>
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("Currency", "Moneda")}
                </label>
                <select
                  value={listingCurrency}
                  onChange={(e) => setListingCurrency(e.target.value as "Xlm" | "Usdc")}
                  className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                >
                  <option value="Xlm">XLM</option>
                  <option value="Usdc">USDC</option>
                </select>
              </div>
            </div>
          ) : listAction === "auction" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Start XLM", "Inicio XLM")}
                  </label>
                  <input
                    type="number"
                    value={auctionPriceXlm}
                    onChange={(e) => setAuctionPriceXlm(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t("Start USDC", "Inicio USDC")}
                  </label>
                  <input
                    type="number"
                    value={auctionPriceUsdc}
                    onChange={(e) => setAuctionPriceUsdc(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("Duration (hours)", "Duración (horas)")}
                </label>
                <input
                  type="number"
                  value={auctionDurationHours}
                  onChange={(e) => setAuctionDurationHours(e.target.value)}
                  placeholder="24"
                  min="1"
                  className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("What are you looking for? (swap message)", "¿Qué buscas? (mensaje del swap)")}
              </label>
              <input
                type="text"
                value={swapIntention}
                onChange={(e) => setSwapIntention(e.target.value)}
                placeholder={t("e.g. Looking for pixel art NFTs", "ej. Busco NFTs de pixel art")}
                maxLength={200}
                className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={txBusy}
            className={`w-full ${
              listAction === "fixed_price"
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : listAction === "auction"
                  ? "bg-amber-500 text-black hover:bg-amber-400"
                  : "bg-blue-500 text-foreground hover:bg-blue-400"
            }`}
          >
            {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {listAction === "fixed_price"
              ? t("List for sale", "Publicar en venta")
              : listAction === "auction"
                ? t("Start auction", "Iniciar subasta")
                : t("Offer for swap", "Ofrecer para swap")}
          </Button>
        </div>
      </div>

      {/* Active fixed-price listings */}
      {activeListings.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("Active listings", "Publicaciones activas")}
          </h3>
          <div className="space-y-2">
            {activeListings.map((listing) => {
              const preview = listing.tokenUri ? tokenPreviews[listing.tokenUri] : null;
              return (
                <div
                  key={`active-listing-${listing.listingId}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-white/10">
                    {preview?.imageUrl ? (
                      <img
                        src={preview.imageUrl}
                        alt={`#${listing.tokenId}`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">#{listing.tokenId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTokenAmount(listing.price)} {listing.currency === "Usdc" ? "USDC" : "XLM"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-rose-400/30 bg-rose-500/10 text-foreground hover:bg-rose-500/20"
                    onClick={() => void onCancelListing(listing.listingId)}
                    disabled={txBusy}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("Cancel", "Cancelar")}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Swap activity */}
      {mySwapListings.length > 0 || incomingBids.length > 0 || outgoingBids.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("Swap activity", "Actividad de swaps")}
          </h3>

          {/* My swap listings */}
          {mySwapListings.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("My swap offers", "Mis ofertas de swap")}
              </p>
              <div className="space-y-2">
                {mySwapListings.map((listing) => (
                  <div
                    key={`my-swap-${listing.swapListingId}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {t("Token", "Token")} #{listing.offeredTokenId}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{listing.intention}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {listing.bidCount} {t("bids", "propuestas")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-rose-400/30 bg-rose-500/10 text-foreground hover:bg-rose-500/20"
                      onClick={() => void handleCancelSwapListingLocal(listing.swapListingId)}
                      disabled={swapActionBusyId === `cancel-listing:${listing.swapListingId}`}
                    >
                      {swapActionBusyId === `cancel-listing:${listing.swapListingId}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {t("Cancel", "Cancelar")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Incoming swap bids */}
          {incomingBids.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("Incoming bids on my listings", "Propuestas recibidas")}
              </p>
              <div className="space-y-2">
                {incomingBids.map((bid) => (
                  <div
                    key={`incoming-bid-${bid.bidId}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {walletShort(bid.bidder)} → #{bid.bidderTokenId}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{bid.listingIntention}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-emerald-500 text-black hover:bg-emerald-400"
                      onClick={() => void handleAcceptSwapBid(bid.listingId, bid.bidId)}
                      disabled={swapActionBusyId === `accept-bid:${bid.bidId}`}
                    >
                      {swapActionBusyId === `accept-bid:${bid.bidId}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {t("Accept", "Aceptar")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Outgoing swap bids */}
          {outgoingBids.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("My outgoing swap bids", "Mis propuestas enviadas")}
              </p>
              <div className="space-y-2">
                {outgoingBids.map((bid) => (
                  <div
                    key={`outgoing-bid-${bid.bidId}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        #{bid.bidderTokenId} → {walletShort(bid.listingCreator)} #{bid.listingOfferedTokenId}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{bid.listingIntention}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-rose-400/30 bg-rose-500/10 text-foreground hover:bg-rose-500/20"
                      onClick={() => void handleCancelSwapBidLocal(bid.bidId)}
                      disabled={swapActionBusyId === `cancel-bid:${bid.bidId}`}
                    >
                      {swapActionBusyId === `cancel-bid:${bid.bidId}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {t("Cancel bid", "Cancelar propuesta")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
