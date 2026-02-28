"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Gavel, ImageIcon, Loader2, Tag, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HubTranslateFn, TokenPreview } from "@/components/marketplace-hub-shared";
import { formatTokenAmount, walletShort } from "@/components/marketplace-hub-shared";
import type { MarketplaceMyStudioResponse } from "@/lib/marketplace-hub-types";

type ListAction = "fixed_price" | "auction" | "swap";
type MintMode = "unique" | "edition";
type MintListMode = "none" | "fixed_price" | "auction";

type CreateMintPackageRequest = {
  tokenUri: string;
  mode: MintMode;
  copies: number;
  listMode: MintListMode;
  listPrice?: string;
  listCurrency?: "Xlm" | "Usdc";
  auctionPrice?: string;
  auctionCurrency?: "Xlm" | "Usdc";
  auctionDurationHours?: string;
};

type Props = {
  t: HubTranslateFn;
  studio: MarketplaceMyStudioResponse;
  tokenPreviews: Record<string, TokenPreview>;
  txBusy: boolean;
  publicKey: string | null;
  showCreatePanel?: boolean;
  showTradePanel?: boolean;
  onCreateListing: (tokenId: number, price: string, currency: "Xlm" | "Usdc") => void | Promise<void>;
  onCreateAuction: (tokenId: number, price: string, currency: "Xlm" | "Usdc", durationHours: string) => void | Promise<void>;
  onCreateNftPackage: (request: CreateMintPackageRequest) => void | Promise<void>;
  onCancelListing: (listingId: number) => void | Promise<void>;
  onCreateSwapOffer: (tokenId: number, intention: string) => void | Promise<void>;
  onAcceptSwapBid: (listingId: number, bidId: number) => void | Promise<void>;
  onCancelSwapListing: (listingId: number) => void | Promise<void>;
  onCancelSwapBid: (bidId: number) => void | Promise<void>;
};

type RelativeFile = File & { webkitRelativePath?: string };

function parseAttributesText(raw: string) {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 64)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return null;
      const trait_type = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!trait_type || !value) return null;
      return { trait_type, value };
    })
    .filter((entry): entry is { trait_type: string; value: string } => Boolean(entry));
}

export function MarketplaceHubStudioSellTab({
  t,
  studio,
  tokenPreviews,
  txBusy,
  publicKey,
  showCreatePanel = true,
  showTradePanel = true,
  onCreateListing,
  onCreateAuction,
  onCreateNftPackage,
  onCancelListing,
  onCreateSwapOffer,
  onAcceptSwapBid,
  onCancelSwapListing,
  onCancelSwapBid,
}: Props) {
  const selectClassName =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";
  const selectStyle = { backgroundColor: "var(--card)", color: "var(--foreground)" } as const;
  const selectOptionClassName = "bg-popover text-popover-foreground";
  const selectOptionStyle = { backgroundColor: "var(--popover)", color: "var(--popover-foreground)" } as const;

  const [listAction, setListAction] = useState<ListAction>("fixed_price");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [swapOfferedTokenId, setSwapOfferedTokenId] = useState("");
  const [swapIntention, setSwapIntention] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState<"Xlm" | "Usdc">("Usdc");
  const [auctionPrice, setAuctionPrice] = useState("");
  const [auctionCurrency, setAuctionCurrency] = useState<"Xlm" | "Usdc">("Usdc");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const [swapActionBusyId, setSwapActionBusyId] = useState<string | null>(null);

  const [mintTitle, setMintTitle] = useState("");
  const [mintDescription, setMintDescription] = useState("");
  const [mintAttributesText, setMintAttributesText] = useState("");
  const [mintMode, setMintMode] = useState<MintMode>("unique");
  const [mintCopies, setMintCopies] = useState("5");
  const [mintListMode, setMintListMode] = useState<MintListMode>("fixed_price");
  const [mintListPrice, setMintListPrice] = useState("");
  const [mintListCurrency, setMintListCurrency] = useState<"Xlm" | "Usdc">("Usdc");
  const [mintAuctionPrice, setMintAuctionPrice] = useState("");
  const [mintAuctionCurrency, setMintAuctionCurrency] = useState<"Xlm" | "Usdc">("Usdc");
  const [mintAuctionDurationHours, setMintAuctionDurationHours] = useState("24");
  const [mintCoverImage, setMintCoverImage] = useState<File | null>(null);
  const [mintCoverPreviewUrl, setMintCoverPreviewUrl] = useState<string | null>(null);
  const [mintSpriteFiles, setMintSpriteFiles] = useState<File[]>([]);
  const [mintUploadBusy, setMintUploadBusy] = useState(false);
  const [mintFormError, setMintFormError] = useState("");
  const spriteFolderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = spriteFolderInputRef.current as (HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }) | null;
    if (!input) return;
    input.webkitdirectory = true;
    input.directory = true;
  }, []);

  useEffect(() => {
    if (!mintCoverImage) {
      setMintCoverPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(mintCoverImage);
    setMintCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mintCoverImage]);

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
      void onCreateAuction(tokenId, auctionPrice, auctionCurrency, auctionDurationHours);
    } else {
      const tokenId = Number.parseInt(swapOfferedTokenId, 10);
      if (!Number.isFinite(tokenId)) return;
      void onCreateSwapOffer(tokenId, swapIntention.trim());
    }
  }

  async function handleCreateMintPackage() {
    setMintFormError("");
    if (!publicKey) {
      setMintFormError(t("Connect your wallet first.", "Conectá tu wallet primero."));
      return;
    }
    if (!mintCoverImage) {
      setMintFormError(t("Select a cover image.", "Seleccioná una imagen de portada."));
      return;
    }
    if (!mintTitle.trim()) {
      setMintFormError(t("Title is required.", "El título es obligatorio."));
      return;
    }
    if (!mintDescription.trim()) {
      setMintFormError(t("Description is required.", "La descripción es obligatoria."));
      return;
    }
    if (mintSpriteFiles.length === 0) {
      setMintFormError(
        t(
          "Sprite folder is required for animated Shimeji NFTs.",
          "La carpeta de sprites es obligatoria para NFTs Shimeji animados.",
        ),
      );
      return;
    }

    const mode: MintMode = mintMode;
    const parsedCopies = Math.max(1, Number.parseInt(mintCopies || "1", 10) || 1);
    const copies = mode === "unique" ? 1 : Math.min(parsedCopies, 50);

    if (mintListMode === "fixed_price" && !mintListPrice.trim()) {
      setMintFormError(t("Set a fixed listing price.", "Definí un precio fijo para publicar."));
      return;
    }
    if (mintListMode === "auction" && !mintAuctionPrice.trim()) {
      setMintFormError(t("Set auction start price.", "Definí precio inicial de subasta."));
      return;
    }
    if (mintListMode === "auction" && !studio.auctionCapability.itemAuctionsAvailable) {
      setMintFormError(studio.auctionCapability.reason);
      return;
    }

    setMintUploadBusy(true);
    try {
      const attributes = parseAttributesText(mintAttributesText);
      const formData = new FormData();
      formData.append("title", mintTitle.trim());
      formData.append("description", mintDescription.trim());
      formData.append("mode", mode);
      formData.append("copies", String(copies));
      formData.append("attributes", JSON.stringify(attributes));
      formData.append("coverImage", mintCoverImage);

      for (const file of mintSpriteFiles) {
        const relativePath = ((file as RelativeFile).webkitRelativePath || file.name || "sprite.png").trim();
        formData.append("spriteFiles", file, relativePath);
        formData.append("spritePaths", relativePath);
      }

      const response = await fetch("/api/marketplace/mint-package", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string; tokenUri?: string };
      if (!response.ok || !payload.tokenUri) {
        throw new Error(payload.error || "Failed to upload NFT package.");
      }

      await onCreateNftPackage({
        tokenUri: payload.tokenUri,
        mode,
        copies,
        listMode: mintListMode,
        listPrice: mintListPrice,
        listCurrency: mintListCurrency,
        auctionPrice: mintAuctionPrice,
        auctionCurrency: mintAuctionCurrency,
        auctionDurationHours: mintAuctionDurationHours,
      });

      setMintTitle("");
      setMintDescription("");
      setMintAttributesText("");
      setMintMode("unique");
      setMintCopies("5");
      setMintListMode("fixed_price");
      setMintListPrice("");
      setMintListCurrency("Usdc");
      setMintAuctionPrice("");
      setMintAuctionCurrency("Usdc");
      setMintAuctionDurationHours("24");
      setMintCoverImage(null);
      setMintSpriteFiles([]);
    } catch (error) {
      setMintFormError(error instanceof Error ? error.message : "Failed to create NFT package.");
    } finally {
      setMintUploadBusy(false);
    }
  }

  async function handleAcceptSwapBid(listingId: number, bidId: number) {
    setSwapActionBusyId(`accept-bid:${bidId}`);
    try {
      await onAcceptSwapBid(listingId, bidId);
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCancelSwapListingLocal(listingId: number) {
    setSwapActionBusyId(`cancel-listing:${listingId}`);
    try {
      await onCancelSwapListing(listingId);
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCancelSwapBidLocal(bidId: number) {
    setSwapActionBusyId(`cancel-bid:${bidId}`);
    try {
      await onCancelSwapBid(bidId);
    } finally {
      setSwapActionBusyId(null);
    }
  }

  return (
    <div className="config-contrast-panel space-y-4">
      {showCreatePanel ? (
        <div className="rounded-2xl border border-blue-300/20 bg-blue-400/[0.06] p-4">
        <h3 className="text-sm font-semibold text-foreground">{t("Create and Publish NFT", "Crear y Publicar NFT")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "Upload cover art + sprite folder, define metadata, choose unique or edition copies, then mint and optionally list or auction immediately.",
            "Subí portada + carpeta de sprites, definí metadata, elegí único o edición con copias, y minteá con publicación o subasta opcional al instante.",
          )}
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Title", "Título")}</label>
              <input
                type="text"
                value={mintTitle}
                onChange={(e) => setMintTitle(e.target.value)}
                placeholder={t("My New Shimeji", "Mi nuevo Shimeji")}
                maxLength={120}
                className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Mode", "Modo")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMintMode("unique")}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    mintMode === "unique"
                      ? "border-emerald-300/30 bg-emerald-400/15 text-foreground"
                      : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {t("Unique 1/1", "Único 1/1")}
                </button>
                <button
                  type="button"
                  onClick={() => setMintMode("edition")}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    mintMode === "edition"
                      ? "border-blue-300/30 bg-blue-400/15 text-foreground"
                      : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {t("Edition", "Edición")}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Description", "Descripción")}</label>
            <textarea
              value={mintDescription}
              onChange={(e) => setMintDescription(e.target.value)}
              placeholder={t("Describe this Shimeji and style details.", "Describe este Shimeji y detalles del estilo.")}
              maxLength={4000}
              rows={3}
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("Attributes (one per line: trait:value)", "Atributos (una línea por atributo: rasgo:valor)")}
            </label>
            <textarea
              value={mintAttributesText}
              onChange={(e) => setMintAttributesText(e.target.value)}
              placeholder={t("Style:Pixel\nMood:Playful\nRig:Desktop", "Estilo:Pixel\nMood:Juguetón\nRig:Desktop")}
              rows={4}
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Cover Image", "Imagen de portada")}</label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-muted-foreground hover:bg-white/10">
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {mintCoverImage ? mintCoverImage.name : t("Choose image", "Elegir imagen")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setMintCoverImage(file);
                  }}
                />
              </label>
              {mintCoverPreviewUrl ? (
                <div className="mt-2 h-16 w-16 overflow-hidden rounded-lg border border-border bg-white/5">
                  <img src={mintCoverPreviewUrl} alt="cover preview" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("Sprite Folder (Required)", "Carpeta de sprites (Obligatoria)")}
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-muted-foreground hover:bg-white/10">
                <span className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {t("Choose folder", "Elegir carpeta")}
                </span>
                <input
                  ref={spriteFolderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    setMintSpriteFiles(Array.from(event.target.files || []));
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {mintSpriteFiles.length > 0
                  ? t(`${mintSpriteFiles.length} sprite files selected`, `${mintSpriteFiles.length} archivos de sprites seleccionados`)
                  : t(
                      "Required for Shimeji animation. Without sprites, this is just a static NFT.",
                      "Obligatoria para la animación de Shimeji. Sin sprites, esto es solo un NFT estático.",
                    )}
              </p>
            </div>
          </div>

          {mintMode === "edition" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Copies", "Copias")}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={mintCopies}
                  onChange={(e) => setMintCopies(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-white/5 p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("After mint", "Después de mintear")}
                </label>
                <select
                  value={mintListMode}
                  onChange={(e) => setMintListMode(e.target.value as MintListMode)}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option className={selectOptionClassName} style={selectOptionStyle} value="fixed_price">
                    {t("Auto-list fixed price", "Publicar a precio fijo")}
                  </option>
                  <option className={selectOptionClassName} style={selectOptionStyle} value="auction">
                    {t("Auto-start auction", "Iniciar subasta")}
                  </option>
                  <option className={selectOptionClassName} style={selectOptionStyle} value="none">
                    {t("Mint only", "Solo mintear")}
                  </option>
                </select>
              </div>
              {mintListMode === "fixed_price" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Price", "Precio")}</label>
                    <input
                      type="number"
                      value={mintListPrice}
                      onChange={(e) => setMintListPrice(e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Currency", "Moneda")}</label>
                    <select
                      value={mintListCurrency}
                      onChange={(e) => setMintListCurrency(e.target.value as "Xlm" | "Usdc")}
                      className={selectClassName}
                      style={selectStyle}
                    >
                      <option className={selectOptionClassName} style={selectOptionStyle} value="Xlm">
                        XLM
                      </option>
                      <option className={selectOptionClassName} style={selectOptionStyle} value="Usdc">
                        USDC
                      </option>
                    </select>
                  </div>
                </>
              ) : null}
              {mintListMode === "auction" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Start price", "Precio inicial")}</label>
                    <input
                      type="number"
                      value={mintAuctionPrice}
                      onChange={(e) => setMintAuctionPrice(e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Currency", "Moneda")}</label>
                    <select
                      value={mintAuctionCurrency}
                      onChange={(e) => setMintAuctionCurrency(e.target.value as "Xlm" | "Usdc")}
                      className={selectClassName}
                      style={selectStyle}
                    >
                      <option className={selectOptionClassName} style={selectOptionStyle} value="Xlm">XLM</option>
                      <option className={selectOptionClassName} style={selectOptionStyle} value="Usdc">USDC</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Duration (hours)", "Duración (horas)")}</label>
                    <input
                      type="number"
                      value={mintAuctionDurationHours}
                      onChange={(e) => setMintAuctionDurationHours(e.target.value)}
                      min="1"
                      placeholder="24"
                      className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {mintFormError ? (
            <div className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-foreground">
              {mintFormError}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleCreateMintPackage()}
            disabled={txBusy || mintUploadBusy}
            className="w-full bg-blue-500 text-black hover:bg-blue-400"
          >
            {txBusy || mintUploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("Create NFT Package + Mint", "Crear paquete NFT + Mintear")}
          </Button>
        </div>
        </div>
      ) : null}

      {showTradePanel ? (
        <>
          <div className="rounded-2xl border border-border bg-white/5 p-4">
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

        {listAction === "auction" && !studio.auctionCapability.itemAuctionsAvailable ? (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-foreground">
            {studio.auctionCapability.reason}
          </div>
        ) : null}

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

        <div className="mt-4 space-y-3">
          {listAction === "fixed_price" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Price", "Precio")}</label>
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Currency", "Moneda")}</label>
                <select
                  value={listingCurrency}
                  onChange={(e) => setListingCurrency(e.target.value as "Xlm" | "Usdc")}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option className={selectOptionClassName} style={selectOptionStyle} value="Xlm">
                    XLM
                  </option>
                  <option className={selectOptionClassName} style={selectOptionStyle} value="Usdc">
                    USDC
                  </option>
                </select>
              </div>
            </div>
          ) : listAction === "auction" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Start price", "Precio inicial")}</label>
                  <input
                    type="number"
                    value={auctionPrice}
                    onChange={(e) => setAuctionPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Currency", "Moneda")}</label>
                  <select
                    value={auctionCurrency}
                    onChange={(e) => setAuctionCurrency(e.target.value as "Xlm" | "Usdc")}
                    className={selectClassName}
                    style={selectStyle}
                  >
                    <option className={selectOptionClassName} style={selectOptionStyle} value="Xlm">XLM</option>
                    <option className={selectOptionClassName} style={selectOptionStyle} value="Usdc">USDC</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("Duration (hours)", "Duración (horas)")}</label>
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

          {activeListings.length > 0 ? (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("Active listings", "Publicaciones activas")}</h3>
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

          {mySwapListings.length > 0 || incomingBids.length > 0 || outgoingBids.length > 0 ? (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("Swap activity", "Actividad de swaps")}</h3>

          {mySwapListings.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("My swap offers", "Mis ofertas de swap")}</p>
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

          {outgoingBids.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("My outgoing swap bids", "Mis propuestas enviadas")}</p>
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
        </>
      ) : null}
    </div>
  );
}
