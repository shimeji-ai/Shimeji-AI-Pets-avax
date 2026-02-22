"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SiteShimejiProviderKind = "site" | "openrouter" | "ollama" | "openclaw";

export type SiteShimejiCharacterOption = {
  key: string;
  label: string;
  iconUrl: string;
};

export type SiteShimejiPersonalityOption = {
  key: string;
  label: string;
  prompt: string;
};

export type SiteShimejiCatalog = {
  characters: SiteShimejiCharacterOption[];
  personalities: SiteShimejiPersonalityOption[];
  freeSiteMessageLimit: number;
};

export type SiteShimejiConfig = {
  enabled: boolean;
  character: string;
  personality: string;
  sizePercent: number;
  provider: SiteShimejiProviderKind;
  openrouterApiKey: string;
  openrouterModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  openclawGatewayUrl: string;
  openclawGatewayToken: string;
  openclawAgentName: string;
};

type SiteShimejiContextValue = {
  config: SiteShimejiConfig;
  updateConfig: (next: Partial<SiteShimejiConfig>) => void;
  resetConfig: () => void;
  isConfigOpen: boolean;
  openConfig: () => void;
  closeConfig: () => void;
  toggleConfig: () => void;
  catalog: SiteShimejiCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  reloadCatalog: () => Promise<void>;
  freeSiteMessagesUsed: number;
  incrementFreeSiteMessagesUsed: () => void;
  resetFreeSiteMessagesUsed: () => void;
  freeSiteMessagesRemaining: number | null;
  canUseCurrentProvider: boolean;
};

const SITE_SHIMEJI_CONFIG_STORAGE_KEY = "site-shimeji-config-v1";
const SITE_SHIMEJI_CREDITS_STORAGE_KEY = "site-shimeji-free-messages-used-v1";

const DEFAULT_FREE_SITE_MESSAGE_LIMIT = 4;

const DEFAULT_CONFIG: SiteShimejiConfig = {
  enabled: true,
  character: "shimeji",
  personality: "cozy",
  sizePercent: 100,
  provider: "openrouter",
  openrouterApiKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "gemma3:1b",
  openclawGatewayUrl: "ws://127.0.0.1:18789",
  openclawGatewayToken: "",
  openclawAgentName: "web-shimeji-1",
};

const SiteShimejiContext = createContext<SiteShimejiContextValue | undefined>(
  undefined,
);

function clampSizePercent(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : DEFAULT_CONFIG.sizePercent;
  if (!Number.isFinite(numeric)) return DEFAULT_CONFIG.sizePercent;
  return Math.max(60, Math.min(180, Math.round(numeric)));
}

function sanitizeString(value: unknown, fallback = "", maxLength = 256): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maxLength);
}

function sanitizeConfig(input: unknown): SiteShimejiConfig {
  if (!input || typeof input !== "object") return DEFAULT_CONFIG;
  const raw = input as Partial<SiteShimejiConfig>;
  const provider: SiteShimejiProviderKind =
    raw.provider === "openrouter" ||
    raw.provider === "ollama" ||
    raw.provider === "openclaw" ||
    raw.provider === "site"
      ? raw.provider
      : DEFAULT_CONFIG.provider;

  return {
    enabled: true,
    character: sanitizeString(raw.character, DEFAULT_CONFIG.character, 64) || DEFAULT_CONFIG.character,
    personality:
      sanitizeString(raw.personality, DEFAULT_CONFIG.personality, 64) || DEFAULT_CONFIG.personality,
    sizePercent: clampSizePercent(raw.sizePercent),
    provider,
    openrouterApiKey: sanitizeString(raw.openrouterApiKey, "", 600),
    openrouterModel:
      sanitizeString(raw.openrouterModel, DEFAULT_CONFIG.openrouterModel, 120) ||
      DEFAULT_CONFIG.openrouterModel,
    ollamaUrl:
      sanitizeString(raw.ollamaUrl, DEFAULT_CONFIG.ollamaUrl, 300) || DEFAULT_CONFIG.ollamaUrl,
    ollamaModel:
      sanitizeString(raw.ollamaModel, DEFAULT_CONFIG.ollamaModel, 120) || DEFAULT_CONFIG.ollamaModel,
    openclawGatewayUrl:
      sanitizeString(raw.openclawGatewayUrl, DEFAULT_CONFIG.openclawGatewayUrl, 300) ||
      DEFAULT_CONFIG.openclawGatewayUrl,
    openclawGatewayToken: sanitizeString(raw.openclawGatewayToken, "", 600),
    openclawAgentName:
      sanitizeString(raw.openclawAgentName, DEFAULT_CONFIG.openclawAgentName, 32) ||
      DEFAULT_CONFIG.openclawAgentName,
  };
}

function canUseProvider(config: SiteShimejiConfig, freeSiteMessagesRemaining: number | null): boolean {
  if (config.provider === "site") {
    return freeSiteMessagesRemaining === null || freeSiteMessagesRemaining > 0;
  }
  if (config.provider === "openrouter") {
    return Boolean(config.openrouterApiKey.trim());
  }
  if (config.provider === "ollama") {
    return Boolean(config.ollamaUrl.trim() && config.ollamaModel.trim());
  }
  return Boolean(
    config.openclawGatewayUrl.trim() &&
      config.openclawGatewayToken.trim() &&
      config.openclawAgentName.trim(),
  );
}

export function SiteShimejiProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteShimejiConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [catalog, setCatalog] = useState<SiteShimejiCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [freeSiteMessagesUsed, setFreeSiteMessagesUsed] = useState(0);

  useEffect(() => {
    try {
      const rawConfig = localStorage.getItem(SITE_SHIMEJI_CONFIG_STORAGE_KEY);
      if (rawConfig) {
        setConfig(sanitizeConfig(JSON.parse(rawConfig)));
      }
    } catch {
      setConfig(DEFAULT_CONFIG);
    }

    try {
      const rawCredits = localStorage.getItem(SITE_SHIMEJI_CREDITS_STORAGE_KEY);
      const parsed = Number(rawCredits);
      if (Number.isFinite(parsed) && parsed >= 0) {
        setFreeSiteMessagesUsed(Math.floor(parsed));
      }
    } catch {
      setFreeSiteMessagesUsed(0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SITE_SHIMEJI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(SITE_SHIMEJI_CREDITS_STORAGE_KEY, String(freeSiteMessagesUsed));
  }, [freeSiteMessagesUsed]);

  async function reloadCatalog() {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch("/api/site-shimeji/catalog", { cache: "no-store" });
      const json = (await response.json()) as Partial<SiteShimejiCatalog> & { error?: string };
      if (!response.ok || !json || !Array.isArray(json.characters) || !Array.isArray(json.personalities)) {
        throw new Error(json?.error || "Failed to load site shimeji catalog.");
      }
      const nextCatalog: SiteShimejiCatalog = {
        characters: json.characters as SiteShimejiCharacterOption[],
        personalities: json.personalities as SiteShimejiPersonalityOption[],
        freeSiteMessageLimit:
          typeof json.freeSiteMessageLimit === "number"
            ? json.freeSiteMessageLimit
            : DEFAULT_FREE_SITE_MESSAGE_LIMIT,
      };
      setCatalog(nextCatalog);

      setConfig((prev) => {
        const hasCharacter = nextCatalog.characters.some((entry) => entry.key === prev.character);
        const hasPersonality = nextCatalog.personalities.some(
          (entry) => entry.key === prev.personality,
        );
        if (hasCharacter && hasPersonality) return prev;
        return {
          ...prev,
          character: hasCharacter ? prev.character : nextCatalog.characters[0]?.key || DEFAULT_CONFIG.character,
          personality: hasPersonality
            ? prev.personality
            : nextCatalog.personalities[0]?.key || DEFAULT_CONFIG.personality,
        };
      });
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Failed to load catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    reloadCatalog().catch(() => undefined);
  }, []);

  const freeSiteMessagesRemaining = useMemo(() => {
    const limit = catalog?.freeSiteMessageLimit ?? DEFAULT_FREE_SITE_MESSAGE_LIMIT;
    return Math.max(0, limit - freeSiteMessagesUsed);
  }, [catalog?.freeSiteMessageLimit, freeSiteMessagesUsed]);

  const value = useMemo<SiteShimejiContextValue>(
    () => ({
      config,
      updateConfig: (next) => {
        setConfig((prev) => sanitizeConfig({ ...prev, ...next, enabled: true }));
      },
      resetConfig: () => setConfig(DEFAULT_CONFIG),
      isConfigOpen,
      openConfig: () => setIsConfigOpen(true),
      closeConfig: () => setIsConfigOpen(false),
      toggleConfig: () => setIsConfigOpen((prev) => !prev),
      catalog,
      catalogLoading,
      catalogError,
      reloadCatalog,
      freeSiteMessagesUsed,
      incrementFreeSiteMessagesUsed: () => setFreeSiteMessagesUsed((prev) => prev + 1),
      resetFreeSiteMessagesUsed: () => setFreeSiteMessagesUsed(0),
      freeSiteMessagesRemaining,
      canUseCurrentProvider: canUseProvider(config, freeSiteMessagesRemaining),
    }),
    [
      catalog,
      catalogError,
      catalogLoading,
      config,
      freeSiteMessagesRemaining,
      freeSiteMessagesUsed,
      isConfigOpen,
    ],
  );

  return (
    <SiteShimejiContext.Provider value={value}>
      {children}
    </SiteShimejiContext.Provider>
  );
}

export function useSiteShimeji() {
  const context = useContext(SiteShimejiContext);
  if (!context) {
    throw new Error("useSiteShimeji must be used within a SiteShimejiProvider");
  }
  return context;
}
