"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import {
  buildAcceptSwapTx,
  buildApproveCommissionDeliveryTx,
  buildBuyCommissionUsdcTx,
  buildBuyCommissionXlmTx,
  buildBuyUsdcTx,
  buildBuyXlmTx,
  buildCancelListingTx,
  buildCancelSwapTx,
  buildCreateSwapOfferTx,
  buildListCommissionEggTx,
  buildListForSaleTx,
  buildMarkCommissionDeliveredTx,
  buildRefundCommissionOrderTx,
} from "@/lib/marketplace";
import { buildBidUsdcTx, buildBidXlmTx, buildCreateItemAuctionTx } from "@/lib/auction";
import type {
  ArtistProfile,
  ArtistProfileChallengeResponse,
  ArtistProfileUpdateInput,
  ArtistProfileVerifyResponse,
  MarketplaceFeedItem,
  MarketplaceFeedResponse,
  MarketplaceMyStudioResponse,
  MyStudioCommissionOrderItem,
  MyStudioSwapOfferItem,
} from "@/lib/marketplace-hub-types";
import { getServer, NETWORK_PASSPHRASE, STELLAR_NETWORK } from "@/lib/contracts";
import {
  AlertTriangle,
  ArrowUpRight,
  Egg,
  Gavel,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

const TOKEN_SCALE = BigInt(10_000_000);
const DEFAULT_XLM_USDC_RATE = BigInt(1_600_000);
const PROFILE_SESSION_PREFIX = "shimeji_artist_profile_session:";

type FeedAssetFilter = "all" | "nft" | "commission_egg";
type FeedSaleFilter = "all" | "fixed_price" | "auction";
type FeedSort = "ending_soon" | "price_low" | "price_high";
type HubTopTab = "marketplace" | "studio";
type StudioWorkspaceTab = "profile" | "sell" | "swaps" | "commissions";

type ProfileDraft = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  languagesText: string;
  styleTagsText: string;
  socialLinksText: string;
  artistEnabled: boolean;
  commissionEnabled: boolean;
  acceptingNewClients: boolean;
  basePriceXlm: string;
  basePriceUsdc: string;
  turnaroundDaysMin: string;
  turnaroundDaysMax: string;
  slotsTotal: string;
  slotsOpen: string;
  preferredAuctionDurationHours: string;
};

type SocialLinkRow = {
  key: string;
  url: string;
};

type TokenPreview = {
  imageUrl: string | null;
  name: string | null;
};

function walletShort(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTokenAmount(rawUnits: string | number | bigint | null | undefined) {
  if (rawUnits === null || rawUnits === undefined) return "-";
  const parsed =
    typeof rawUnits === "bigint"
      ? rawUnits
      : typeof rawUnits === "number"
        ? BigInt(Math.trunc(rawUnits))
        : /^-?\d+$/.test(rawUnits)
          ? BigInt(rawUnits)
          : null;
  if (parsed === null) return "-";
  const zero = BigInt(0);
  const sign = parsed < zero ? "-" : "";
  const abs = parsed < zero ? -parsed : parsed;
  const whole = abs / TOKEN_SCALE;
  const frac = (abs % TOKEN_SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

function parseAmountToUnits(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return BigInt(0);
  if (!/^\d+(\.\d{0,7})?$/.test(trimmed)) {
    throw new Error("Invalid amount format");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const fracPadded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole) * TOKEN_SCALE + BigInt(fracPadded);
}

function computeRate(priceXlm: bigint, priceUsdc: bigint): bigint {
  const zero = BigInt(0);
  if (priceXlm > zero && priceUsdc > zero) {
    return (priceUsdc * TOKEN_SCALE) / priceXlm;
  }
  return DEFAULT_XLM_USDC_RATE;
}

function timeLeftLabel(endTimeSeconds: number | null) {
  if (!endTimeSeconds) return "";
  const delta = endTimeSeconds - Math.floor(Date.now() / 1000);
  if (delta <= 0) return "Ended";
  const days = Math.floor(delta / 86400);
  const hours = Math.floor((delta % 86400) / 3600);
  const minutes = Math.floor((delta % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function resolveMediaUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path ? `https://ipfs.io/ipfs/${path}` : null;
  }
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return value;
}

function isLikelyImageUrl(value: string | null | undefined) {
  if (!value) return false;
  return (
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(value)
  );
}

function marketplaceStatusLabel(
  status: MarketplaceFeedItem["status"],
  t: (en: string, es: string) => string,
) {
  if (status === "active") return t("Live", "Activo");
  if (status === "ended") return t("Ended", "Finalizada");
  if (status === "sold") return t("Sold", "Vendida");
  if (status === "cancelled") return t("Cancelled", "Cancelada");
  return status;
}

function safeInitial(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "S";
}

function orderStatusChipClass(status: string) {
  if (status === "Completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-foreground";
  }
  if (status === "Refunded") {
    return "border-rose-400/20 bg-rose-400/10 text-foreground";
  }
  if (status === "Delivered") {
    return "border-blue-400/20 bg-blue-400/10 text-foreground";
  }
  return "border-amber-400/20 bg-amber-400/10 text-foreground";
}

function orderStatusLabel(status: string, t: (en: string, es: string) => string) {
  if (status === "Accepted") return t("In progress", "En progreso");
  if (status === "Delivered") return t("Delivered (awaiting approval)", "Entregada (esperando aprobacion)");
  if (status === "Completed") return t("Completed", "Completada");
  if (status === "Refunded") return t("Refunded", "Reembolsada");
  return status;
}

function commissionOrderIsOpen(status: string) {
  return status !== "Completed" && status !== "Refunded";
}

function buildProfileDraft(profile: ArtistProfile | null): ProfileDraft {
  return {
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    avatarUrl: profile?.avatarUrl || "",
    bannerUrl: profile?.bannerUrl || "",
    languagesText: (profile?.languages || []).join(", "),
    styleTagsText: (profile?.styleTags || []).join(", "),
    socialLinksText: Object.entries(profile?.socialLinks || {})
      .map(([key, value]) => `${key}:${value}`)
      .join("\n"),
    artistEnabled: profile?.artistEnabled || false,
    commissionEnabled: profile?.commissionEnabled || false,
    acceptingNewClients: profile?.acceptingNewClients ?? true,
    basePriceXlm: profile?.basePriceXlm || "",
    basePriceUsdc: profile?.basePriceUsdc || "",
    turnaroundDaysMin: profile?.turnaroundDaysMin?.toString() || "",
    turnaroundDaysMax: profile?.turnaroundDaysMax?.toString() || "",
    slotsTotal: profile?.slotsTotal?.toString() || "",
    slotsOpen: profile?.slotsOpen?.toString() || "",
    preferredAuctionDurationHours: profile?.preferredAuctionDurationHours?.toString() || "24",
  };
}

function profileDraftToPayload(draft: ProfileDraft): ArtistProfileUpdateInput {
  const socialLinks = Object.fromEntries(
    draft.socialLinksText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(":");
        if (idx <= 0) return ["", ""] as const;
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] as const;
      })
      .filter(([key, value]) => Boolean(key) && Boolean(value)),
  );

  const toArray = (raw: string) =>
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  const toNullableNumber = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const num = Number.parseInt(trimmed, 10);
    return Number.isFinite(num) ? num : null;
  };

  return {
    displayName: draft.displayName,
    bio: draft.bio,
    avatarUrl: draft.avatarUrl,
    bannerUrl: draft.bannerUrl,
    languages: toArray(draft.languagesText),
    styleTags: toArray(draft.styleTagsText),
    socialLinks,
    artistEnabled: draft.artistEnabled,
    commissionEnabled: draft.artistEnabled ? draft.commissionEnabled : false,
    acceptingNewClients: draft.acceptingNewClients,
    basePriceXlm: draft.basePriceXlm,
    basePriceUsdc: draft.basePriceUsdc,
    turnaroundDaysMin: toNullableNumber(draft.turnaroundDaysMin),
    turnaroundDaysMax: toNullableNumber(draft.turnaroundDaysMax),
    slotsTotal: toNullableNumber(draft.slotsTotal),
    slotsOpen: toNullableNumber(draft.slotsOpen),
    preferredAuctionDurationHours: toNullableNumber(draft.preferredAuctionDurationHours),
  };
}

function socialLinksTextToRows(raw: string): SocialLinkRow[] {
  const rows = String(raw || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx <= 0) {
        return { key: line, url: "" };
      }
      return {
        key: line.slice(0, idx).trim(),
        url: line.slice(idx + 1).trim(),
      };
    })
    .filter((row) => row.key || row.url);

  return rows.slice(0, 10);
}

function socialLinksRowsToText(rows: SocialLinkRow[]): string {
  return rows
    .map((row) => ({
      key: String(row.key || "").trim(),
      url: String(row.url || "").trim(),
    }))
    .filter((row) => row.key || row.url)
    .map((row) => (row.key && row.url ? `${row.key}:${row.url}` : row.key || row.url))
    .join("\n");
}

async function signAndSubmitXdr(
  txXdr: string,
  signTransaction: ReturnType<typeof useFreighter>["signTransaction"],
  address: string,
) {
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const signedXdr = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  await server.sendTransaction(tx);
}

function InputField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "url";
  textarea?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  const baseClassName =
    "w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{props.label}</span>
      {props.textarea ? (
        <textarea
          className={baseClassName}
          rows={props.rows ?? 3}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
          disabled={props.disabled}
        />
      ) : (
        <input
          className={baseClassName}
          type={props.type || "text"}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
          disabled={props.disabled}
        />
      )}
    </label>
  );
}

function ToggleField(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-white/5 p-3 text-sm">
      <span className="flex-1">
        <span className="block text-foreground">{props.label}</span>
        <span className="block text-xs text-muted-foreground">{props.description}</span>
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        disabled={props.disabled}
        className="mt-1 h-4 w-4 accent-emerald-400"
      />
    </label>
  );
}

export function MarketplaceHub() {
  const { isSpanish } = useLanguage();
  const { publicKey, isConnected, signTransaction, signMessage } = useFreighter();
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
  const [listingMode, setListingMode] = useState<"auto" | "nft" | "commission_egg">("auto");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const [swapOfferedTokenId, setSwapOfferedTokenId] = useState("");
  const [swapDesiredTokenId, setSwapDesiredTokenId] = useState("");
  const [swapIntention, setSwapIntention] = useState("");
  const [auctionBidCurrency, setAuctionBidCurrency] = useState<"XLM" | "USDC">("XLM");
  const [auctionBidAmount, setAuctionBidAmount] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const [txMessage, setTxMessage] = useState("");
  const [purchaseLoadingItemId, setPurchaseLoadingItemId] = useState<string | null>(null);
  const [orderActionBusyId, setOrderActionBusyId] = useState<string | null>(null);
  const [swapActionBusyId, setSwapActionBusyId] = useState<string | null>(null);
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

  useEffect(() => {
    const tokenUris = Array.from(
      new Set<string>(
        (feed?.items || [])
          .map((item) => item.tokenUri)
          .filter((uri): uri is string => typeof uri === "string" && uri.length > 0),
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
  }, [feed, tokenPreviews]);

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
      const txXdr =
        targetMode === "commission_egg"
          ? await buildListCommissionEggTx(publicKey, selectedToken.tokenId, priceXlm, priceUsdc, xlmUsdcRate)
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
      const desiredTokenId = Number.parseInt(swapDesiredTokenId, 10);
      if (!Number.isFinite(offeredTokenId) || !Number.isFinite(desiredTokenId)) {
        throw new Error(t("Select both offered and desired NFTs.", "Selecciona el NFT ofrecido y el deseado."));
      }
      if (!swapIntention.trim()) {
        throw new Error(t("Add a short swap message.", "Agrega un mensaje corto para el intercambio."));
      }
      const txXdr = await buildCreateSwapOfferTx(publicKey, offeredTokenId, desiredTokenId, swapIntention.trim());
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap offer submitted.", "Oferta de intercambio enviada."));
      setSwapIntention("");
      await loadStudio(publicKey);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to create swap offer.");
    } finally {
      setTxBusy(false);
    }
  }

  async function handleAcceptSwapOffer(swapId: number) {
    if (!publicKey) return;
    setSwapActionBusyId(`accept:${swapId}`);
    setTxMessage("");
    try {
      const txXdr = await buildAcceptSwapTx(publicKey, swapId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap accepted.", "Intercambio aceptado."));
      await loadStudio(publicKey);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to accept swap.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCancelSwapOffer(swapId: number) {
    if (!publicKey) return;
    setSwapActionBusyId(`cancel:${swapId}`);
    setTxMessage("");
    try {
      const txXdr = await buildCancelSwapTx(publicKey, swapId);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Swap cancelled.", "Intercambio cancelado."));
      await loadStudio(publicKey);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to cancel swap.");
    } finally {
      setSwapActionBusyId(null);
    }
  }

  async function handleCommissionOrderAction(
    order: MyStudioCommissionOrderItem,
    action: "deliver" | "approve" | "refund",
  ) {
    if (!publicKey) return;
    setOrderActionBusyId(`${action}:${order.orderId}`);
    setTxMessage("");
    try {
      let txXdr: string;
      if (action === "deliver") {
        txXdr = await buildMarkCommissionDeliveredTx(publicKey, order.orderId);
      } else if (action === "approve") {
        txXdr = await buildApproveCommissionDeliveryTx(publicKey, order.orderId);
      } else {
        txXdr = await buildRefundCommissionOrderTx(publicKey, order.orderId);
      }
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(
        action === "deliver"
          ? t("Commission marked as delivered.", "Comision marcada como entregada.")
          : action === "approve"
            ? t("Delivery approved and escrow released.", "Entrega aprobada y escrow liberado.")
            : t("Commission refunded from escrow.", "Comision reembolsada desde escrow."),
      );
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to update commission order.");
    } finally {
      setOrderActionBusyId(null);
    }
  }

  async function handleBuy(item: MarketplaceFeedItem, currency: "XLM" | "USDC") {
    if (!publicKey) {
      setTxMessage(t("Connect your wallet from the header first.", "Conecta tu wallet desde el header primero."));
      return;
    }
    if (!item.id.startsWith("listing:")) return;

    setPurchaseLoadingItemId(item.id);
    setTxMessage("");
    try {
      const listingId = Number.parseInt(item.id.split(":")[1] || "", 10);
      if (!Number.isFinite(listingId)) throw new Error("Invalid listing id");

      let txXdr: string;
      if (item.assetKind === "commission_egg") {
        const intention = window.prompt(
          t(
            "Commission brief (short description):",
            "Brief de la comision (descripcion corta):",
          ),
          "",
        ) || "";
        const referenceImageUrl =
          window.prompt(
            t(
              "Reference image URL (optional):",
              "URL de imagen de referencia (opcional):",
            ),
            "",
          ) || "";
        txXdr =
          currency === "XLM"
            ? await buildBuyCommissionXlmTx(publicKey, listingId, intention, referenceImageUrl)
            : await buildBuyCommissionUsdcTx(publicKey, listingId, intention, referenceImageUrl);
      } else {
        txXdr =
          currency === "XLM"
            ? await buildBuyXlmTx(publicKey, listingId)
            : await buildBuyUsdcTx(publicKey, listingId);
      }

      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setTxMessage(t("Purchase submitted.", "Compra enviada."));
      await Promise.all([loadFeed(), loadStudio(publicKey)]);
    } catch (error) {
      setTxMessage(error instanceof Error ? error.message : "Failed to buy item.");
    } finally {
      setPurchaseLoadingItemId(null);
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
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
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
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
              activeTopTab === "studio"
                ? "border-blue-300/30 bg-blue-400/15 text-foreground"
                : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" />
            {t("My Space", "Mi espacio")}
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground/80">
          {t("Wallet connect is in the global header.", "La wallet se conecta desde el header global.")}
        </p>
      </div>

      {activeTopTab === "marketplace" ? (
        <section className="rounded-3xl border border-border bg-white/10 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ShoppingCart className="h-5 w-5 text-emerald-300" />
              {t("Marketplace", "Marketplace")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("Public listings and auctions.", "Publicaciones y subastas publicas.")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border bg-white/5 text-foreground hover:bg-white/10"
            onClick={() => void loadFeed()}
            disabled={feedLoading}
          >
            {feedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("Refresh", "Actualizar")}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{t("Search", "Buscar")}</span>
            <input
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
              placeholder={t("wallet, URI, artist...", "wallet, URI, artista...")}
              value={feedSearch}
              onChange={(event) => setFeedSearch(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{t("Asset", "Activo")}</span>
            <select
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
              value={feedAssetFilter}
              onChange={(event) => setFeedAssetFilter(event.target.value as FeedAssetFilter)}
            >
              <option value="all">{t("All", "Todos")}</option>
              <option value="nft">NFT</option>
              <option value="commission_egg">{t("Commission Egg", "Huevo de Comision")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{t("Sale type", "Tipo de venta")}</span>
            <select
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
              value={feedSaleFilter}
              onChange={(event) => setFeedSaleFilter(event.target.value as FeedSaleFilter)}
            >
              <option value="all">{t("All", "Todos")}</option>
              <option value="fixed_price">{t("Fixed price", "Precio fijo")}</option>
              <option value="auction">{t("Auction", "Subasta")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{t("Sort", "Orden")}</span>
            <select
              className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
              value={feedSort}
              onChange={(event) => setFeedSort(event.target.value as FeedSort)}
            >
              <option value="ending_soon">{t("Ending soon", "Termina pronto")}</option>
              <option value="price_low">{t("Price low to high", "Precio menor a mayor")}</option>
              <option value="price_high">{t("Price high to low", "Precio mayor a menor")}</option>
            </select>
          </label>
        </div>

        {feedError ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-foreground">
            {feedError}
          </div>
        ) : null}

        {feed?.warnings?.length ? (
          <div className="mt-4 space-y-2">
            {feed.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-foreground">
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {liveAuctionItem ? (
          <div className="hidden mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-4">
            <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
              <div>
                <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div className="relative overflow-hidden rounded-2xl border border-amber-200/20 bg-zinc-900/70">
                    <div className="aspect-square w-full">
                      {(() => {
                        const preview =
                          liveAuctionItem.tokenUri ? tokenPreviews[liveAuctionItem.tokenUri] : null;
                        if (preview?.imageUrl) {
                          return (
                            <img
                              src={preview.imageUrl}
                              alt={preview.name || `Auction ${liveAuctionItem.auction?.auctionId ?? ""}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          );
                        }
                        return (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/15 to-transparent text-muted-foreground">
                            <div className="flex flex-col items-center gap-2 text-xs">
                              <ImageIcon className="h-8 w-8" />
                              <span>{t("Preview loading", "Cargando preview")}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">
                      <Gavel className="h-3 w-3" />
                      {t("Featured Auction", "Subasta destacada")}
                    </div>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-foreground">
                      <Gavel className="h-3.5 w-3.5" />
                      {t("Live Auction", "Subasta en vivo")}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {liveAuctionItem.tokenId !== null
                        ? `${t("Shimeji NFT", "Shimeji NFT")} #${liveAuctionItem.tokenId}`
                        : `${t("Auction", "Subasta")} #${liveAuctionItem.auction?.auctionId ?? "?"}`}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        "Bid from this panel or open the full auction page for more detail.",
                        "Oferta desde este panel o abre la pagina completa de subasta para mas detalle.",
                      )}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                      <div className="rounded-xl border border-border bg-white/5 p-3">
                        <p className="text-xs text-muted-foreground">{t("Current bid", "Oferta actual")}</p>
                        <p className="text-foreground font-semibold">
                          {liveAuctionItem.auction?.currentBidAmount
                            ? `${formatTokenAmount(liveAuctionItem.auction.currentBidAmount)} ${liveAuctionItem.auction.currentBidCurrency === "Usdc" ? "USDC" : "XLM"}`
                            : t("No bids yet", "Sin ofertas todavia")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-white/5 p-3">
                        <p className="text-xs text-muted-foreground">{t("Time left", "Tiempo restante")}</p>
                        <p className="text-foreground font-semibold">
                          {timeLeftLabel(liveAuctionItem.auction?.endTime ?? null)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <div className="rounded-full border border-border bg-white/5 px-3 py-1">
                        {t("Auction ID", "ID subasta")}: #{liveAuctionItem.auction?.auctionId ?? "?"}
                      </div>
                      <div className="rounded-full border border-border bg-white/5 px-3 py-1">
                        {t("Starting price", "Precio inicial")}:{" "}
                        {liveAuctionItem.priceUsdc
                          ? `${formatTokenAmount(liveAuctionItem.priceUsdc)} USDC`
                          : liveAuctionItem.priceXlm
                            ? `${formatTokenAmount(liveAuctionItem.priceXlm)} XLM`
                            : "-"}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        href={
                          liveAuctionItem.tokenId !== null
                            ? `/marketplace/shimeji/${liveAuctionItem.tokenId}`
                            : "/marketplace"
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
                      >
                        {t("View NFT details", "Ver detalle del NFT")}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-white/5 p-4">
                <div className="grid gap-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>{t("Currency", "Moneda")}</span>
                    <select
                      className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                      value={auctionBidCurrency}
                      onChange={(event) => setAuctionBidCurrency(event.target.value as "XLM" | "USDC")}
                    >
                      <option value="XLM">XLM</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </label>
                  <InputField
                    label={t("Bid amount", "Monto de oferta")}
                    value={auctionBidAmount}
                    onChange={setAuctionBidAmount}
                    placeholder={auctionBidCurrency === "XLM" ? "500" : "50"}
                  />
                  <Button
                    type="button"
                    className="w-full bg-amber-400 text-black hover:bg-amber-300"
                    onClick={() => void handleAuctionBid()}
                    disabled={txBusy || !publicKey}
                  >
                    {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                    {t("Place bid", "Ofertar")}
                  </Button>
                  {!publicKey ? (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Connect your wallet using the global header to bid.",
                        "Conecta tu wallet usando el header global para ofertar.",
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {marketplaceGridItems.map((item) => {
            const isAuction = item.saleKind === "auction";
            const isCommissionEgg = item.assetKind === "commission_egg";
            const canBuy = item.saleKind === "fixed_price" && item.status === "active" && item.id.startsWith("listing:");
            const itemDetailHref =
              item.tokenId !== null
                ? `/marketplace/shimeji/${item.tokenId}`
                : null;
            const artistHref = item.sellerWallet ? `/marketplace/artist/${item.sellerWallet}` : null;
            const preview = item.tokenUri ? tokenPreviews[item.tokenUri] : null;
            const previewImageUrl = preview?.imageUrl || null;
            const title =
              preview?.name ||
              (item.tokenId !== null
                ? `${isCommissionEgg ? t("Commission Egg", "Huevo de comision") : "Shimeji NFT"} #${item.tokenId}`
                : `${t("Auction", "Subasta")} #${item.auction?.auctionId ?? "?"}`);
            const sellerDisplayName = item.sellerProfile?.displayName
              ? item.sellerProfile.displayName
              : item.sellerWallet
                ? walletShort(item.sellerWallet)
                : t("Auction listing", "Lote en subasta");
            const sellerSubline = item.sellerWallet
              ? walletShort(item.sellerWallet)
              : t("Seller hidden on auction contract", "Vendedor no expuesto por el contrato de subasta");
            const primaryPrice = item.priceUsdc
              ? `${formatTokenAmount(item.priceUsdc)} USDC`
              : item.priceXlm
                ? `${formatTokenAmount(item.priceXlm)} XLM`
                : "-";
            const secondaryPrice = item.priceUsdc && item.priceXlm
              ? `${formatTokenAmount(item.priceXlm)} XLM`
              : null;
            const statusLabel = marketplaceStatusLabel(item.status, t);
            const styleTags = item.sellerProfile?.styleTags?.slice(0, 2) || [];
            return (
              <article
                key={item.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white/5 shadow-sm transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <div className="relative overflow-hidden border-b border-border bg-black/40">
                  <div className="aspect-square w-full">
                    {previewImageUrl ? (
                      <img
                        src={previewImageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 text-xs">
                          <ImageIcon className="h-8 w-8" />
                          <span>{t("Loading image", "Cargando imagen")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-white">
                      {isCommissionEgg ? t("Commission Egg", "Huevo de comision") : "NFT"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-white">
                      {isAuction ? <Gavel className="h-3 w-3" /> : null}
                      {isAuction ? t("Auction", "Subasta") : t("Sale", "Venta")}
                    </span>
                  </div>
                  <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] text-white">
                    {statusLabel}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {isAuction ? t("Live listing", "Publicacion en vivo") : t("Marketplace listing", "Publicacion marketplace")}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-foreground">
                      {itemDetailHref ? (
                        <Link href={itemDetailHref} className="hover:underline">
                          {title}
                        </Link>
                      ) : (
                        title
                      )}
                    </h3>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-border bg-white/5 p-3">
                    {item.sellerProfile?.bannerUrl ? (
                      <div className="pointer-events-none absolute inset-0 opacity-15">
                        <img
                          src={item.sellerProfile.bannerUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40 text-sm font-semibold text-white">
                        {item.sellerProfile?.avatarUrl ? (
                          <img
                            src={item.sellerProfile.avatarUrl}
                            alt={sellerDisplayName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          safeInitial(sellerDisplayName)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {artistHref ? (
                            <Link href={artistHref} className="hover:underline">
                              {sellerDisplayName}
                            </Link>
                          ) : (
                            sellerDisplayName
                          )}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {sellerSubline}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.sellerProfile?.artistEnabled ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-foreground">
                            {t("Artist", "Artista")}
                          </span>
                        ) : null}
                        {item.sellerProfile?.commissionEnabled && isCommissionEgg ? (
                          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-[10px] text-foreground">
                            {t("Commissions", "Comisiones")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {styleTags.length ? (
                      <div className="relative mt-2 flex flex-wrap gap-1">
                        {styleTags.map((tag) => (
                          <span
                            key={`${item.id}-style-${tag}`}
                            className="rounded-full border border-border bg-black/25 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {isAuction ? t("Current / start price", "Oferta actual / inicial") : t("Price", "Precio")}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{primaryPrice}</p>
                        {secondaryPrice ? (
                          <p className="text-xs text-muted-foreground">{secondaryPrice}</p>
                        ) : null}
                      </div>
                      {isCommissionEgg ? (
                        <Egg className="mt-0.5 h-5 w-5 text-amber-300" />
                      ) : isAuction ? (
                        <Gavel className="mt-0.5 h-5 w-5 text-amber-300" />
                      ) : (
                        <Store className="mt-0.5 h-5 w-5 text-emerald-300" />
                      )}
                    </div>

                    {isAuction && item.auction ? (
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-black/20 px-2.5 py-2">
                          <p className="text-muted-foreground">{t("Time left", "Tiempo restante")}</p>
                          <p className="font-medium text-foreground">{timeLeftLabel(item.auction.endTime)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-black/20 px-2.5 py-2">
                          <p className="text-muted-foreground">{t("Bids", "Ofertas")}</p>
                          <p className="font-medium text-foreground">{item.auction.bidCount}</p>
                        </div>
                      </div>
                    ) : null}

                    {isCommissionEgg && item.commissionMeta ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {item.commissionMeta.expectedTurnaroundDays ? (
                          <span className="rounded-full border border-border bg-black/20 px-2 py-1">
                            {t("ETA", "Entrega")}: {item.commissionMeta.expectedTurnaroundDays}d
                          </span>
                        ) : null}
                        {item.commissionMeta.slotsAvailable !== null ? (
                          <span className="rounded-full border border-border bg-black/20 px-2 py-1">
                            {t("Slots", "Cupos")}: {item.commissionMeta.slotsAvailable}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto space-y-2">
                    {itemDetailHref ? (
                      <Link
                        href={itemDetailHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/10"
                      >
                        {t("View details", "Ver detalles")}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : null}

                    {canBuy ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-500 text-black hover:bg-emerald-400"
                          onClick={() => void handleBuy(item, "XLM")}
                          disabled={purchaseLoadingItemId === item.id}
                        >
                          {purchaseLoadingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t("Buy XLM", "Comprar XLM")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-border bg-white/5 text-foreground hover:bg-white/10"
                          onClick={() => void handleBuy(item, "USDC")}
                          disabled={purchaseLoadingItemId === item.id}
                        >
                          {t("Buy USDC", "Comprar USDC")}
                        </Button>
                      </div>
                    ) : isAuction ? (
                      <div className="rounded-xl border border-border bg-white/5 p-3 text-xs text-muted-foreground">
                        {t(
                          "Open the Shimeji page to view the auction details.",
                          "Abre la pagina del Shimeji para ver el detalle de la subasta.",
                        )}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      {artistHref ? (
                        <Link href={artistHref} className="hover:text-foreground hover:underline">
                          {t("View artist", "Ver artista")}
                        </Link>
                      ) : (
                        <span>{t("Marketplace", "Marketplace")}</span>
                      )}
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => void handleReport("listing", item.id)}
                      >
                        {t("Report", "Reportar")}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!feedLoading && marketplaceGridItems.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-white/5 p-6 text-center text-sm text-muted-foreground">
            {t(
              "No items match these filters yet. Try clearing filters or be the first to list a Shimeji.",
              "No hay items para esos filtros todavia. Prueba limpiando filtros o se la primera persona en listar un Shimeji.",
            )}
          </div>
        ) : null}
        </section>
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
                "Your NFTs, listings, swaps, and commissions.",
                "Tus NFTs, publicaciones, swaps y comisiones.",
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

        <div className="mb-4 rounded-2xl border border-border bg-white/5 p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveStudioTab("profile")}
              className={`inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
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
              className={`inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
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
              className={`inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
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
              className={`inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs transition ${
                activeStudioTab === "commissions"
                  ? "border-amber-300/30 bg-amber-400/15 text-foreground"
                  : "border-border bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {t("Commissions", "Comisiones")}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-white/5 px-2 py-1">
              {t("NFTs", "NFTs")}: {studio?.ownedNfts.length || 0}
            </div>
            <div className="rounded-lg border border-border bg-white/5 px-2 py-1">
              {t("Listings", "Publicaciones")}: {studio?.myListings.length || 0}
            </div>
            <div className="rounded-lg border border-border bg-white/5 px-2 py-1">
              {t("Incoming swaps", "Swaps entrantes")}: {studio?.incomingSwapOffersForMyNfts.length || 0}
            </div>
            <div className="rounded-lg border border-border bg-white/5 px-2 py-1">
              {t("Commission orders", "Ordenes de comision")}: {((studio?.myCommissionOrdersAsArtist.length || 0) + (studio?.myCommissionOrdersAsBuyer.length || 0))}
            </div>
          </div>
        </div>

        {!isConnected || !publicKey ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/5 p-6 text-center text-sm text-muted-foreground">
            {t(
              "Connect a Stellar wallet from the global header to use My Space.",
              "Conecta una wallet Stellar desde el header global para usar Mi espacio.",
            )}
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
                    label={t("Base price XLM", "Precio base XLM")}
                    value={profileDraft.basePriceXlm}
                    onChange={(value) => setProfileDraft((prev) => ({ ...prev, basePriceXlm: value }))}
                    placeholder="100"
                    disabled={!canEditProfile}
                  />
                  <InputField
                    label={t("Base price USDC", "Precio base USDC")}
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
                          className="rounded-full border border-border bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 disabled:opacity-50"
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
                          className={`rounded-full border px-3 py-1 text-xs ${auctionDurationHours === String(hours) ? "border-amber-300/40 bg-amber-400/10 text-foreground" : "border-border bg-white/5 text-muted-foreground"}`}
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

              {activeStudioTab === "sell" ? (
              <div className="rounded-2xl border border-border bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("My assets", "Mis activos")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("On-chain NFTs detected for your connected wallet.", "NFTs on-chain detectados para tu wallet conectada.")}
                </p>
                <div className="mt-4 grid gap-2 max-h-72 overflow-auto pr-1">
                  {(studio?.ownedNfts || []).map((token) => (
                    <div
                      key={token.tokenId}
                      className="rounded-xl border border-border bg-white/5 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">#{token.tokenId}</span>
                        <span className={`rounded-full border px-2 py-0.5 ${token.isCommissionEgg ? "border-amber-400/20 bg-amber-400/10 text-foreground" : "border-emerald-400/20 bg-emerald-400/10 text-foreground"}`}>
                          {token.isCommissionEgg ? t("Commission Egg", "Huevo de Comision") : "NFT"}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-muted-foreground line-clamp-2">{token.tokenUri}</p>
                    </div>
                  ))}
                  {(studio?.ownedNfts.length || 0) === 0 && !studioLoading ? (
                    <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
                      {t("No NFTs found for this wallet yet.", "Todavia no se encontraron NFTs para esta wallet.")}
                    </div>
                  ) : null}
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
                    "Create a friendly NFT-for-NFT trade offer and manage incoming/outgoing swaps.",
                    "Crea una oferta de intercambio NFT-por-NFT y gestiona swaps entrantes/salientes.",
                  )}
                </p>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                      label={t("Desired NFT token ID", "Token ID del NFT deseado")}
                      type="number"
                      value={swapDesiredTokenId}
                      onChange={setSwapDesiredTokenId}
                      placeholder="42"
                    />
                  </div>
                  <InputField
                    label={t("Swap message", "Mensaje de intercambio")}
                    value={swapIntention}
                    onChange={setSwapIntention}
                    placeholder={t("Example: I can trade my rare fox for your neon dragon", "Ejemplo: Cambio mi zorro raro por tu dragon neon")}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleCreateSwapOffer()}
                    disabled={txBusy || !swapOfferedTokenId || !swapDesiredTokenId || !swapIntention.trim()}
                    className="w-full bg-blue-500 text-foreground hover:bg-blue-400"
                  >
                    {txBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("Create swap offer", "Crear oferta de intercambio")}
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs font-medium text-foreground">{t("Incoming offers for my NFTs", "Ofertas entrantes para mis NFTs")}</p>
                    <div className="mt-2 space-y-2">
                      {(studio?.incomingSwapOffersForMyNfts || []).map((swap) => (
                        <div key={`incoming-swap-${swap.swapId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">#{swap.swapId}</span>
                            <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-foreground">
                              {t("Incoming", "Entrante")}
                            </span>
                          </div>
                          <p>{t("They offer", "Ofrecen")}: #{swap.offeredTokenId}</p>
                          <p>{t("They want", "Quieren")}: #{swap.desiredTokenId}</p>
                          {swap.intention ? <p className="line-clamp-2">{swap.intention}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-500 text-black hover:bg-emerald-400"
                              onClick={() => void handleAcceptSwapOffer(swap.swapId)}
                              disabled={swapActionBusyId === `accept:${swap.swapId}`}
                            >
                              {swapActionBusyId === `accept:${swap.swapId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Accept", "Aceptar")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(studio?.incomingSwapOffersForMyNfts.length || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground/80">{t("No incoming swap offers right now.", "No hay ofertas de intercambio entrantes ahora.")}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs font-medium text-foreground">{t("My outgoing swap offers", "Mis ofertas de intercambio")}</p>
                    <div className="mt-2 space-y-2">
                      {(studio?.myOutgoingSwapOffers || []).map((swap) => (
                        <div key={`outgoing-swap-${swap.swapId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-foreground">#{swap.swapId}</span>
                            <span className="rounded-full border border-slate-300/20 bg-slate-300/10 px-2 py-0.5 text-foreground">
                              {t("Outgoing", "Saliente")}
                            </span>
                          </div>
                          <p>{t("Offering", "Ofreciendo")}: #{swap.offeredTokenId}</p>
                          <p>{t("Seeking", "Buscando")}: #{swap.desiredTokenId}</p>
                          {swap.intention ? <p className="line-clamp-2">{swap.intention}</p> : null}
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300/20 bg-red-500/10 text-foreground hover:bg-red-500/20"
                              onClick={() => void handleCancelSwapOffer(swap.swapId)}
                              disabled={swapActionBusyId === `cancel:${swap.swapId}`}
                            >
                              {swapActionBusyId === `cancel:${swap.swapId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Cancel swap", "Cancelar swap")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(studio?.myOutgoingSwapOffers.length || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground/80">{t("You have no active swap offers.", "No tienes ofertas de intercambio activas.")}</p>
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
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">{t("As artist (commission eggs sold)", "Como artista (huevos vendidos)")}</p>
                  <div className="mt-2 space-y-2">
                    {studio.myCommissionOrdersAsArtist.map((order) => (
                      <div key={`artist-${order.orderId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground">#{order.orderId} · token #{order.tokenId}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${orderStatusChipClass(order.status)}`}>
                            {orderStatusLabel(order.status, t)}
                          </span>
                        </div>
                        <p>{t("Buyer", "Comprador")}: {walletShort(order.buyer)}</p>
                        <p>{t("Paid", "Pago")}: {formatTokenAmount(order.amountPaid)} {order.currency.toUpperCase()}</p>
                        {order.intention ? <p className="line-clamp-2">{t("Brief", "Brief")}: {order.intention}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.status === "Accepted" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-blue-500 text-foreground hover:bg-blue-400"
                              onClick={() => void handleCommissionOrderAction(order, "deliver")}
                              disabled={orderActionBusyId === `deliver:${order.orderId}`}
                            >
                              {orderActionBusyId === `deliver:${order.orderId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {t("Mark delivered", "Marcar entregada")}
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
                              {t("Cancel + refund escrow", "Cancelar + reembolsar escrow")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {studio.myCommissionOrdersAsArtist.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80">{t("No commission egg orders as artist yet.", "Todavia no hay ordenes de huevo de comision como artista.")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">{t("As buyer", "Como comprador")}</p>
                  <div className="mt-2 space-y-2">
                    {studio.myCommissionOrdersAsBuyer.map((order) => (
                      <div key={`buyer-${order.orderId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground">#{order.orderId} · token #{order.tokenId}</span>
                          <span className={`rounded-full border px-2 py-0.5 ${orderStatusChipClass(order.status)}`}>
                            {orderStatusLabel(order.status, t)}
                          </span>
                        </div>
                        <p>{t("Artist", "Artista")}: {walletShort(order.seller)}</p>
                        <p>{t("Paid", "Pago")}: {formatTokenAmount(order.amountPaid)} {order.currency.toUpperCase()}</p>
                        {order.referenceImageUrl ? <p className="line-clamp-1">Ref: {order.referenceImageUrl}</p> : null}
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
                              {t("Request refund (escrow)", "Reembolsar (escrow)")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
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
