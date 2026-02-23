import type { ArtistProfile, ArtistProfileUpdateInput } from "@/lib/marketplace-hub-types";
import { getServer, NETWORK_PASSPHRASE } from "@/lib/contracts";

export const TOKEN_SCALE = BigInt(10_000_000);
export const DEFAULT_XLM_USDC_RATE = BigInt(1_600_000);
export const PROFILE_SESSION_PREFIX = "shimeji_artist_profile_session:";
export const COMMISSION_AUTO_RELEASE_AFTER_DELIVERY_SECS = 7 * 24 * 60 * 60;

export type FeedAssetFilter = "all" | "nft" | "commission_egg";
export type FeedSaleFilter = "all" | "fixed_price" | "auction" | "swap";
export type FeedSort = "ending_soon" | "price_low" | "price_high";
export type HubTopTab = "marketplace" | "studio";
export type StudioWorkspaceTab = "profile" | "sell" | "swaps" | "commissions";
export type HubTranslateFn = (en: string, es: string) => string;

export type ProfileDraft = {
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

export type SocialLinkRow = {
  key: string;
  url: string;
};

export type TokenPreview = {
  imageUrl: string | null;
  name: string | null;
};

export function walletShort(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatTokenAmount(rawUnits: string | number | bigint | null | undefined) {
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

export function parseAmountToUnits(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return BigInt(0);
  if (!/^\d+(\.\d{0,7})?$/.test(trimmed)) {
    throw new Error("Invalid amount format");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const fracPadded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole) * TOKEN_SCALE + BigInt(fracPadded);
}

export function computeRate(priceXlm: bigint, priceUsdc: bigint): bigint {
  const zero = BigInt(0);
  if (priceXlm > zero && priceUsdc > zero) {
    return (priceUsdc * TOKEN_SCALE) / priceXlm;
  }
  return DEFAULT_XLM_USDC_RATE;
}

export function timeLeftLabel(endTimeSeconds: number | null) {
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

export function commissionAutoReleaseAt(deliveredAt: number) {
  if (!deliveredAt || deliveredAt <= 0) return 0;
  return deliveredAt + COMMISSION_AUTO_RELEASE_AFTER_DELIVERY_SECS;
}

export function formatTimestamp(timestampSeconds: number | null | undefined) {
  if (!timestampSeconds || timestampSeconds <= 0) return "-";
  try {
    return new Date(timestampSeconds * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

export function resolveMediaUrl(raw: string | null | undefined): string | null {
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

export function isLikelyImageUrl(value: string | null | undefined) {
  if (!value) return false;
  return (
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i.test(value)
  );
}

export function orderStatusChipClass(status: string) {
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

export function orderStatusLabel(status: string, t: HubTranslateFn) {
  if (status === "Accepted") return t("In progress", "En progreso");
  if (status === "Delivered") return t("Delivered (awaiting approval)", "Entregada (esperando aprobacion)");
  if (status === "Completed") return t("Completed", "Completada");
  if (status === "Refunded") return t("Refunded", "Reembolsada");
  return status;
}

export function commissionOrderIsOpen(status: string) {
  return status !== "Completed" && status !== "Refunded";
}

export function buildProfileDraft(profile: ArtistProfile | null): ProfileDraft {
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

export function profileDraftToPayload(draft: ProfileDraft): ArtistProfileUpdateInput {
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

export function socialLinksTextToRows(raw: string): SocialLinkRow[] {
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

export function socialLinksRowsToText(rows: SocialLinkRow[]): string {
  return rows
    .map((row) => ({
      key: String(row.key || "").trim(),
      url: String(row.url || "").trim(),
    }))
    .filter((row) => row.key || row.url)
    .map((row) => (row.key && row.url ? `${row.key}:${row.url}` : row.key || row.url))
    .join("\n");
}

type SignTransactionFn = (
  txXdr: string,
  options: { networkPassphrase: string; address: string },
) => Promise<string>;

export async function signAndSubmitXdr(
  txXdr: string,
  signTransaction: SignTransactionFn,
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
