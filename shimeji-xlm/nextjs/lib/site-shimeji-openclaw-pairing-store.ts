import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  normalizeOpenClawGatewayUrl,
  sanitizeOpenClawAgentName,
} from "@/lib/site-shimeji-openclaw-protocol";

const STORE_FILE_PATH =
  process.env.OPENCLAW_PAIRING_STORE_FILE || "/tmp/site-shimeji-openclaw-pairings.json";
const DEFAULT_PAIRING_TTL_SECONDS = 10 * 60;
const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type PairingRecord = {
  code: string;
  createdAtMs: number;
  expiresAtMs: number;
  gatewayUrl: string;
  gatewayTokenEnc: string;
  agentName: string;
  maxClaims: number;
  claimsUsed: number;
};

type SessionRecord = {
  tokenHash: string;
  createdAtMs: number;
  expiresAtMs: number;
  gatewayUrl: string;
  gatewayTokenEnc: string;
  agentName: string;
};

type StoreData = {
  version: 1;
  pairings: Record<string, PairingRecord>;
  sessions: Record<string, SessionRecord>;
};

type ClaimFailReason = "invalid_code" | "expired_code" | "max_claims_reached";
type ResolveSessionFailReason = "invalid_session" | "expired_session";

export type PairingClaimResult =
  | {
      ok: true;
      sessionToken: string;
      sessionExpiresAt: string;
      agentName: string;
    }
  | {
      ok: false;
      reason: ClaimFailReason;
    };

export type ResolveSessionResult =
  | {
      ok: true;
      gatewayUrl: string;
      gatewayToken: string;
      agentName: string;
      sessionExpiresAt: string;
    }
  | {
      ok: false;
      reason: ResolveSessionFailReason;
    };

let storeWriteQueue: Promise<void> = Promise.resolve();

function createEmptyStore(): StoreData {
  return { version: 1, pairings: {}, sessions: {} };
}

function toIso(ts: number): string {
  return new Date(ts).toISOString();
}

function clampInt(input: unknown, fallback: number, min: number, max: number): number {
  const numeric =
    typeof input === "number" ? input : typeof input === "string" ? Number(input) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function sanitizeToken(input: unknown, maxLength = 1600): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

function getCryptoSecret(): string {
  return (
    process.env.OPENCLAW_PAIRING_SECRET ||
    process.env.SUBSCRIBE_SIGNING_SECRET ||
    "dev-openclaw-pairing-secret"
  );
}

function deriveKey(): string {
  return crypto.createHash("sha256").update(getCryptoSecret()).digest("hex").slice(0, 32);
}

function encryptSensitive(value: string): string {
  const iv = Uint8Array.from(crypto.randomBytes(12));
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = `${cipher.update(value, "utf8", "base64url")}${cipher.final("base64url")}`;
  const tag = cipher.getAuthTag().toString("base64url");
  return `${Buffer.from(iv).toString("base64url")}.${tag}.${encrypted}`;
}

function decryptSensitive(payload: string): string {
  const [ivRaw, tagRaw, cipherRaw] = String(payload || "").split(".");
  if (!ivRaw || !tagRaw || !cipherRaw) {
    throw new Error("OPENCLAW_PAIRING_DECRYPT_INVALID_PAYLOAD");
  }
  const iv = Uint8Array.from(Buffer.from(ivRaw, "base64url"));
  const tag = Uint8Array.from(Buffer.from(tagRaw, "base64url"));
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveKey(),
    iv,
  );
  decipher.setAuthTag(tag);
  return `${decipher.update(cipherRaw, "base64url", "utf8")}${decipher.final("utf8")}`;
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function randomSessionToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(STORE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    if (!parsed || typeof parsed !== "object") return createEmptyStore();
    return {
      version: 1,
      pairings: parsed.pairings && typeof parsed.pairings === "object" ? parsed.pairings : {},
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeStore(data: StoreData): Promise<void> {
  const dir = path.dirname(STORE_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${STORE_FILE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data), "utf8");
  await fs.rename(tmpPath, STORE_FILE_PATH);
}

function pruneExpiredRecords(store: StoreData, nowMs: number): void {
  for (const [code, pairing] of Object.entries(store.pairings)) {
    if (!pairing || pairing.expiresAtMs <= nowMs || pairing.claimsUsed >= pairing.maxClaims) {
      delete store.pairings[code];
    }
  }

  for (const [tokenHash, session] of Object.entries(store.sessions)) {
    if (!session || session.expiresAtMs <= nowMs) {
      delete store.sessions[tokenHash];
    }
  }
}

function withStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = storeWriteQueue.then(operation, operation);
  storeWriteQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function createOpenClawPairingCode(args: {
  gatewayUrl: string;
  gatewayToken: string;
  agentName?: string;
  ttlSeconds?: number;
  maxClaims?: number;
}): Promise<{ code: string; expiresAt: string; agentName: string }> {
  const gatewayUrl = normalizeOpenClawGatewayUrl(args.gatewayUrl);
  const gatewayToken = sanitizeToken(args.gatewayToken);
  if (!gatewayToken) {
    throw new Error("OPENCLAW_MISSING_TOKEN");
  }
  const agentName = sanitizeOpenClawAgentName(args.agentName, "web-shimeji-1");
  const ttlSeconds = clampInt(args.ttlSeconds, DEFAULT_PAIRING_TTL_SECONDS, 60, 24 * 60 * 60);
  const maxClaims = clampInt(args.maxClaims, 1, 1, 25);

  return withStoreLock(async () => {
    const now = Date.now();
    const expiresAtMs = now + ttlSeconds * 1000;
    const store = await readStore();
    pruneExpiredRecords(store, now);

    let code = randomCode(8);
    for (let i = 0; i < 10 && store.pairings[code]; i += 1) {
      code = randomCode(8);
    }

    store.pairings[code] = {
      code,
      createdAtMs: now,
      expiresAtMs,
      gatewayUrl,
      gatewayTokenEnc: encryptSensitive(gatewayToken),
      agentName,
      maxClaims,
      claimsUsed: 0,
    };

    await writeStore(store);
    return { code, expiresAt: toIso(expiresAtMs), agentName };
  });
}

export async function claimOpenClawPairingCode(args: {
  code: string;
  sessionTtlSeconds?: number;
}): Promise<PairingClaimResult> {
  const rawCode =
    typeof args.code === "string"
      ? args.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)
      : "";
  if (!rawCode) {
    return { ok: false, reason: "invalid_code" };
  }

  const sessionTtlSeconds = clampInt(
    args.sessionTtlSeconds,
    DEFAULT_SESSION_TTL_SECONDS,
    300,
    60 * 24 * 60 * 60,
  );

  return withStoreLock(async () => {
    const now = Date.now();
    const store = await readStore();
    pruneExpiredRecords(store, now);

    const pairing = store.pairings[rawCode];
    if (!pairing) {
      await writeStore(store);
      return { ok: false, reason: "invalid_code" };
    }

    if (pairing.expiresAtMs <= now) {
      delete store.pairings[rawCode];
      await writeStore(store);
      return { ok: false, reason: "expired_code" };
    }

    if (pairing.claimsUsed >= pairing.maxClaims) {
      delete store.pairings[rawCode];
      await writeStore(store);
      return { ok: false, reason: "max_claims_reached" };
    }

    pairing.claimsUsed += 1;
    if (pairing.claimsUsed >= pairing.maxClaims) {
      delete store.pairings[rawCode];
    } else {
      store.pairings[rawCode] = pairing;
    }

    const sessionToken = randomSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAtMs = now + sessionTtlSeconds * 1000;

    store.sessions[tokenHash] = {
      tokenHash,
      createdAtMs: now,
      expiresAtMs,
      gatewayUrl: pairing.gatewayUrl,
      gatewayTokenEnc: pairing.gatewayTokenEnc,
      agentName: pairing.agentName,
    };

    await writeStore(store);
    return {
      ok: true,
      sessionToken,
      sessionExpiresAt: toIso(expiresAtMs),
      agentName: pairing.agentName,
    };
  });
}

export async function resolveOpenClawPairingSession(sessionToken: string): Promise<ResolveSessionResult> {
  const token = sanitizeToken(sessionToken, 2048);
  if (!token) {
    return { ok: false, reason: "invalid_session" };
  }

  return withStoreLock(async () => {
    const now = Date.now();
    const store = await readStore();
    pruneExpiredRecords(store, now);

    const tokenHash = hashSessionToken(token);
    const session = store.sessions[tokenHash];
    if (!session) {
      await writeStore(store);
      return { ok: false, reason: "invalid_session" };
    }

    if (session.expiresAtMs <= now) {
      delete store.sessions[tokenHash];
      await writeStore(store);
      return { ok: false, reason: "expired_session" };
    }

    let gatewayToken = "";
    try {
      gatewayToken = decryptSensitive(session.gatewayTokenEnc);
    } catch {
      delete store.sessions[tokenHash];
      await writeStore(store);
      return { ok: false, reason: "invalid_session" };
    }

    await writeStore(store);
    return {
      ok: true,
      gatewayUrl: session.gatewayUrl,
      gatewayToken,
      agentName: session.agentName,
      sessionExpiresAt: toIso(session.expiresAtMs),
    };
  });
}
