export type SiteShimejiChatBubbleStyle = "glass" | "solid" | "dark";
export type SiteShimejiChatFontSize = "small" | "medium" | "large";
export type SiteShimejiChatWidthPreset = "small" | "medium" | "large";

export type SiteShimejiChatThemePreset = {
  id:
    | "pastel"
    | "pink"
    | "kawaii"
    | "mint"
    | "ocean"
    | "neural"
    | "cyberpunk"
    | "noir-rose"
    | "midnight"
    | "ember";
  labelEn: string;
  labelEs: string;
  theme: string;
  bg: string;
  bubble: SiteShimejiChatBubbleStyle;
};

export type SiteShimejiChatThemePresetId = SiteShimejiChatThemePreset["id"] | "custom" | "random";

export const SITE_SHIMEJI_CHAT_THEMES: SiteShimejiChatThemePreset[] = [
  { id: "pastel", labelEn: "Pastel", labelEs: "Pastel", theme: "#3b1a77", bg: "#f0e8ff", bubble: "glass" },
  { id: "pink", labelEn: "Pink", labelEs: "Rosa", theme: "#7a124b", bg: "#ffd2ea", bubble: "glass" },
  { id: "kawaii", labelEn: "Kawaii", labelEs: "Kawaii", theme: "#5b1456", bg: "#ffd8f0", bubble: "glass" },
  { id: "mint", labelEn: "Mint", labelEs: "Menta", theme: "#0f5f54", bg: "#c7fff0", bubble: "glass" },
  { id: "ocean", labelEn: "Ocean", labelEs: "Océano", theme: "#103a7a", bg: "#cfe6ff", bubble: "glass" },
  { id: "neural", labelEn: "Neural", labelEs: "Neural", theme: "#86f0ff", bg: "#0b0d1f", bubble: "dark" },
  { id: "cyberpunk", labelEn: "Cyberpunk", labelEs: "Cyberpunk", theme: "#19d3ff", bg: "#0a0830", bubble: "dark" },
  { id: "noir-rose", labelEn: "Noir Rose", labelEs: "Noir Rosa", theme: "#ff5fbf", bg: "#0b0717", bubble: "dark" },
  { id: "midnight", labelEn: "Midnight", labelEs: "Medianoche", theme: "#7aa7ff", bg: "#0b1220", bubble: "dark" },
  { id: "ember", labelEn: "Ember", labelEs: "Brasas", theme: "#ff8b3d", bg: "#1a0c08", bubble: "dark" },
];

export const SITE_SHIMEJI_CHAT_FONT_SIZE_MAP: Record<SiteShimejiChatFontSize, number> = {
  small: 11,
  medium: 13,
  large: 15,
};

export const SITE_SHIMEJI_CHAT_WIDTH_MAP: Record<SiteShimejiChatWidthPreset, number> = {
  small: 220,
  medium: 280,
  large: 360,
};

export const SITE_SHIMEJI_CHAT_MIN_WIDTH_PX = 220;
export const SITE_SHIMEJI_CHAT_MIN_HEIGHT_PX = 160;
export const SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX = 320;
export const SITE_SHIMEJI_CHAT_RESIZE_EDGE_PX = 10;

export function pickRandomSiteShimejiChatTheme() {
  return SITE_SHIMEJI_CHAT_THEMES[Math.floor(Math.random() * SITE_SHIMEJI_CHAT_THEMES.length)];
}

export function getSiteShimejiChatThemePresetById(id: string) {
  return SITE_SHIMEJI_CHAT_THEMES.find((theme) => theme.id === id) ?? null;
}

