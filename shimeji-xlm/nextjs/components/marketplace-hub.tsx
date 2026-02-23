"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InputField, ToggleField } from "@/components/marketplace-hub-fields";
import { MarketplaceHubMarketplaceTab } from "@/components/marketplace-hub-marketplace-tab";
import {
  type FeedAssetFilter,
  type FeedSaleFilter,
  type FeedSort,
  type HubTopTab,
  type ProfileDraft,
  type SocialLinkRow,
  type StudioWorkspaceTab,
  type TokenPreview,
  PROFILE_SESSION_PREFIX,
  buildProfileDraft,
  commissionAutoReleaseAt,
  commissionOrderIsOpen,
  computeRate,
  formatTimestamp,
  formatTokenAmount,
  isLikelyImageUrl,
  orderStatusChipClass,
  orderStatusLabel,
  parseAmountToUnits,
  profileDraftToPayload,
  resolveMediaUrl,
  signAndSubmitXdr,
  socialLinksRowsToText,
  socialLinksTextToRows,
  walletShort,
} from "@/components/marketplace-hub-shared";
import { Button } from "@/components/ui/button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import {
  buildAcceptSwapBidTx,
  buildApproveCommissionDeliveryTx,
  buildCancelListingTx,
  buildCancelSwapBidTx,
  buildCancelSwapListingTx,
  buildClaimCommissionTimeoutTx,
  buildCreateSwapListingTx,
  buildListCommissionEggTx,
  buildListForSaleTx,
  buildPlaceSwapBidTx,
  buildMarkCommissionDeliveredTx,
  buildRequestCommissionRevisionTx,
  buildRefundCommissionOrderTx,
} from "@/lib/marketplace";
import { buildBidUsdcTx, buildBidXlmTx, buildCreateItemAuctionTx } from "@/lib/auction";
import { buildUpdateTokenUriAsCreatorTx } from "@/lib/nft";
import type {
  ArtistProfile,
  ArtistProfileChallengeResponse,
  ArtistProfileVerifyResponse,
  MarketplaceFeedResponse,
  MarketplaceMyStudioResponse,
  MyStudioCommissionOrderItem,
} from "@/lib/marketplace-hub-types";
import { NETWORK_PASSPHRASE, STELLAR_NETWORK } from "@/lib/contracts";
import {
  AlertTriangle,
  ArrowUpRight,
  Gavel,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShoppingCart,
  UserRound,
} from "lucide-react";

export function MarketplaceHub() {
  const { isSpanish } = useLanguage();
  const { publicKey, isConnected, isConnecting, connect, signTransaction, signMessage } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);
  const [activeTopTab, setActiveTopTab] = useState<HubTopTab>("marketplace");
  const [activeStudioTab, setActiveStudioTab] = useState<StudioWorkspaceTab>("profile");

  const [feedAssetFilter, setFeedAssetFilter] = useState<FeedAssetFilter>("all");
  const [feedSaleFilter, setFeedSaleFilter] = useState<FeedSaleFilter>("all");
  const [feedSort, setFeedSort] = useState<FeedSort>("ending_soon");
  const [feedSearch, setFeedSearch] = useState("");
  const [feed, setFeed] = useState<MarketplaceFeedResponse | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [tokenPreviews, setTokenPreviews] = useState<Record<string, TokenPreview>>({});
  const tokenPreviewInflightRef = useRef<Set<string>>(new Set());

  const [studio, setStudio] = useState<MarketplaceMyStudioResponse | null>(null);
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioError, setStudioError] = useState("");

  const [profileSessionToken, setProfileSessionToken] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(buildProfileDraft(null));
  const [profileAuthLoading, setProfileAuthLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [listingPriceXlm, setListingPriceXlm] = useState("");
  const [listingPriceUsdc, setListingPriceUsdc] = useState("");
  const [listingCommissionEtaDays, setListingCommissionEtaDays] = useState("7");
  const [listingMode, setListingMode] = useState<"auto" | "nft" | "commission_egg">("auto");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const [swapOfferedTokenId, setSwapOfferedTokenId] = useState("");
  const [swapIntention, setSwapIntention] = useState("");
  const [swapBidTokenSelectionByListingId, setSwapBidTokenSelectionByListingId] = useState<Record<string, string>>({});
  const [auctionBidCurrency, setAuctionBidCurrency] = useState<"XLM" | "USDC">("XLM");
  const [auctionBidAmount, setAuctionBidAmount] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [txMessage, setTxMessage] = useState("");
  const [orderActionBusyId, setOrderActionBusyId] = useState<string | null>(null);
  const [swapActionBusyId, setSwapActionBusyId] = useState<string | null>(null);
  const [studioToolsOpen, setStudioToolsOpen] = useState(false);
  const [commissionDeliveryMetadataUriByOrderId, setCommissionDeliveryMetadataUriByOrderId] =
    useState<Record<string, string>>({});
  const [commissionRevisionIntentionByOrderId, setCommissionRevisionIntentionByOrderId] =
    useState<Record<string, string>>({});
  const [commissionRevisionReferenceByOrderId, setCommissionRevisionReferenceByOrderId] =
    useState<Record<string, string>>({});
  const [socialLinksDraftRows, setSocialLinksDraftRows] = useState<SocialLinkRow[]>([]);
  const socialLinkRows = socialLinksDraftRows;

  function applyProfileDraft(nextDraft: ProfileDraft) {
    setProfileDraft(nextDraft);
    setSocialLinksDraftRows(socialLinksTextToRows(nextDraft.socialLinksText));
  }

  function setSocialLinkRows(
    updater: SocialLinkRow[] | ((rows: SocialLinkRow[]) => SocialLinkRow[]),
  ) {
    setSocialLinksDraftRows((prev) => {
      const nextRows =
        typeof updater === "function"
          ? (updater as (rows: SocialLinkRow[]) => SocialLinkRow[])(prev)
          : updater;
      return nextRows.slice(0, 10);
    });
  }

  async function loadFeed() {
    setFeedLoading(true);
    setFeedError("");
    try {
      const params = new URLSearchParams();
      params.set("assetKind", feedAssetFilter);
      params.set("saleKind", feedSaleFilter);
      params.set("sort", feedSort);
      if (feedSearch.trim()) params.set("search", feedSearch.trim());
      const response = await fetch(`/api/marketplace/feed?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MarketplaceFeedResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load feed");
      }
      setFeed(payload);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Failed to load marketplace feed.");
    } finally {
      setFeedLoading(false);
    }
  }

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
      applyProfileDraft(buildProfileDraft(payload.profile));
      setAuctionDurationHours(
        payload.profile?.preferredAuctionDurationHours?.toString() || auctionDurationHours,
      );
    } catch (error) {
      setStudio(null);
      setStudioError(error instanceof Error ? error.message : "Failed to load studio data.");
    } finally {
      setStudioLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, [feedAssetFilter, feedSaleFilter, feedSort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFeed();
    }, 300);
    return () => clearTimeout(timer);
  }, [feedSearch]);

  useEffect(() => {
    if (!publicKey) {
      setStudio(null);
      setStudioError("");
      setProfileSessionToken(null);
      setProfileMessage("");
      applyProfileDraft(buildProfileDraft(null));
      return;
    }

    const session = window.localStorage.getItem(`${PROFILE_SESSION_PREFIX}${publicKey}`);
    setProfileSessionToken(session || null);
    void loadStudio(publicKey);
  }, [publicKey]);

  const selectedToken = studio?.ownedNfts.find((item) => String(item.tokenId) === selectedTokenId) || null;
  const canEditProfile = Boolean(publicKey && profileSessionToken);
  const liveAuctionItem =
    feed?.items.find((item) => item.saleKind === "auction" && item.status === "active") ||
    feed?.items.find((item) => item.saleKind === "auction") ||
    null;
  const marketplaceGridItems = feed?.items || [];
  const studioProfile = studio?.profile || null;
  const studioDisplayName =
    studioProfile?.displayName?.trim() ||
    (publicKey ? walletShort(publicKey) : t("My profile", "Mi perfil"));
  const studioAvatarUrl = resolveMediaUrl(studioProfile?.avatarUrl || "") || null;
  const studioBannerUrl = resolveMediaUrl(studioProfile?.bannerUrl || "") || null;
  const studioSocialLinks = Object.entries(studioProfile?.socialLinks || {}).filter(
    ([label, href]) => Boolean(String(label).trim()) && Boolean(String(href).trim()),
  );
  const studioPortfolioByTokenId = new Map<
    number,
    {
      tokenId: number;
      tokenUri: string | null;
      isCommissionEgg: boolean;
      listed: boolean;
      listingId: number | null;
    }
  >();
  for (const token of studio?.ownedNfts || []) {
    studioPortfolioByTokenId.set(token.tokenId, {
      tokenId: token.tokenId,
      tokenUri: token.tokenUri || null,
      isCommissionEgg: token.isCommissionEgg,
      listed: false,
      listingId: null,
    });
  }
  for (const listing of studio?.myListings || []) {
    const prev = studioPortfolioByTokenId.get(listing.tokenId);
    studioPortfolioByTokenId.set(listing.tokenId, {
      tokenId: listing.tokenId,
      tokenUri: listing.tokenUri || prev?.tokenUri || null,
      isCommissionEgg: listing.isCommissionEgg || Boolean(prev?.isCommissionEgg),
      listed: true,
      listingId: listing.listingId,
    });
  }
  const studioPortfolioItems = Array.from(studioPortfolioByTokenId.values()).sort(
    (a, b) => b.tokenId - a.tokenId,
  );
  const activeStudioTabLabel =
    activeStudioTab === "profile"
      ? t("Profile", "Perfil")
      : activeStudioTab === "sell"
        ? t("Sell", "Vender")
        : activeStudioTab === "swaps"
          ? t("Swaps", "Swaps")
          : t("Commissions", "Comisiones");
  const shouldForceStudioToolsOpen = !isConnected || !publicKey || Boolean(studioError);

  useEffect(() => {
    const tokenUris = Array.from(
      new Set<string>(
        [
          ...(feed?.items || []).map((item) => item.tokenUri),
          ...(studio?.ownedNfts || []).map((item) => item.tokenUri),
          ...(studio?.myListings || []).map((item) => item.tokenUri),
        ].filter((uri): uri is string => typeof uri === "string" && uri.length > 0),
      ),
    );
    if (tokenUris.length === 0) return;

    let cancelled = false;
    for (const tokenUri of tokenUris) {
      if (tokenPreviews[tokenUri] || tokenPreviewInflightRef.current.has(tokenUri)) continue;
      tokenPreviewInflightRef.current.add(tokenUri);
      void (async () => {
        let nextPreview: TokenPreview = { imageUrl: null, name: null };
        try {
          const resolvedTokenUri = resolveMediaUrl(tokenUri);
          if (resolvedTokenUri && isLikelyImageUrl(resolvedTokenUri)) {
            nextPreview = { imageUrl: resolvedTokenUri, name: null };
          } else if (resolvedTokenUri) {
            const response = await fetch(resolvedTokenUri, { cache: "force-cache" });
            if (response.ok) {
              const data = (await response.json()) as { image?: unknown; image_url?: unknown; name?: unknown };
              const imageRaw =
                typeof data.image === "string"
                  ? data.image
                  : typeof data.image_url === "string"
                    ? data.image_url
                    : null;
              nextPreview = {
                imageUrl: resolveMediaUrl(imageRaw),
                name: typeof data.name === "string" ? data.name : null,
              };
            }
          }
        } catch {
          nextPreview = { imageUrl: null, name: null };
        } finally {
          tokenPreviewInflightRef.current.delete(tokenUri);
          if (!cancelled) {
            setTokenPreviews((prev) =>
              prev[tokenUri] ? prev : { ...prev, [tokenUri]: nextPreview },
            );
          }
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [feed, studio, tokenPreviews]);

  useEffect(() => {
    if (!liveAuctionItem) return;
    const suggested =
      auctionBidCurrency === "XLM"
        ? formatTokenAmount(liveAuctionItem.priceXlm)
        : formatTokenAmount(liveAuctionItem.priceUsdc);
    if (!auctionBidAmount) {
      setAuctionBidAmount(suggested === "-" ? "" : suggested);
    }
  }, [auctionBidAmount, auctionBidCurrency, liveAuctionItem]);

  async function handleAuthenticateProfile() {
    if (!publicKey) {
      setProfileMessage(t("Connect your wallet first (header button).", "Conecta tu wallet primero (boton del header)."));
      return;
    }

    setProfileAuthLoading(true);
    setProfileMessage("");
    try {
      const challengeResponse = await fetch("/api/artist-profiles/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey }),
      });
      const challengePayload = (await challengeResponse.json()) as
        | (ArtistProfileChallengeResponse & { error?: string })
        | { error?: string };
      if (!challengeResponse.ok || !("challengeId" in challengePayload)) {
        throw new Error(challengePayload.error || "Could not create auth challenge.");
      }

      let signedMessage = "";
      let signerAddress = publicKey;
      let usedLocalDevFallback = false;

      try {
        const signature = await signMessage(challengePayload.message, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });
        signedMessage = signature.signedMessage;
        signerAddress = signature.signerAddress || publicKey;
      } catch (signError) {
        if (STELLAR_NETWORK !== "local") {
          throw signError;
        }
        // Local-only UX fallback: the local auth API is MVP-only and does not cryptographically verify signatures yet.
        signedMessage = `local-dev-auth:${challengePayload.challengeId}:${Date.now()}`;
        signerAddress = publicKey;
        usedLocalDevFallback = true;
      }

      const verifyResponse = await fetch("/api/artist-profiles/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey,
          challengeId: challengePayload.challengeId,
          signedMessage,
          signerAddress,
        }),
      });
      const verifyPayload = (await verifyResponse.json()) as
        | (ArtistProfileVerifyResponse & { error?: string })
        | { error?: string };
      if (!verifyResponse.ok || !("sessionToken" in verifyPayload)) {
        throw new Error(verifyPayload.error || "Could not verify wallet signature.");
      }

      window.localStorage.setItem(`${PROFILE_SESSION_PREFIX}${publicKey}`, verifyPayload.sessionToken);
      setProfileSessionToken(verifyPayload.sessionToken);
      setProfileMessage(
        usedLocalDevFallback
          ? t(
              "Artist profile ready (local dev mode).",
              "Perfil de artista listo (modo local).",
            )
          : t(
              "Artist profile session ready.",
              "Sesion de perfil de artista lista.",
            ),
      );
      await loadStudio(publicKey);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setProfileAuthLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!publicKey) return;
    if (!profileSessionToken) {
      setProfileMessage(t("Authenticate your artist profile first.", "Autentica tu perfil de artista primero."));
      return;
    }

    setProfileSaveLoading(true);
    setProfileMessage("");
    try {
      const response = await fetch(`/api/artist-profiles/${encodeURIComponent(publicKey)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-artist-session": profileSessionToken,
        },
        body: JSON.stringify({
          profile: profileDraftToPayload({
            ...profileDraft,
            socialLinksText: socialLinksRowsToText(socialLinksDraftRows),
          }),
        }),
      });
      const payload = (await response.json()) as { profile?: ArtistProfile; error?: string };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Failed to save profile.");
      }
      applyProfileDraft(buildProfileDraft(payload.profile));
      setProfileMessage(t("Artist profile saved.", "Perfil de artista guardado."));
      await loadStudio(publicKey);
      await loadFeed();
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setProfileSaveLoading(false);
    }
  }

  async function handleCreateListing() {
    if (!publicKey) {
      setTxMessage(t("Connect a wallet from the global header to list items.", "Conecta una wallet desde el header global para publicar."));
      return;
    }
    if (!selectedToken) {
      setTxMessage(t("Select one of your NFTs first.", "Selecciona uno de tus NFTs primero."));
      return;
    }

    setTxBusy(true);
    setTxMessage("");
    try {
      const priceXlm = parseAmountToUnits(listingPriceXlm);
      const priceUsdc = parseAmountToUnits(listingPriceUsdc);
      const zero = BigInt(0);
      if (priceXlm <= zero && priceUsdc <= zero) {
        throw new Error(t("Set an XLM or USDC price.", "Define un precio en XLM o USDC."));
      }

      const targetMode =
        listingMode === "auto"
          ? selectedToken.isCommissionEgg
            ? "commission_egg"
            : "nft"
          : listingMode;

      if (targetMode === "commission_egg" && !selectedToken.isCommissionEgg) {
        throw new Error(
          t(
            "This token is not a commission egg.",
            "Este token no es un huevo de comision.",
          ),
        );
      }

      if (
        targetMode === "commission_egg" &&
        !(studio?.profile?.artistEnabled && studio.profile.commissionEnabled)
      ) {
        throw new Error(
          t(
            "Enable artist profile + commissions before listing commission eggs.",
            "Activa perfil de artista + comisiones antes de publicar huevos de comision.",
          ),
        );
      }
      if (targetMode === "commission_egg" && studio && !studio.commissionEggLock.canListNewCommissionEgg) {
        throw new Error(
          studio.commissionEggLock.reason ||
            t(
              "You must complete or refund your current commission order before listing another commission egg.",
              "Debes completar o reembolsar tu orden de comision actual antes de listar otro huevo de comision.",
            ),
        );
      }

      const xlmUsdcRate = computeRate(priceXlm, priceUsdc);
      const commissionEtaDays =
        Math.max(
          1,
          Number.parseInt(
            (listingCommissionEtaDays || "").trim() ||
              profileDraft.turnaroundDaysMax ||
              profileDraft.turnaroundDaysMin ||
              "7",
            10,
          ) || 7,
        );
      const txXdr =
        targetMode === "commission_egg"
          ? await buildListCommissionEggTx(
              publicKey,
              selectedToken.tokenId,
              priceXlm,
              priceUsdc,
              xlmUsdcRate,
              commissionEtaDays,
            )
          : await buildListForSaleTx(publicKey, selectedToken.tokenId, priceXlm, priceUsdc, xlmUsdcRate);

      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(
        t("Listing submitted. Refreshing marketplace...", "Publicacion enviada. Actualizando marketplace..."),
      );
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to create listing.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleCreateItemAuction() {
    if (!publicKey) {
      setTxMessage(
        t(
          "Connect a wallet from the global header to create an auction.",
          "Conecta una wallet desde el header global para crear una subasta.",
        ),
      );
      return;
    }
    if (!selectedToken) {
      setTxMessage(t("Select one of your NFTs first.", "Selecciona uno de tus NFTs primero."));
      return;
    }
    if (selectedToken.isCommissionEgg) {
      setTxMessage(
        t(
          "Commission eggs should use fixed-price + escrow for now.",
          "Por ahora los huevos de comision deben usar precio fijo + escrow.",
        ),
      );
      return;
    }
    if ((studio?.myListings || []).some((listing) => listing.active && listing.tokenId === selectedToken.tokenId)) {
      setTxMessage(
        t(
          "Cancel the active fixed-price listing for this NFT before creating an item auction.",
          "Cancela la publicacion a precio fijo activa de este NFT antes de crear una subasta.",
        ),
      );
      return;
    }

    setTxBusy(true);
    setTxMessage("");
    try {
      const priceXlm = parseAmountToUnits(listingPriceXlm);
      const priceUsdc = parseAmountToUnits(listingPriceUsdc);
      const zero = BigInt(0);
      if (priceXlm <= zero && priceUsdc <= zero) {
        throw new Error(t("Set an XLM or USDC starting price.", "Define un precio inicial en XLM o USDC."));
      }

      const rate = computeRate(priceXlm, priceUsdc);
      const durationHours = Math.max(1, Number.parseInt(auctionDurationHours || "24", 10) || 24);
      const durationSeconds = durationHours * 3600;
      const txXdr = await buildCreateItemAuctionTx(
        publicKey,
        selectedToken.tokenId,
        priceXlm,
        priceUsdc,
        rate,
        durationSeconds,
      );

      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Item auction created.", "Subasta por item creada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to create item auction.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleCancelListing(listingId: number) {
    if (!publicKey) return;
    setTxBusy(true);
    setTxMessage("");
    try {
      const txXdr = await buildCancelListingTx(publicKey, listingId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Listing cancelled.", "Publicacion cancelada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to cancel listing.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleAuctionBid() {
    if (!publicKey) {
      setTxMessage(t("Connect your wallet from the header first.", "Conecta tu wallet desde el header primero."));
      return;
    }
    if (liveAuctionItem?.auction?.auctionId === null || liveAuctionItem?.auction?.auctionId === undefined) {
      setTxMessage(t("No live auction available right now.", "No hay subasta activa disponible ahora."));
      return;
    }

    setTxBusy(true);
    setTxMessage("");
    try {
      const amount = parseAmountToUnits(auctionBidAmount);
      if (amount <= BigInt(0)) {
        throw new Error(t("Enter a valid bid amount.", "Ingresa una oferta valida."));
      }
      const txXdr =
        auctionBidCurrency === "XLM"
          ? await buildBidXlmTx(publicKey, liveAuctionItem.auction.auctionId, amount)
          : await buildBidUsdcTx(publicKey, liveAuctionItem.auction.auctionId, amount);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Bid submitted.", "Oferta enviada."));
      await loadFeed();
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to place bid.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleCreateSwapOffer() {
    if (!publicKey) {
      setTxMessage(t("Connect your wallet from the header first.", "Conecta tu wallet desde el header primero."));
      return;
    }
    setTxBusy(true);
    setTxMessage("");
    try {
      const offeredTokenId = Number.parseInt(swapOfferedTokenId, 10);
      if (!Number.isFinite(offeredTokenId)) {
        throw new Error(t("Select the NFT you want to offer.", "Selecciona el NFT que quieres ofrecer."));
      }
      if (!swapIntention.trim()) {
        throw new Error(t("Add a short swap message.", "Agrega un mensaje corto para el intercambio."));
      }
      const txXdr = await buildCreateSwapListingTx(publicKey, offeredTokenId, swapIntention.trim());
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap listing published.", "Oferta de intercambio publicada."));
      setSwapOfferedTokenId("");
      setSwapIntention("");
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to create swap listing.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handlePlaceSwapBid(listingId: number, bidderTokenIdRaw: string) {
    if (!publicKey) {
      setTxMessage(t("Connect your wallet first.", "Conecta tu wallet primero."));
      return;
    }
    const bidderTokenId = Number.parseInt(bidderTokenIdRaw, 10);
    if (!Number.isFinite(bidderTokenId)) {
      setTxMessage(t("Choose one of your NFTs to offer.", "Elige uno de tus NFTs para ofertar."));
      return;
    }
    setSwapActionBusyId(`place-bid:${listingId}`);
    setTxMessage("");
    try {
      const txXdr = await buildPlaceSwapBidTx(publicKey, listingId, bidderTokenId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap bid submitted.", "Propuesta de intercambio enviada."));
      setSwapBidTokenSelectionByListingId((prev) => ({ ...prev, [String(listingId)]: "" }));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to place swap bid.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleAcceptSwapBid(listingId: number, bidId: number) {
    if (!publicKey) return;
    setSwapActionBusyId(`accept-bid:${bidId}`);
    setTxMessage("");
    try {
      const txXdr = await buildAcceptSwapBidTx(publicKey, listingId, bidId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap bid accepted.", "Propuesta de intercambio aceptada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to accept swap bid.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCancelSwapListing(listingId: number) {
    if (!publicKey) return;
    setSwapActionBusyId(`cancel-listing:${listingId}`);
    setTxMessage("");
    try {
      const txXdr = await buildCancelSwapListingTx(publicKey, listingId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap listing cancelled.", "Oferta de intercambio cancelada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to cancel swap listing.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCancelSwapBid(bidId: number) {
    if (!publicKey) return;
    setSwapActionBusyId(`cancel-bid:${bidId}`);
    setTxMessage("");
    try {
      const txXdr = await buildCancelSwapBidTx(publicKey, bidId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap bid cancelled.", "Propuesta de intercambio cancelada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to cancel swap bid.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCommissionOrderAction(
    order: MyStudioCommissionOrderItem,
    action: "deliver" | "approve" | "refund" | "claim_timeout",
  ) {
    if (!publicKey) return;
    if (action === "deliver") {
      const metadataUri = (commissionDeliveryMetadataUriByOrderId[String(order.orderId)] || "").trim();
      if (!metadataUri) {
        setTxMessage(
          t(
            "Add the final metadata URI before marking delivery.",
            "Agregá la URI final de metadata antes de marcar la entrega.",
          ),
        );
        return;
      }
    }
    setOrderActionBusyId(`${action}:${order.orderId}`);
    setTxMessage("");
    try {
      let txXdr: string;
      if (action === "deliver") {
        const metadataUri = (commissionDeliveryMetadataUriByOrderId[String(order.orderId)] || "").trim();
        const updateMetadataTx = await buildUpdateTokenUriAsCreatorTx(publicKey, order.tokenId, metadataUri);
        await signAndSubmitXdr(updateMetadataTx, signTransaction, publicKey);
        txXdr = await buildMarkCommissionDeliveredTx(publicKey, order.orderId);
      } else if (action === "approve") {
        txXdr = await buildApproveCommissionDeliveryTx(publicKey, order.orderId);
      } else if (action === "claim_timeout") {
        txXdr = await buildClaimCommissionTimeoutTx(publicKey, order.orderId);
      } else {
        txXdr = await buildRefundCommissionOrderTx(publicKey, order.orderId);
      }
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      if (action === "deliver") {
        setCommissionDeliveryMetadataUriByOrderId((prev) => ({ ...prev, [String(order.orderId)]: "" }));
      }
      setTxMessage(
        action === "deliver"
          ? t("Metadata updated and commission marked as delivered.", "Metadata actualizada y comisión marcada como entregada.")
          : action === "approve"
            ? t("Delivery approved and remaining escrow released.", "Entrega aprobada y escrow restante liberado.")
            : action === "claim_timeout"
              ? t("7-day timeout claimed. Remaining escrow released.", "Timeout de 7 días reclamado. Escrow restante liberado.")
              : t("Commission refunded (remaining escrow returned).", "Comisión reembolsada (se devolvió el escrow restante)."),
      );
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to update commission order.");
    } finally {
      setOrderActionBusyId(null);
    }
  }

  async function handleCommissionRevisionRequest(order: MyStudioCommissionOrderItem) {
    if (!publicKey) return;
    const intention = (commissionRevisionIntentionByOrderId[String(order.orderId)] || "").trim();
    const reference = (commissionRevisionReferenceByOrderId[String(order.orderId)] || "").trim();
    if (!intention) {
      setTxMessage(t("Add a change request first.", "Agregá una solicitud de cambio primero."));
      return;
    }

    setOrderActionBusyId(`revision:${order.orderId}`);
    setTxMessage("");
    try {
      const txXdr = await buildRequestCommissionRevisionTx(publicKey, order.orderId, intention, reference);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setCommissionRevisionIntentionByOrderId((prev) => ({ ...prev, [String(order.orderId)]: "" }));
      setCommissionRevisionReferenceByOrderId((prev) => ({ ...prev, [String(order.orderId)]: "" }));
      setTxMessage(t("Change request sent to the artist.", "Solicitud de cambio enviada al artista."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to request commission changes.");
    } finally {
      setOrderActionBusyId(null);
    }
  }

  async function handleReport(targetType: "artist_profile" | "listing", targetId: string) {
    const reason = window.prompt(
      t("Report reason (short):", "Motivo del reporte (corto):"),
      "",
    );
    if (!reason) return;
    const details =
      window.prompt(
        t("More details (optional):", "Mas detalles (opcional):"),
        "",
      ) || "";

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reporterWallet: publicKey || undefined,
          reason,
          details,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to create report.");
      setTxMessage(t("Report submitted.", "Reporte enviado."));
      if (publicKey) {
        await Promise.all([loadFeed(), loadStudio(publicKey)]);
      } else {
        await loadFeed();
      }
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to submit report.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-28 md:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-white/10 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTopTab("marketplace")}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
              activeTopTab === "marketplace"
                ? "border-emerald-300/30 bg-emerald-400/15 text-foreground"
                : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t("Marketplace", "Marketplace")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTopTab("studio")}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
              activeTopTab === "studio"
                ? "border-blue-300/30 bg-blue-400/15 text-foreground"
                : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" />
            {t("My Space", "Mi espacio")}
          </button>
        </div>
      </div>

      {activeTopTab === "marketplace" ? (
        <MarketplaceHubMarketplaceTab
          t={t}
          feedSearch={feedSearch}
          onFeedSearchChange={setFeedSearch}
          feedAssetFilter={feedAssetFilter}
          onFeedAssetFilterChange={setFeedAssetFilter}
          feedSaleFilter={feedSaleFilter}
          onFeedSaleFilterChange={setFeedSaleFilter}
          feedSort={feedSort}
          onFeedSortChange={setFeedSort}
          feedError={feedError}
          feedWarnings={feed?.warnings || []}
          feedLoading={feedLoading}
          marketplaceGridItems={marketplaceGridItems}
          liveAuctionItem={liveAuctionItem}
          tokenPreviews={tokenPreviews}
          auctionBidCurrency={auctionBidCurrency}
          onAuctionBidCurrencyChange={setAuctionBidCurrency}
          auctionBidAmount={auctionBidAmount}
          onAuctionBidAmountChange={setAuctionBidAmount}
          onAuctionBid={handleAuctionBid}
          txBusy={txBusy}
          publicKey={publicKey}
        />
      ) : null}

      {activeTopTab === "studio" ? (
        <section className="rounded-3xl border border-border bg-white/10 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <UserRound className="h-5 w-5 text-blue-300" />
              {t("My Space", "Mi espacio")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Your profile, links and NFTs. Open advanced tools only when you need marketplace operations.",
                "Tu perfil, redes y NFTs. Abre herramientas avanzadas solo cuando necesites operar en el marketplace.",
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border bg-white/5 text-foreground hover:bg-white/10"
            onClick={() => (publicKey ? void loadStudio(publicKey) : undefined)}
            disabled={!publicKey || studioLoading}
          >
            {studioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("Refresh", "Actualizar")}
          </Button>
        </div>

        {publicKey && studio ? (
          <div className="mb-4 space-y-4">
            <div className="overflow-hidden rounded-3xl border border-border bg-white/5">
              <div className="relative h-36 sm:h-44">
                {studioBannerUrl ? (
                  <img
                    src={studioBannerUrl}
                    alt={t("Profile banner", "Portada del perfil")}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.22),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/50" />
                <div className="absolute right-3 top-3 flex flex-wrap gap-2">
                  {studioProfile?.artistEnabled ? (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {t("Artist profile", "Perfil de artista")}
                    </span>
                  ) : null}
                  {studioProfile?.commissionEnabled ? (
                    <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/15 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {studioProfile.acceptingNewClients
                        ? t("Commissions open", "Comisiones abiertas")
                        : t("Commissions closed", "Comisiones cerradas")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative px-4 pb-4 pt-0 sm:px-5">
                <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex min-w-0 items-end gap-3">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur">
                      {studioAvatarUrl ? (
                        <img
                          src={studioAvatarUrl}
                          alt={studioDisplayName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <UserRound className="h-8 w-8 text-white/80" />
                      )}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="truncate text-lg font-semibold text-foreground">{studioDisplayName}</p>
                      <p className="truncate text-xs text-muted-foreground">{publicKey}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/marketplace/artist/${publicKey}`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-white/5 px-3 py-2 text-xs text-foreground hover:bg-white/10"
                    >
                      {t("Public profile", "Perfil público")}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/marketplace/commissions"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-white/5 px-3 py-2 text-xs text-foreground hover:bg-white/10"
                    >
                      {t("Commission manual", "Manual de comisiones")}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-border bg-white/5 text-foreground hover:bg-white/10"
                      onClick={() => void handleAuthenticateProfile()}
                      disabled={profileAuthLoading}
                    >
                      {profileAuthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {canEditProfile
                        ? t("Edit profile", "Editar perfil")
                        : t("Unlock profile", "Desbloquear perfil")}
                    </Button>
                  </div>
                </div>

                {studioProfile?.bio ? (
                  <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm text-muted-foreground line-clamp-3">
                    {studioProfile.bio}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t(
                      "Complete your artist profile to show your style, links and commission details.",
                      "Completa tu perfil de artista para mostrar tu estilo, enlaces y detalles de comisión.",
                    )}
                  </p>
                )}

                <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                    {t("NFTs", "NFTs")}: <span className="text-foreground">{studio?.ownedNfts.length || 0}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                    {t("Listings", "Publicaciones")}: <span className="text-foreground">{studio?.myListings.length || 0}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                    {t("Swaps", "Swaps")}:{" "}
                    <span className="text-foreground">
                      {(studio?.mySwapListings.length || 0) +
                        (studio?.incomingSwapBidsForMyListings.length || 0) +
                        (studio?.myOutgoingSwapBids.length || 0)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-white/5 px-3 py-2">
                    {t("Commissions", "Comisiones")}:{" "}
                    <span className="text-foreground">
                      {(studio?.myCommissionOrdersAsArtist.length || 0) +
                        (studio?.myCommissionOrdersAsBuyer.length || 0)}
                    </span>
                  </div>
                </div>

                {studioSocialLinks.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {studioSocialLinks.slice(0, 10).map(([label, href]) => (
                      <a
                        key={`studio-social-${label}-${href}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
                      >
                        <span className="truncate max-w-[120px]">{label}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("My NFTs", "Mis NFTs")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Click any NFT to open its page and manage sale, auction, swap or commission actions from there.",
                      "Haz click en cualquier NFT para abrir su página y gestionar venta, subasta, swap o comisiones desde allí.",
                    )}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
                  {studioPortfolioItems.length} {t("items", "items")}
                </span>
              </div>

              {studioPortfolioItems.length > 0 ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {studioPortfolioItems.map((token) => {
                    const preview = token.tokenUri ? tokenPreviews[token.tokenUri] : null;
                    const previewImageUrl = preview?.imageUrl || null;
                    const previewName = preview?.name || `#${token.tokenId}`;
                    return (
                      <Link
                        key={`studio-portfolio-token-${token.tokenId}`}
                        href={`/marketplace/shimeji/${token.tokenId}`}
                        className="group overflow-hidden rounded-2xl border border-border bg-white/5 transition hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-white/[0.04]">
                          {previewImageUrl ? (
                            <img
                              src={previewImageUrl}
                              alt={previewName}
                              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent text-muted-foreground">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                            <span className="rounded-full border border-border/80 bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                              {token.isCommissionEgg ? t("Commission Egg", "Huevo de comisión") : "NFT"}
                            </span>
                            {token.listed ? (
                              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] text-foreground">
                                {t("Listed", "Publicado")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-foreground">#{token.tokenId}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{previewName}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            {t("Open details and actions", "Abrir detalle y acciones")}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white/5 p-5 text-center text-sm text-muted-foreground">
                  {t("No NFTs found for this wallet yet.", "Todavía no se encontraron NFTs para esta wallet.")}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <details
          className="mb-4 rounded-2xl border border-border bg-white/5 p-3"
          open={shouldForceStudioToolsOpen || studioToolsOpen}
          onToggle={(event) => setStudioToolsOpen((event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-border bg-white/5 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("Advanced tools", "Herramientas avanzadas")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Profile editing, listings, swaps and commission operations.",
                  "Edición de perfil, publicaciones, swaps y operaciones de comisión.",
                )}
              </p>
            </div>
            <span className="rounded-full border border-border bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
              {activeStudioTabLabel}
            </span>
          </summary>
          <div className="mt-3">

        <div className="mb-4 rounded-2xl border border-border bg-white/5 p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveStudioTab("profile")}
              className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
                activeStudioTab === "profile"
                  ? "border-blue-300/30 bg-blue-400/15 text-foreground"
                  : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {t("Profile", "Perfil")}
            </button>
            <button
              type="button"
              onClick={() => setActiveStudioTab("sell")}
              className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
                activeStudioTab === "sell"
                  ? "border-emerald-300/30 bg-emerald-400/15 text-foreground"
                  : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {t("Sell", "Vender")}
            </button>
            <button
              type="button"
              onClick={() => setActiveStudioTab("swaps")}
              className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
                activeStudioTab === "swaps"
                  ? "border-sky-300/30 bg-sky-400/15 text-foreground"
                  : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {t("Swaps", "Swaps")}
            </button>
            <button
              type="button"
              onClick={() => setActiveStudioTab("commissions")}
              className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
                activeStudioTab === "commissions"
                  ? "border-amber-300/30 bg-amber-400/15 text-foreground"
                  : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {t("Commissions", "Comisiones")}
            </button>
          </div>
        </div>

        {!isConnected || !publicKey ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/5 p-6 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <p>
                {t(
                  "Connect a Stellar wallet to use My Space.",
                  "Conecta una wallet Stellar para usar Mi espacio.",
                )}
              </p>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={() => void connect()}
                disabled={isConnecting}
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("Connect wallet", "Conectar wallet")}
              </Button>
            </div>
          </div>
        ) : null}

        {studioError ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-foreground">
            {studioError}
          </div>
        ) : null}

        {publicKey &&
        (activeStudioTab === "profile" || activeStudioTab === "sell" || activeStudioTab === "swaps") ? (
          <div className="mt-4 grid gap-4">
            {activeStudioTab === "profile" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("Wallet profile", "Perfil de wallet")}
                    </h3>
                    <p className="text-xs text-muted-foreground">{publicKey}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-500 text-foreground hover:bg-blue-400"
                    onClick={() => void handleAuthenticateProfile()}
                    disabled={profileAuthLoading}
                  >
                    {profileAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {canEditProfile
                      ? t("Re-auth artist profile", "Re-autenticar perfil")
                      : t("Authenticate artist profile", "Autenticar perfil de artista")}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "Required to edit wallet-based artist profile and commission settings.",
                    "Requerido para editar el perfil de artista por wallet y la configuracion de comisiones.",
                  )}
                </p>
                {STELLAR_NETWORK === "local" ? (
                  <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-400/10 p-2 text-xs text-foreground">
                    {t(
                      "Local dev mode: if your wallet does not support message signing, a local-only fallback is used.",
                      "Modo local: si tu wallet no soporta firmar mensajes, se usa un fallback solo para desarrollo local.",
                    )}
                  </div>
                ) : null}
                {profileMessage ? (
                  <div className="mt-3 rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                    {profileMessage}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Artist profile", "Perfil de artista")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Artists can enable commissions and list commission eggs. Per-item auctions are still in development.",
                    "Los artistas pueden activar comisiones y listar huevos de comision. Las subastas por item siguen en desarrollo.",
                  )}
                </p>
                <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{t("Quick setup", "Configuracion rapida")}</p>
                  <p className="mt-1">
                    {t(
                      "1) Authenticate profile. 2) Enable artist profile. 3) Fill basic info and save. Advanced fields are optional.",
                      "1) Autentica el perfil. 2) Activa perfil de artista. 3) Completa datos basicos y guarda. Los campos avanzados son opcionales.",
                    )}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <ToggleField
                    label={t("Artist profile enabled", "Perfil de artista habilitado")}
                    description={t(
                      "Makes this wallet act as an artist profile in the marketplace.",
                      "Hace que esta wallet funcione como perfil de artista en el marketplace.",
                    )}
                    checked={profileDraft.artistEnabled}
                    onChange={(checked) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        artistEnabled: checked,
                        commissionEnabled: checked ? prev.commissionEnabled : false,
                      }))
                    }
                    disabled={!canEditProfile}
                  />
                  <ToggleField
                    label={t("Commissions enabled", "Comisiones habilitadas")}
                    description={t(
                      "Allows commission egg sales and shows availability in public listings.",
                      "Permite ventas de huevos de comision y muestra disponibilidad en listings publicos.",
                    )}
                    checked={profileDraft.commissionEnabled}
                    onChange={(checked) =>
                      setProfileDraft((prev) => ({ ...prev, commissionEnabled: checked }))
                    }
                    disabled={!canEditProfile || !profileDraft.artistEnabled}
                  />
                  <ToggleField
                    label={t("Accepting new clients", "Aceptando nuevos clientes")}
                    description={t(
                      "Display whether you are available for new commission requests.",
                      "Muestra si estas disponible para nuevas comisiones.",
                    )}
                    checked={profileDraft.acceptingNewClients}
                    onChange={(checked) =>
                      setProfileDraft((prev) => ({ ...prev, acceptingNewClients: checked }))
                    }
                    disabled={!canEditProfile}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InputField
                    label={t("Display name", "Nombre visible")}
                    value={profileDraft.displayName}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, displayName: value }))}
                    placeholder={t("Example: Lulox Studio", "Ejemplo: Lulox Studio")}
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Avatar URL", "URL avatar")}
                    type="url"
                    value={profileDraft.avatarUrl}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, avatarUrl: value }))}
                    placeholder="https://..."
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Languages (comma-separated)", "Idiomas (separados por coma)")}
                    value={profileDraft.languagesText}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, languagesText: value }))}
                    placeholder={t("es, en", "es, en")}
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Style tags (comma-separated)", "Etiquetas de estilo (separadas por coma)")}
                    value={profileDraft.styleTagsText}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, styleTagsText: value }))}
                    placeholder={t("cute, pixel, anime", "cute, pixel, anime")}
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Price XLM", "Precio XLM")}
                    value={profileDraft.basePriceXlm}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, basePriceXlm: value }))}
                    placeholder="100"
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Price USDC", "Precio USDC")}
                    value={profileDraft.basePriceUsdc}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, basePriceUsdc: value }))}
                    placeholder="15"
                    disabled={!canEditProfile}
                  />
                </div>

                <div className="mt-3">
                  <InputField
                    label={t("Bio", "Bio")}
                    value={profileDraft.bio}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, bio: value }))}
                    textarea
                    rows={4}
                    placeholder={t(
                      "What do you draw? style, turnaround and what clients can expect.",
                      "Que dibujas? estilo, tiempos y que puede esperar el cliente.",
                    )}
                    disabled={!canEditProfile}
                  />
                </div>

                <div className="mt-3 rounded-xl border border-border bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("Social links", "Redes sociales")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("Add one or more profiles (X, Instagram, TikTok, website, etc.).", "Agrega uno o mas perfiles (X, Instagram, TikTok, web, etc.).")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border bg-white/5 text-foreground hover:bg-white/10"
                      onClick={() =>
                        setSocialLinkRows((rows) => [...rows, { key: "", url: "" }].slice(0, 10))
                      }
                      disabled={!canEditProfile || socialLinkRows.length >= 10}
                    >
                      {t("Add link", "Agregar red")}
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {["x", "instagram", "tiktok", "youtube", "discord", "website"].map((network) => (
                        <button
                          key={`social-preset-${network}`}
                          type="button"
                          className="cursor-pointer rounded-full border border-border bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 disabled:opacity-50"
                          onClick={() =>
                            setSocialLinkRows((rows) =>
                              rows.length >= 10 ? rows : [...rows, { key: network, url: "" }],
                            )
                          }
                          disabled={!canEditProfile || socialLinkRows.length >= 10}
                        >
                          + {network}
                        </button>
                      ))}
                    </div>
                    <datalist id="marketplace-social-network-options">
                      <option value="x" />
                      <option value="instagram" />
                      <option value="tiktok" />
                      <option value="youtube" />
                      <option value="twitch" />
                      <option value="discord" />
                      <option value="telegram" />
                      <option value="website" />
                      <option value="portfolio" />
                    </datalist>
                    {socialLinkRows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("No social links yet.", "Todavia no hay redes cargadas.")}
                      </p>
                    ) : null}
                    {socialLinkRows.map((row, index) => (
                      <div key={`${index}-${row.key}-${row.url}`} className="grid gap-2 sm:grid-cols-[0.75fr_1.25fr_auto]">
                        <input
                          type="text"
                          value={row.key}
                          placeholder={t("Network (x, instagram...)", "Red (x, instagram...)")}
                          list="marketplace-social-network-options"
                          className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                          onChange={(event) =>
                            setSocialLinkRows((rows) =>
                              rows.map((item, i) =>
                                i === index ? { ...item, key: event.target.value } : item,
                              ),
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <input
                          type="url"
                          value={row.url}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                          onChange={(event) =>
                            setSocialLinkRows((rows) =>
                              rows.map((item, i) =>
                                i === index ? { ...item, url: event.target.value } : item,
                              ),
                            )
                          }
                          disabled={!canEditProfile}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-border bg-white/5 text-foreground hover:bg-white/10"
                          onClick={() => setSocialLinkRows((rows) => rows.filter((_, i) => i !== index))}
                          disabled={!canEditProfile}
                        >
                          {t("Remove", "Quitar")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="mt-3 rounded-xl border border-border bg-white/5 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    {t("Advanced profile settings", "Configuracion avanzada del perfil")}
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("Optional fields for banner, delivery times, slots and preferences.", "Campos opcionales para banner, tiempos de entrega, cupos y preferencias.")}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <InputField
                      label={t("Banner URL", "URL banner")}
                      type="url"
                      value={profileDraft.bannerUrl}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, bannerUrl: value }))}
                      disabled={!canEditProfile}
                    />
                    <InputField
                      label={t("Preferred auction duration (hours)", "Duracion de subasta preferida (horas)")}
                      type="number"
                      value={profileDraft.preferredAuctionDurationHours}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, preferredAuctionDurationHours: value }))}
                      disabled={!canEditProfile}
                    />
                    <InputField
                      label={t("Turnaround min (days)", "Entrega minima (dias)")}
                      type="number"
                      value={profileDraft.turnaroundDaysMin}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, turnaroundDaysMin: value }))}
                      disabled={!canEditProfile}
                    />
                    <InputField
                      label={t("Turnaround max (days)", "Entrega maxima (dias)")}
                      type="number"
                      value={profileDraft.turnaroundDaysMax}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, turnaroundDaysMax: value }))}
                      disabled={!canEditProfile}
                    />
                    <InputField
                      label={t("Slots total", "Slots totales")}
                      type="number"
                      value={profileDraft.slotsTotal}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, slotsTotal: value }))}
                      disabled={!canEditProfile}
                    />
                    <InputField
                      label={t("Slots open", "Slots disponibles")}
                      type="number"
                      value={profileDraft.slotsOpen}
                      onChange={(value) => setProfileDraft((prev) => ({ ...prev, slotsOpen: value }))}
                      disabled={!canEditProfile}
                    />
                  </div>
                </details>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={!canEditProfile || profileSaveLoading}
                    className="bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    {profileSaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("Save artist profile", "Guardar perfil de artista")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border bg-white/5 text-foreground hover:bg-white/10"
                    onClick={() => applyProfileDraft(buildProfileDraft(studio?.profile || null))}
                    disabled={!canEditProfile}
                  >
                    {t("Reset draft", "Resetear draft")}
                  </Button>
                </div>
              </div>
            </div>
            ) : null}

            {(activeStudioTab === "sell" || activeStudioTab === "swaps") ? (
            <div className="space-y-4">
              {activeStudioTab === "sell" ? (
              <div className="rounded-2xl border border-border bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Create listing", "Crear publicacion")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "List your NFT or commission egg for fixed price. Per-item auctions are still in development.",
                    "Lista tu NFT o huevo de comision a precio fijo. Las subastas por item siguen en desarrollo.",
                  )}
                </p>

                <div className="mt-4 space-y-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>{t("Select owned token", "Seleccionar token propio")}</span>
                    <select
                      className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                      value={selectedTokenId}
                      onChange={(event) => setSelectedTokenId(event.target.value)}
                    >
                      <option value="">{t("Choose a token...", "Elegi un token...")}</option>
                      {(studio?.ownedNfts || []).map((token) => (
                        <option key={token.tokenId} value={String(token.tokenId)}>
                          #{token.tokenId} - {token.isCommissionEgg ? t("Commission Egg", "Huevo de Comision") : "NFT"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField
                      label={t("Price XLM", "Precio XLM")}
                      value={listingPriceXlm}
                      onChange={setListingPriceXlm}
                      placeholder="0"
                    />
                    <InputField
                      label={t("Price USDC", "Precio USDC")}
                      value={listingPriceUsdc}
                      onChange={setListingPriceUsdc}
                      placeholder="0"
                    />
                  </div>

                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>{t("Listing mode", "Modo de publicacion")}</span>
                    <select
                      className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                      value={listingMode}
                      onChange={(event) => setListingMode(event.target.value as typeof listingMode)}
                    >
                      <option value="auto">{t("Auto (based on token kind)", "Auto (segun tipo de token)")}</option>
                      <option value="nft">NFT</option>
                      <option value="commission_egg">{t("Commission Egg", "Huevo de Comision")}</option>
                    </select>
                  </label>

                  {((listingMode === "commission_egg") ||
                    (listingMode === "auto" && Boolean(selectedToken?.isCommissionEgg))) ? (
                    <InputField
                      label={t("Commission delivery time (days)", "Tiempo de entrega de comisión (días)")}
                      type="number"
                      value={listingCommissionEtaDays}
                      onChange={setListingCommissionEtaDays}
                      placeholder={profileDraft.turnaroundDaysMax || profileDraft.turnaroundDaysMin || "7"}
                    />
                  ) : null}

                  {studio?.commissionEggLock && !studio.commissionEggLock.canListNewCommissionEgg ? (
                    <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-foreground">
                      <p className="font-medium">
                        {t(
                          "Commission egg listing locked (1 active job at a time)",
                          "Publicacion de huevo de comision bloqueada (1 trabajo activo a la vez)",
                        )}
                      </p>
                      <p className="mt-1 text-muted-foreground">{studio.commissionEggLock.reason}</p>
                      <p className="mt-2 text-muted-foreground">
                        {t(
                          "Unlock by delivering and getting buyer approval, or refunding from escrow.",
                          "Se desbloquea al entregar y recibir aprobacion del comprador, o al reembolsar desde escrow.",
                        )}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("Per-item auction", "Subasta por item")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "Create an on-chain auction for a selected NFT you own. Commission eggs should keep using fixed-price + escrow.",
                            "Crea una subasta on-chain para un NFT propio seleccionado. Los huevos de comision siguen con precio fijo + escrow.",
                          )}
                        </p>
                      </div>
                      <Gavel className="h-5 w-5 text-amber-300" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[6, 12, 24, 72, 168, 336].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${auctionDurationHours === String(hours) ? "border-amber-300/40 bg-amber-400/10 text-foreground" : "border-border bg-white/5 text-muted-foreground"}`}
                          onClick={() => {
                            setAuctionDurationHours(String(hours));
                            setProfileDraft((prev) => ({ ...prev, preferredAuctionDurationHours: String(hours) }));
                          }}
                        >
                          {hours >= 24 ? `${hours / 24}d` : `${hours}h`}
                        </button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full border-border bg-white/5 text-foreground hover:bg-white/10"
                      onClick={() => void handleCreateItemAuction()}
                      disabled={
                        txBusy ||
                        !selectedToken ||
                        Boolean(selectedToken?.isCommissionEgg) ||
                        !studio?.auctionCapability.itemAuctionsAvailable
                      }
                      title={
                        selectedToken?.isCommissionEgg
                          ? t(
                              "Commission eggs should use fixed-price + escrow for now.",
                              "Por ahora los huevos de comision usan precio fijo + escrow.",
                            )
                          : studio?.auctionCapability.reason || ""
                      }
                    >
                      {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                      {t("Create item auction", "Crear subasta por item")}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleCreateListing()}
                    disabled={
                      txBusy ||
                      !selectedToken ||
                      (((listingMode === "commission_egg") ||
                        (listingMode === "auto" && Boolean(selectedToken?.isCommissionEgg))) &&
                        Boolean(studio?.commissionEggLock && !studio.commissionEggLock.canListNewCommissionEgg))
                    }
                    className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("Create fixed-price listing", "Crear publicacion a precio fijo")}
                  </Button>
                </div>
              </div>
              ) : null}

              {activeStudioTab === "swaps" ? (
              <div className="rounded-2xl border border-border bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("Swap Studio", "Swap Studio")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Publish an open swap listing (NFT + intention). Other people can offer their NFTs, and you choose which one to accept.",
                    "Publica un intercambio abierto (NFT + intencion). Otras personas pueden ofertar sus NFTs y tu eliges cual aceptar.",
                  )}
                </p>

                <div className="mt-4 space-y-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>{t("Offer this NFT", "Ofrecer este NFT")}</span>
                    <select
                      className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                      value={swapOfferedTokenId}
                      onChange={(event) => setSwapOfferedTokenId(event.target.value)}
                    >
                      <option value="">{t("Choose...", "Elegi...")}</option>
                      {(studio?.ownedNfts || []).map((token) => (
                        <option key={`offered-${token.tokenId}`} value={String(token.tokenId)}>
                          #{token.tokenId} · {token.isCommissionEgg ? t("Commission Egg", "Huevo de Comision") : "NFT"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <InputField
                    label={t("Swap intention", "Intencion del intercambio")}
                    value={swapIntention}
                    onChange={setSwapIntention}
                    placeholder={t("Example: Looking for a cute dragon / neon style", "Ejemplo: Busco un dragon tierno / estilo neon")}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleCreateSwapOffer()}
                    disabled={txBusy || !swapOfferedTokenId || !swapIntention.trim()}
                    className="w-full bg-blue-500 text-foreground hover:bg-blue-400"
                  >
                    {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("Publish swap listing", "Publicar intercambio")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs font-medium text-foreground">{t("Bids on my swap listings", "Propuestas en mis intercambios")}</p>
                    <div className="mt-2 space-y-2">
                      {(studio?.incomingSwapBidsForMyListings || []).map((bid) => (
                        <div key={`incoming-swap-bid-${bid.bidId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">#{bid.bidId}</span>
                            <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-foreground">
                              {t("Bid", "Propuesta")}
                            </span>
                          </div>
                          <p>{t("Listing", "Intercambio")}: #{bid.listingId}</p>
                          <p>{t("They offer", "Ofrecen")}: #{bid.bidderTokenId}</p>
                          <p>{t("Your NFT in listing", "Tu NFT publicado")}: #{bid.listingOfferedTokenId}</p>
                          <p className="break-all">{t("Bidder", "Postor")}: {walletShort(bid.bidder)}</p>
                          {bid.listingIntention ? <p className="line-clamp-2">{bid.listingIntention}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-500 text-black hover:bg-emerald-400"
                              onClick={() => void handleAcceptSwapBid(bid.listingId, bid.bidId)}
                              disabled={swapActionBusyId === `accept-bid:${bid.bidId}`}
                            >
                              {swapActionBusyId === `accept-bid:${bid.bidId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Accept", "Aceptar")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(studio?.incomingSwapBidsForMyListings.length || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground/80">{t("No bids for your swap listings yet.", "Aun no hay propuestas para tus intercambios.")}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs font-medium text-foreground">{t("My swap listings", "Mis intercambios publicados")}</p>
                    <div className="mt-2 space-y-2">
                      {(studio?.mySwapListings || []).map((swapListing) => (
                        <div key={`swap-listing-${swapListing.swapListingId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">#{swapListing.swapListingId}</span>
                            <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-2 py-0.5 text-foreground">
                              {t("Open", "Abierto")}
                            </span>
                          </div>
                          <p>{t("Offering", "Ofreciendo")}: #{swapListing.offeredTokenId}</p>
                          <p>{t("Bids", "Propuestas")}: {swapListing.bidCount}</p>
                          {swapListing.intention ? <p className="line-clamp-2">{swapListing.intention}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                              onClick={() => void handleCancelSwapListing(swapListing.swapListingId)}
                              disabled={swapActionBusyId === `cancel-listing:${swapListing.swapListingId}`}
                            >
                              {swapActionBusyId === `cancel-listing:${swapListing.swapListingId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Cancel listing", "Cancelar intercambio")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(studio?.mySwapListings.length || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground/80">{t("You have no active swap listings.", "No tienes intercambios abiertos activos.")}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs font-medium text-foreground">{t("My outgoing swap bids", "Mis propuestas enviadas")}</p>
                    <div className="mt-2 space-y-2">
                      {(studio?.myOutgoingSwapBids || []).map((bid) => (
                        <div key={`outgoing-swap-bid-${bid.bidId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">#{bid.bidId}</span>
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-foreground">
                              {t("Outgoing bid", "Propuesta enviada")}
                            </span>
                          </div>
                          <p>{t("To listing", "Al intercambio")}: #{bid.listingId}</p>
                          <p>{t("I offer", "Ofrezco")}: #{bid.bidderTokenId}</p>
                          <p>{t("They offer", "Ofrecen")}: #{bid.listingOfferedTokenId}</p>
                          {bid.listingCreator ? (
                            <p className="break-all">{t("Creator", "Creador")}: {walletShort(bid.listingCreator)}</p>
                          ) : null}
                          {bid.listingIntention ? <p className="line-clamp-2">{bid.listingIntention}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                              onClick={() => void handleCancelSwapBid(bid.bidId)}
                              disabled={swapActionBusyId === `cancel-bid:${bid.bidId}`}
                            >
                              {swapActionBusyId === `cancel-bid:${bid.bidId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Cancel bid", "Cancelar propuesta")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(studio?.myOutgoingSwapBids.length || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground/80">{t("You have no active swap bids.", "No tienes propuestas de intercambio activas.")}</p>
                      ) : null}
                    </div>
                  </div>

                </div>
              </div>
              ) : null}
            </div>
            ) : null}
          </div>
        ) : null}

        {publicKey && studio && (activeStudioTab === "sell" || activeStudioTab === "commissions") ? (
          <div className="mt-6 grid gap-4">
            {activeStudioTab === "sell" ? (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">{t("My active listings", "Mis publicaciones activas")}</h3>
              <div className="mt-3 space-y-2">
                {studio.myListings.map((listing) => (
                  <div key={listing.listingId} className="rounded-xl border border-border bg-white/5 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">#{listing.tokenId} · {listing.isCommissionEgg ? t("Commission Egg", "Huevo de Comision") : "NFT"}</p>
                        <p className="text-muted-foreground">
                          {formatTokenAmount(listing.priceXlm)} XLM / {formatTokenAmount(listing.priceUsdc)} USDC
                        </p>
                        {listing.isCommissionEgg && listing.commissionEtaDays > 0 ? (
                          <p className="text-muted-foreground">
                            {t("ETA", "ETA")}: {listing.commissionEtaDays} {t("days", "días")}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                        onClick={() => void handleCancelListing(listing.listingId)}
                        disabled={txBusy}
                      >
                        {t("Cancel", "Cancelar")}
                      </Button>
                    </div>
                    {listing.tokenUri ? <p className="mt-2 break-all text-muted-foreground/80 line-clamp-2">{listing.tokenUri}</p> : null}
                  </div>
                ))}
                {studio.myListings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
                    {t("No active listings yet.", "Todavia no tienes publicaciones activas.")}
                  </div>
                ) : null}
              </div>
            </div>
            ) : null}

            {activeStudioTab === "commissions" ? (
            <div className="rounded-2xl border border-border bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">{t("Commission workflow", "Flujo de comisiones")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "50% upfront, 50% on approval (or seller claim after 7 days), up to 3 change requests.",
                  "50% al inicio, 50% con aprobación (o reclamo del artista a los 7 días), hasta 3 solicitudes de cambio.",
                )}{" "}
                <Link href="/marketplace/commissions" className="cursor-pointer underline hover:text-foreground">
                  {t("Manual", "Manual")}
                </Link>
              </p>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">{t("As artist (commission eggs sold)", "Como artista (huevos vendidos)")}</p>
                  <div className="mt-2 space-y-2">
                    {studio.myCommissionOrdersAsArtist.map((order) => {
                      const autoReleaseAt = commissionAutoReleaseAt(order.deliveredAt);
                      const canClaimTimeout =
                        order.status === "Delivered" &&
                        autoReleaseAt > 0 &&
                        Math.floor(Date.now() / 1000) >= autoReleaseAt;
                      return (
                      <div key={`artist-${order.orderId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground">#{order.orderId} · token #{order.tokenId}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${orderStatusChipClass(order.status)}`}>
                            {orderStatusLabel(order.status, t)}
                          </span>
                        </div>
                        <p>{t("Buyer", "Comprador")}: {walletShort(order.buyer)}</p>
                        <p>{t("Total", "Total")}: {formatTokenAmount(order.amountPaid)} {order.currency.toUpperCase()}</p>
                        <p>{t("Paid now (50%)", "Cobrado ahora (50%)")}: {formatTokenAmount(order.upfrontPaidToSeller)} {order.currency.toUpperCase()}</p>
                        <p>{t("Remaining in escrow", "Restante en escrow")}: {formatTokenAmount(order.escrowRemaining)} {order.currency.toUpperCase()}</p>
                        {order.commissionEtaDays > 0 ? (
                          <p>{t("ETA", "ETA")}: {order.commissionEtaDays} {t("days", "días")}</p>
                        ) : null}
                        {order.intention ? <p className="line-clamp-2">{t("Brief", "Brief")}: {order.intention}</p> : null}
                        {order.latestRevisionIntention ? (
                          <div className="mt-1 rounded-md border border-border bg-white/5 p-2">
                            <p className="text-foreground">
                              {t("Latest change request", "Último pedido de cambio")} ({order.revisionRequestCount}/{order.maxRevisionRequests})
                            </p>
                            <p className="mt-1 line-clamp-3">{order.latestRevisionIntention}</p>
                            {order.latestRevisionRefUrl ? (
                              <p className="mt-1 line-clamp-1">Ref: {order.latestRevisionRefUrl}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p>{t("Change requests used", "Cambios usados")}: {order.revisionRequestCount}/{order.maxRevisionRequests}</p>
                        )}
                        {order.status === "Accepted" ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input
                              type="url"
                              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground"
                              placeholder={t("Final metadata URI (ipfs://...)", "URI final de metadata (ipfs://...)")}
                              value={commissionDeliveryMetadataUriByOrderId[String(order.orderId)] || ""}
                              onChange={(event) =>
                                setCommissionDeliveryMetadataUriByOrderId((prev) => ({
                                  ...prev,
                                  [String(order.orderId)]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="bg-blue-500 text-foreground hover:bg-blue-400"
                              onClick={() => void handleCommissionOrderAction(order, "deliver")}
                              disabled={orderActionBusyId === `deliver:${order.orderId}`}
                            >
                              {orderActionBusyId === `deliver:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Deliver", "Entregar")}
                            </Button>
                          </div>
                        ) : null}
                        {order.status === "Delivered" ? (
                          <p className="mt-2">
                            {t("Buyer auto-approval deadline", "Límite para auto-liberación")}:{" "}
                            <span className="text-foreground">{formatTimestamp(autoReleaseAt)}</span>
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {canClaimTimeout ? (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-500 text-black hover:bg-emerald-400"
                              onClick={() => void handleCommissionOrderAction(order, "claim_timeout")}
                              disabled={orderActionBusyId === `claim_timeout:${order.orderId}`}
                            >
                              {orderActionBusyId === `claim_timeout:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Claim remaining 50%", "Reclamar 50% restante")}
                            </Button>
                          ) : null}
                          {commissionOrderIsOpen(order.status) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                              onClick={() => void handleCommissionOrderAction(order, "refund")}
                              disabled={orderActionBusyId === `refund:${order.orderId}`}
                            >
                              {orderActionBusyId === `refund:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Cancel + refund escrow", "Cancelar + devolver escrow")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )})}
                    {studio.myCommissionOrdersAsArtist.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80">{t("No commission egg orders as artist yet.", "Todavia no hay ordenes de huevo de comision como artista.")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">{t("As buyer", "Como comprador")}</p>
                  <div className="mt-2 space-y-2">
                    {studio.myCommissionOrdersAsBuyer.map((order) => {
                      const autoReleaseAt = commissionAutoReleaseAt(order.deliveredAt);
                      const canRequestRevision =
                        order.status === "Delivered" &&
                        order.revisionRequestCount < order.maxRevisionRequests;
                      return (
                      <div key={`buyer-${order.orderId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground">#{order.orderId} · token #{order.tokenId}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${orderStatusChipClass(order.status)}`}>
                            {orderStatusLabel(order.status, t)}
                          </span>
                        </div>
                        <p>{t("Artist", "Artista")}: {walletShort(order.seller)}</p>
                        <p>{t("Total", "Total")}: {formatTokenAmount(order.amountPaid)} {order.currency.toUpperCase()}</p>
                        <p>{t("Artist received (50%)", "Artista recibió (50%)")}: {formatTokenAmount(order.upfrontPaidToSeller)} {order.currency.toUpperCase()}</p>
                        <p>{t("Your protected escrow", "Tu escrow protegido")}: {formatTokenAmount(order.escrowRemaining)} {order.currency.toUpperCase()}</p>
                        {order.commissionEtaDays > 0 ? (
                          <p>{t("ETA", "ETA")}: {order.commissionEtaDays} {t("days", "días")}</p>
                        ) : null}
                        <p>{t("Changes used", "Cambios usados")}: {order.revisionRequestCount}/{order.maxRevisionRequests}</p>
                        {order.referenceImageUrl ? <p className="line-clamp-1">Ref: {order.referenceImageUrl}</p> : null}
                        {order.status === "Delivered" && autoReleaseAt > 0 ? (
                          <p>
                            {t("Auto release deadline", "Límite de auto-liberación")}:{" "}
                            <span className="text-foreground">{formatTimestamp(autoReleaseAt)}</span>
                          </p>
                        ) : null}
                        {canRequestRevision ? (
                          <div className="mt-2 rounded-md border border-border bg-white/5 p-2">
                            <p className="text-foreground">{t("Request a change", "Pedir un cambio")}</p>
                            <textarea
                              className="mt-2 min-h-16 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground"
                              placeholder={t("What should be changed?", "¿Qué debería cambiarse?")}
                              value={commissionRevisionIntentionByOrderId[String(order.orderId)] || ""}
                              onChange={(event) =>
                                setCommissionRevisionIntentionByOrderId((prev) => ({
                                  ...prev,
                                  [String(order.orderId)]: event.target.value,
                                }))
                              }
                            />
                            <input
                              type="url"
                              className="mt-2 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground"
                              placeholder={t("Reference image URL (optional)", "URL de imagen de referencia (opcional)")}
                              value={commissionRevisionReferenceByOrderId[String(order.orderId)] || ""}
                              onChange={(event) =>
                                setCommissionRevisionReferenceByOrderId((prev) => ({
                                  ...prev,
                                  [String(order.orderId)]: event.target.value,
                                }))
                              }
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-border bg-white/5 text-foreground hover:bg-white/10"
                                onClick={() => void handleCommissionRevisionRequest(order)}
                                disabled={orderActionBusyId === `revision:${order.orderId}`}
                              >
                                {orderActionBusyId === `revision:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {t("Send change request", "Enviar pedido de cambio")}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.status === "Delivered" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-500 text-black hover:bg-emerald-400"
                              onClick={() => void handleCommissionOrderAction(order, "approve")}
                              disabled={orderActionBusyId === `approve:${order.orderId}`}
                            >
                              {orderActionBusyId === `approve:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Approve delivery", "Aprobar entrega")}
                            </Button>
                          ) : null}
                          {commissionOrderIsOpen(order.status) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                              onClick={() => void handleCommissionOrderAction(order, "refund")}
                              disabled={orderActionBusyId === `refund:${order.orderId}`}
                            >
                              {orderActionBusyId === `refund:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Refund remaining escrow", "Reembolsar escrow restante")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )})}
                    {studio.myCommissionOrdersAsBuyer.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80">{t("No commission egg purchases yet.", "Todavia no compraste huevos de comision.")}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            ) : null}
          </div>
        ) : null}

        {publicKey &&
        studio?.auctionCapability &&
        activeStudioTab === "sell" &&
        !studio.auctionCapability.itemAuctionsAvailable ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{t("Per-item auctions in development", "Subastas por item en desarrollo")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{studio.auctionCapability.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(
                    "The current page already covers buying, swapping, bidding, selling, and commission escrow management in one place.",
                    "La pagina actual ya cubre comprar, intercambiar, ofertar, vender y gestionar comisiones con escrow en un solo lugar.",
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}
          </div>
        </details>
        </section>
      ) : null}

      {txMessage ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-border bg-black/80 p-3 text-sm text-foreground shadow-2xl backdrop-blur">
          {txMessage}
        </div>
      ) : null}
    </div>
  );
}
