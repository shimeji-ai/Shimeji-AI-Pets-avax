import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import type {
  ArtistProfile,
  ArtistProfileUpdateInput,
  MarketplaceReportRecord,
} from "@/lib/marketplace-hub-types";

const STORE_PATH =
  process.env.SHIMEJI_ARTIST_PROFILE_STORE_PATH ||
  path.join(process.env.TMPDIR || "/tmp", "shimeji-xlm-artist-profiles-store.json");

const WALLET_RE = /^G[A-Z2-7]{55}$/;
const AUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPORT_REASON = 120;
const MAX_REPORT_DETAILS = 1000;

type AuthChallengeRecord = {
  id: string;
  wallet: string;
  message: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
};

type AuthSessionRecord = {
  token: string;
  wallet: string;
  createdAt: number;
  expiresAt: number;
  verificationMode: "mvp_unverified_signature";
};

type StoreFile = {
  profiles: Record<string, ArtistProfile>;
  authChallenges: Record<string, AuthChallengeRecord>;
  authSessions: Record<string, AuthSessionRecord>;
  reports: MarketplaceReportRecord[];
};

const EMPTY_STORE: StoreFile = {
  profiles: {},
  authChallenges: {},
  authSessions: {},
  reports: [],
};

function normalizeWalletAddress(wallet: string): string {
  return String(wallet || "").trim().toUpperCase();
}

export function isValidWalletAddress(wallet: string): boolean {
  return WALLET_RE.test(normalizeWalletAddress(wallet));
}

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeStringArray(value: unknown, maxItems: number, maxLengthPerItem: number): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => sanitizeString(entry, maxLengthPerItem))
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function sanitizeSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, raw]) => [sanitizeString(key, 40), sanitizeString(raw, 300)] as const)
    .filter(([key, url]) => Boolean(key) && Boolean(url));
  return Object.fromEntries(entries.slice(0, 10));
}

function sanitizeNullableNumber(
  value: unknown,
  opts: { min?: number; max?: number },
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (opts.min !== undefined && rounded < opts.min) return null;
  if (opts.max !== undefined && rounded > opts.max) return null;
  return rounded;
}

function sanitizePriceString(value: unknown): string {
  const raw = sanitizeString(value, 32);
  if (!raw) return "";
  if (!/^\d+(\.\d{1,7})?$/.test(raw)) return "";
  return raw;
}

function createDefaultProfile(walletAddress: string, now: number): ArtistProfile {
  return {
    walletAddress,
    displayName: "",
    avatarUrl: "",
    bannerUrl: "",
    bio: "",
    languages: [],
    styleTags: [],
    socialLinks: {},
    artistEnabled: false,
    commissionEnabled: false,
    acceptingNewClients: true,
    basePriceXlm: "",
    basePriceUsdc: "",
    turnaroundDaysMin: null,
    turnaroundDaysMax: null,
    slotsTotal: null,
    slotsOpen: null,
    preferredAuctionDurationHours: 24,
    reportCount: 0,
    visibilityStatus: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeProfilePatch(input: ArtistProfileUpdateInput): ArtistProfileUpdateInput {
  const patch: ArtistProfileUpdateInput = {};

  if ("displayName" in input) patch.displayName = sanitizeString(input.displayName, 80);
  if ("avatarUrl" in input) patch.avatarUrl = sanitizeString(input.avatarUrl, 500);
  if ("bannerUrl" in input) patch.bannerUrl = sanitizeString(input.bannerUrl, 500);
  if ("bio" in input) patch.bio = sanitizeString(input.bio, 1000);
  if ("languages" in input) patch.languages = sanitizeStringArray(input.languages, 12, 32);
  if ("styleTags" in input) patch.styleTags = sanitizeStringArray(input.styleTags, 16, 40);
  if ("socialLinks" in input) patch.socialLinks = sanitizeSocialLinks(input.socialLinks);
  if ("artistEnabled" in input) patch.artistEnabled = Boolean(input.artistEnabled);
  if ("commissionEnabled" in input) patch.commissionEnabled = Boolean(input.commissionEnabled);
  if ("acceptingNewClients" in input) {
    patch.acceptingNewClients = Boolean(input.acceptingNewClients);
  }
  if ("basePriceXlm" in input) patch.basePriceXlm = sanitizePriceString(input.basePriceXlm);
  if ("basePriceUsdc" in input) patch.basePriceUsdc = sanitizePriceString(input.basePriceUsdc);
  if ("turnaroundDaysMin" in input) {
    patch.turnaroundDaysMin = sanitizeNullableNumber(input.turnaroundDaysMin, { min: 1, max: 365 });
  }
  if ("turnaroundDaysMax" in input) {
    patch.turnaroundDaysMax = sanitizeNullableNumber(input.turnaroundDaysMax, { min: 1, max: 365 });
  }
  if ("slotsTotal" in input) patch.slotsTotal = sanitizeNullableNumber(input.slotsTotal, { min: 0, max: 999 });
  if ("slotsOpen" in input) patch.slotsOpen = sanitizeNullableNumber(input.slotsOpen, { min: 0, max: 999 });
  if ("preferredAuctionDurationHours" in input) {
    patch.preferredAuctionDurationHours = sanitizeNullableNumber(input.preferredAuctionDurationHours, {
      min: 6,
      max: 14 * 24,
    });
  }

  return patch;
}

async function ensureStoreDir() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
}

function pruneStore(store: StoreFile, now: number) {
  for (const [id, challenge] of Object.entries(store.authChallenges)) {
    if (challenge.expiresAt <= now || challenge.usedAt) {
      delete store.authChallenges[id];
    }
  }
  for (const [token, session] of Object.entries(store.authSessions)) {
    if (session.expiresAt <= now) {
      delete store.authSessions[token];
    }
  }
}

async function loadStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    const store: StoreFile = {
      profiles: parsed.profiles && typeof parsed.profiles === "object" ? parsed.profiles : {},
      authChallenges:
        parsed.authChallenges && typeof parsed.authChallenges === "object"
          ? parsed.authChallenges
          : {},
      authSessions:
        parsed.authSessions && typeof parsed.authSessions === "object" ? parsed.authSessions : {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
    pruneStore(store, Date.now());
    return store;
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

async function saveStore(store: StoreFile) {
  await ensureStoreDir();
  pruneStore(store, Date.now());
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function sortProfiles(a: ArtistProfile, b: ArtistProfile) {
  if (a.commissionEnabled !== b.commissionEnabled) {
    return a.commissionEnabled ? -1 : 1;
  }
  return b.updatedAt - a.updatedAt;
}

export async function listArtistProfiles(filters?: {
  commissionEnabled?: boolean;
  search?: string;
  style?: string;
  language?: string;
}): Promise<ArtistProfile[]> {
  const store = await loadStore();
  const search = sanitizeString(filters?.search, 120).toLowerCase();
  const style = sanitizeString(filters?.style, 40).toLowerCase();
  const language = sanitizeString(filters?.language, 40).toLowerCase();

  return Object.values(store.profiles)
    .filter((profile) => profile.visibilityStatus === "active")
    .filter((profile) =>
      filters?.commissionEnabled === undefined
        ? true
        : profile.commissionEnabled === filters.commissionEnabled,
    )
    .filter((profile) => {
      if (!search) return true;
      const haystack = [
        profile.walletAddress,
        profile.displayName,
        profile.bio,
        ...profile.languages,
        ...profile.styleTags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    })
    .filter((profile) => (style ? profile.styleTags.some((tag) => tag.toLowerCase() === style) : true))
    .filter((profile) =>
      language ? profile.languages.some((lang) => lang.toLowerCase() === language) : true,
    )
    .sort(sortProfiles);
}

export async function getArtistProfile(wallet: string): Promise<ArtistProfile | null> {
  const normalizedWallet = normalizeWalletAddress(wallet);
  if (!isValidWalletAddress(normalizedWallet)) return null;
  const store = await loadStore();
  return store.profiles[normalizedWallet] ?? null;
}

export async function getArtistProfilesByWallets(wallets: string[]): Promise<Record<string, ArtistProfile>> {
  const normalized = Array.from(
    new Set(wallets.map(normalizeWalletAddress).filter((wallet) => isValidWalletAddress(wallet))),
  );
  if (normalized.length === 0) return {};
  const store = await loadStore();
  const result: Record<string, ArtistProfile> = {};
  for (const wallet of normalized) {
    const profile = store.profiles[wallet];
    if (profile) result[wallet] = profile;
  }
  return result;
}

export async function upsertArtistProfile(
  wallet: string,
  input: ArtistProfileUpdateInput,
): Promise<ArtistProfile> {
  const normalizedWallet = normalizeWalletAddress(wallet);
  if (!isValidWalletAddress(normalizedWallet)) {
    throw new Error("Invalid wallet address");
  }

  const now = Date.now();
  const store = await loadStore();
  const previous = store.profiles[normalizedWallet] ?? createDefaultProfile(normalizedWallet, now);
  const patch = sanitizeProfilePatch(input);
  const next: ArtistProfile = {
    ...previous,
    ...patch,
    walletAddress: normalizedWallet,
    updatedAt: now,
  };

  if (next.turnaroundDaysMin && next.turnaroundDaysMax && next.turnaroundDaysMin > next.turnaroundDaysMax) {
    const temp = next.turnaroundDaysMin;
    next.turnaroundDaysMin = next.turnaroundDaysMax;
    next.turnaroundDaysMax = temp;
  }
  if (next.slotsTotal !== null && next.slotsOpen !== null && next.slotsOpen > next.slotsTotal) {
    next.slotsOpen = next.slotsTotal;
  }
  if (!next.artistEnabled) {
    next.commissionEnabled = false;
  }

  store.profiles[normalizedWallet] = next;
  await saveStore(store);
  return next;
}

export async function createArtistAuthChallenge(wallet: string): Promise<{
  wallet: string;
  challengeId: string;
  message: string;
  expiresAt: number;
}> {
  const normalizedWallet = normalizeWalletAddress(wallet);
  if (!isValidWalletAddress(normalizedWallet)) {
    throw new Error("Invalid wallet address");
  }
  const now = Date.now();
  const challengeId = randomUUID();
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = now + AUTH_CHALLENGE_TTL_MS;
  const message = [
    "Shimeji XLM Artist Profile Login",
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(now).toISOString()}`,
    `Expires At: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");

  const store = await loadStore();
  store.authChallenges[challengeId] = {
    id: challengeId,
    wallet: normalizedWallet,
    message,
    createdAt: now,
    expiresAt,
    usedAt: null,
  };
  await saveStore(store);

  return { wallet: normalizedWallet, challengeId, message, expiresAt };
}

export async function verifyArtistAuthChallenge(input: {
  wallet: string;
  challengeId: string;
  signedMessage: string;
  signerAddress?: string | null;
}): Promise<{
  wallet: string;
  sessionToken: string;
  expiresAt: number;
  verificationMode: "mvp_unverified_signature";
}> {
  const wallet = normalizeWalletAddress(input.wallet);
  if (!isValidWalletAddress(wallet)) {
    throw new Error("Invalid wallet address");
  }
  const challengeId = sanitizeString(input.challengeId, 120);
  const signedMessage = sanitizeString(input.signedMessage, 5000);
  const signerAddress = input.signerAddress ? normalizeWalletAddress(input.signerAddress) : null;

  if (!challengeId || !signedMessage) {
    throw new Error("Missing signature payload");
  }
  if (signerAddress && signerAddress !== wallet) {
    throw new Error("Signer wallet does not match requested wallet");
  }

  const now = Date.now();
  const store = await loadStore();
  const challenge = store.authChallenges[challengeId];
  if (!challenge || challenge.wallet !== wallet) {
    throw new Error("Challenge not found");
  }
  if (challenge.usedAt) {
    throw new Error("Challenge already used");
  }
  if (challenge.expiresAt <= now) {
    throw new Error("Challenge expired");
  }

  // MVP note: we persist the signed payload but do not cryptographically verify SEP-43 signatures yet.
  // The frontend signs through the active wallet, and server-side verification can be hardened later.
  challenge.usedAt = now;

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = now + AUTH_SESSION_TTL_MS;
  store.authSessions[sessionToken] = {
    token: sessionToken,
    wallet,
    createdAt: now,
    expiresAt,
    verificationMode: "mvp_unverified_signature",
  };

  if (!store.profiles[wallet]) {
    store.profiles[wallet] = createDefaultProfile(wallet, now);
  }
  await saveStore(store);

  return {
    wallet,
    sessionToken,
    expiresAt,
    verificationMode: "mvp_unverified_signature",
  };
}

export async function validateArtistSession(wallet: string, sessionToken: string): Promise<boolean> {
  const normalizedWallet = normalizeWalletAddress(wallet);
  const token = sanitizeString(sessionToken, 256);
  if (!isValidWalletAddress(normalizedWallet) || !token) return false;
  const store = await loadStore();
  const session = store.authSessions[token];
  if (!session) return false;
  if (session.wallet !== normalizedWallet) return false;
  if (session.expiresAt <= Date.now()) return false;
  return true;
}

export async function createMarketplaceReport(input: {
  targetType: "artist_profile" | "listing";
  targetId: string;
  reporterWallet?: string | null;
  reason: string;
  details?: string;
}): Promise<MarketplaceReportRecord> {
  const targetId = sanitizeString(input.targetId, 120);
  const reason = sanitizeString(input.reason, MAX_REPORT_REASON);
  const details = sanitizeString(input.details, MAX_REPORT_DETAILS);
  const reporterWallet = input.reporterWallet ? normalizeWalletAddress(input.reporterWallet) : null;

  if (!targetId) throw new Error("Missing targetId");
  if (!reason) throw new Error("Missing reason");
  if (reporterWallet && !isValidWalletAddress(reporterWallet)) {
    throw new Error("Invalid reporter wallet");
  }

  const now = Date.now();
  const record: MarketplaceReportRecord = {
    id: randomUUID(),
    targetType: input.targetType,
    targetId,
    reporterWallet,
    reason,
    details,
    createdAt: now,
  };

  const store = await loadStore();
  store.reports = [record, ...store.reports].slice(0, 5000);

  if (input.targetType === "artist_profile" && isValidWalletAddress(targetId)) {
    const wallet = normalizeWalletAddress(targetId);
    const existing = store.profiles[wallet];
    if (existing) {
      store.profiles[wallet] = {
        ...existing,
        reportCount: existing.reportCount + 1,
        updatedAt: now,
      };
    }
  }

  await saveStore(store);
  return record;
}
