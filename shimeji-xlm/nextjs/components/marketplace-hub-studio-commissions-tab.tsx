"use client";

import { AlertTriangle, Check, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HubTranslateFn, TokenPreview } from "@/components/marketplace-hub-shared";
import {
  commissionAutoReleaseAt,
  commissionOrderIsOpen,
  formatTimestamp,
  formatTokenAmount,
  orderStatusChipClass,
  orderStatusLabel,
  walletShort,
} from "@/components/marketplace-hub-shared";
import type { MarketplaceMyStudioResponse, MyStudioCommissionOrderItem } from "@/lib/marketplace-hub-types";

type Props = {
  t: HubTranslateFn;
  studio: MarketplaceMyStudioResponse;
  tokenPreviews: Record<string, TokenPreview>;
  selectedTokenId: string;
  onSelectedTokenIdChange: (id: string) => void;
  listingPriceXlm: string;
  onListingPriceXlmChange: (v: string) => void;
  listingPriceUsdc: string;
  onListingPriceUsdcChange: (v: string) => void;
  listingCommissionEtaDays: string;
  onListingCommissionEtaDaysChange: (v: string) => void;
  txBusy: boolean;
  onCreateCommissionEggListing: () => void;
  onCancelListing: (listingId: number) => void;
  commissionDeliveryMetadataUriByOrderId: Record<string, string>;
  onCommissionDeliveryMetadataUriChange: (orderId: string, uri: string) => void;
  commissionRevisionIntentionByOrderId: Record<string, string>;
  onCommissionRevisionIntentionChange: (orderId: string, intention: string) => void;
  commissionRevisionReferenceByOrderId: Record<string, string>;
  onCommissionRevisionReferenceChange: (orderId: string, ref: string) => void;
  orderActionBusyId: string | null;
  onCommissionOrderAction: (
    order: MyStudioCommissionOrderItem,
    action: "deliver" | "approve" | "refund" | "claim_timeout",
  ) => void;
  onCommissionRevisionRequest: (order: MyStudioCommissionOrderItem) => void;
  publicKey: string | null;
};

export function MarketplaceHubStudioCommissionsTab({
  t,
  studio,
  tokenPreviews,
  selectedTokenId,
  onSelectedTokenIdChange,
  listingPriceXlm,
  onListingPriceXlmChange,
  listingPriceUsdc,
  onListingPriceUsdcChange,
  listingCommissionEtaDays,
  onListingCommissionEtaDaysChange,
  txBusy,
  onCreateCommissionEggListing,
  onCancelListing,
  commissionDeliveryMetadataUriByOrderId,
  onCommissionDeliveryMetadataUriChange,
  commissionRevisionIntentionByOrderId,
  onCommissionRevisionIntentionChange,
  commissionRevisionReferenceByOrderId,
  onCommissionRevisionReferenceChange,
  orderActionBusyId,
  onCommissionOrderAction,
  onCommissionRevisionRequest,
}: Props) {
  const commissionEggs = studio.ownedNfts.filter((n) => n.isCommissionEgg);
  const commissionEggListings = studio.myListings.filter((l) => l.active && l.isCommissionEgg);
  const ordersAsArtist = studio.myCommissionOrdersAsArtist.filter((o) => commissionOrderIsOpen(o.status));
  const ordersAsBuyer = studio.myCommissionOrdersAsBuyer.filter((o) => commissionOrderIsOpen(o.status));

  const { canListNewCommissionEgg, reason: lockReason } = studio.commissionEggLock;

  return (
    <div className="space-y-4">
      {/* Lock status banner */}
      {!canListNewCommissionEgg && lockReason ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>{lockReason}</p>
        </div>
      ) : null}

      {/* Commission egg listing form */}
      <div className="rounded-2xl border border-border bg-white/5 p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          {t("List a Commission Egg", "Publicar un Huevo de Comisión")}
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {t(
            "Commission eggs represent your commission slot. Buyers purchase them to open a commission order with you.",
            "Los huevos de comisión representan tu slot de comisión. Los compradores los adquieren para abrir una orden de comisión contigo.",
          )}
        </p>

        {/* Commission egg NFT selection */}
        {commissionEggs.length === 0 ? (
          <div className="mb-4 rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
            {t(
              "No commission eggs found. Mint a commission egg NFT first.",
              "No se encontraron huevos de comisión. Primero mintea un NFT de huevo de comisión.",
            )}
          </div>
        ) : (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-foreground">
              {t("Select a commission egg", "Selecciona un huevo de comisión")}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {commissionEggs.map((token) => {
                const preview = token.tokenUri ? tokenPreviews[token.tokenUri] : null;
                const isSelected = selectedTokenId === String(token.tokenId);
                const isListed = studio.myListings.some((l) => l.active && l.tokenId === token.tokenId);
                return (
                  <button
                    key={`commission-egg-${token.tokenId}`}
                    type="button"
                    onClick={() => onSelectedTokenIdChange(String(token.tokenId))}
                    className={`group relative overflow-hidden rounded-xl border transition ${
                      isSelected
                        ? "border-fuchsia-400/50 bg-fuchsia-400/10 ring-1 ring-fuchsia-400/30"
                        : "border-border bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-white/[0.04]">
                      {preview?.imageUrl ? (
                        <img
                          src={preview.imageUrl}
                          alt={`#${token.tokenId}`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      {isSelected ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-fuchsia-400/20">
                          <Check className="h-5 w-5 text-fuchsia-400" />
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
          </div>
        )}

        {/* Price and ETA fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("Price XLM", "Precio XLM")}
            </label>
            <input
              type="number"
              value={listingPriceXlm}
              onChange={(e) => onListingPriceXlmChange(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("Price USDC", "Precio USDC")}
            </label>
            <input
              type="number"
              value={listingPriceUsdc}
              onChange={(e) => onListingPriceUsdcChange(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("Estimated turnaround (days)", "Tiempo estimado de entrega (días)")}
            </label>
            <input
              type="number"
              value={listingCommissionEtaDays}
              onChange={(e) => onListingCommissionEtaDaysChange(e.target.value)}
              placeholder="7"
              min="1"
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={onCreateCommissionEggListing}
          disabled={txBusy || !canListNewCommissionEgg}
          className="mt-4 w-full bg-fuchsia-500 text-white hover:bg-fuchsia-400 disabled:opacity-50"
        >
          {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("List Commission Egg", "Publicar Huevo de Comisión")}
        </Button>

        {/* Active commission egg listings */}
        {commissionEggListings.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-foreground">
              {t("Active commission egg listings", "Publicaciones de huevos activas")}
            </p>
            {commissionEggListings.map((listing) => {
              const preview = listing.tokenUri ? tokenPreviews[listing.tokenUri] : null;
              return (
                <div
                  key={`egg-listing-${listing.listingId}`}
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
                      {formatTokenAmount(listing.priceXlm)} XLM
                      {Number(listing.priceUsdc) > 0 ? ` / ${formatTokenAmount(listing.priceUsdc)} USDC` : ""}
                      {listing.commissionEtaDays ? ` · ${listing.commissionEtaDays}d` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-rose-400/30 bg-rose-500/10 text-foreground hover:bg-rose-500/20"
                    onClick={() => onCancelListing(listing.listingId)}
                    disabled={txBusy}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("Cancel", "Cancelar")}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Commission orders as artist */}
      {ordersAsArtist.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("Commission orders (as artist)", "Órdenes de comisión (como artista)")}
          </h3>
          <div className="space-y-4">
            {ordersAsArtist.map((order) => {
              const autoReleaseAt = commissionAutoReleaseAt(order.deliveredAt);
              const isBusyDeliver = orderActionBusyId === `deliver:${order.orderId}`;
              const isBusyTimeout = orderActionBusyId === `claim_timeout:${order.orderId}`;
              return (
                <div key={`artist-order-${order.orderId}`} className="rounded-xl border border-border bg-white/5 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {t("Order", "Orden")} #{order.orderId}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${orderStatusChipClass(order.status)}`}
                      >
                        {orderStatusLabel(order.status, t)}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("Token", "Token")} #{order.tokenId} · {walletShort(order.buyer)}
                    </span>
                  </div>

                  {order.intention ? (
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{order.intention}</p>
                  ) : null}

                  {order.status === "Accepted" ? (
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          {t("Final metadata URI", "URI final de metadata")}
                        </label>
                        <input
                          type="text"
                          value={commissionDeliveryMetadataUriByOrderId[String(order.orderId)] || ""}
                          onChange={(e) =>
                            onCommissionDeliveryMetadataUriChange(String(order.orderId), e.target.value)
                          }
                          placeholder="ipfs://... or https://..."
                          className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-500 text-black hover:bg-emerald-400"
                        onClick={() => onCommissionOrderAction(order, "deliver")}
                        disabled={isBusyDeliver}
                      >
                        {isBusyDeliver ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {t("Mark as delivered", "Marcar como entregado")}
                      </Button>
                    </div>
                  ) : null}

                  {order.status === "Delivered" && autoReleaseAt > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {t("Auto-release:", "Liberación automática:")} {formatTimestamp(autoReleaseAt)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-border bg-white/5 text-foreground hover:bg-white/10"
                        onClick={() => onCommissionOrderAction(order, "claim_timeout")}
                        disabled={isBusyTimeout}
                      >
                        {isBusyTimeout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {t("Claim timeout", "Reclamar timeout")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Commission orders as buyer */}
      {ordersAsBuyer.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("Commission orders (as buyer)", "Órdenes de comisión (como comprador)")}
          </h3>
          <div className="space-y-4">
            {ordersAsBuyer.map((order) => {
              const autoReleaseAt = commissionAutoReleaseAt(order.deliveredAt);
              const isBusyApprove = orderActionBusyId === `approve:${order.orderId}`;
              const isBusyRefund = orderActionBusyId === `refund:${order.orderId}`;
              const isBusyRevision = orderActionBusyId === `revision:${order.orderId}`;
              const canRevise =
                order.status === "Delivered" && order.revisionRequestCount < order.maxRevisionRequests;
              return (
                <div key={`buyer-order-${order.orderId}`} className="rounded-xl border border-border bg-white/5 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {t("Order", "Orden")} #{order.orderId}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${orderStatusChipClass(order.status)}`}
                      >
                        {orderStatusLabel(order.status, t)}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("Artist", "Artista")}: {walletShort(order.seller)}
                    </span>
                  </div>

                  {order.intention ? (
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{order.intention}</p>
                  ) : null}

                  {order.status === "Delivered" ? (
                    <div className="space-y-2">
                      {order.lastDeliveredMetadataUri ? (
                        <p className="text-[11px] text-muted-foreground">
                          {t("Delivered metadata:", "Metadata entregada:")} {order.lastDeliveredMetadataUri}
                        </p>
                      ) : null}
                      {autoReleaseAt > 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          {t("Auto-approve:", "Aprobación automática:")} {formatTimestamp(autoReleaseAt)}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-500 text-black hover:bg-emerald-400"
                          onClick={() => onCommissionOrderAction(order, "approve")}
                          disabled={isBusyApprove}
                        >
                          {isBusyApprove ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {t("Approve delivery", "Aprobar entrega")}
                        </Button>
                        {canRevise ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-400/30 bg-amber-500/10 text-foreground hover:bg-amber-500/20"
                            onClick={() => onCommissionRevisionRequest(order)}
                            disabled={isBusyRevision}
                          >
                            {isBusyRevision ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {t("Request revision", "Pedir revisión")} ({order.revisionRequestCount}/
                            {order.maxRevisionRequests})
                          </Button>
                        ) : null}
                      </div>
                      {canRevise ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={commissionRevisionIntentionByOrderId[String(order.orderId)] || ""}
                            onChange={(e) =>
                              onCommissionRevisionIntentionChange(String(order.orderId), e.target.value)
                            }
                            placeholder={t(
                              "Change request description",
                              "Descripción del cambio solicitado",
                            )}
                            className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50"
                          />
                          <input
                            type="text"
                            value={commissionRevisionReferenceByOrderId[String(order.orderId)] || ""}
                            onChange={(e) =>
                              onCommissionRevisionReferenceChange(String(order.orderId), e.target.value)
                            }
                            placeholder={t(
                              "Reference image URL (optional)",
                              "URL de imagen de referencia (opcional)",
                            )}
                            className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : order.status === "Accepted" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-rose-400/30 bg-rose-500/10 text-foreground hover:bg-rose-500/20"
                      onClick={() => onCommissionOrderAction(order, "refund")}
                      disabled={isBusyRefund}
                    >
                      {isBusyRefund ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {t("Request refund", "Solicitar reembolso")}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {ordersAsArtist.length === 0 && ordersAsBuyer.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
          {t("No active commission orders.", "No hay órdenes de comisión activas.")}
        </div>
      ) : null}
    </div>
  );
}
