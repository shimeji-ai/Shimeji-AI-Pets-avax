export const ANIMATION_GUIDE_PATH = "/animation-guide";
export const CHARACTER_CREATOR_PATH = "/marketplace#create-character-app";

export const REQUIRED_SHIMEJI_SPRITES = [
  "stand-neutral.png",
  "walk-step-left.png",
  "walk-step-right.png",
  "fall.png",
  "bounce-squish.png",
  "bounce-recover.png",
  "jump.png",
  "dragged-tilt-left-light.png",
  "dragged-tilt-right-light.png",
  "dragged-tilt-left-heavy.png",
  "dragged-tilt-right-heavy.png",
  "resist-frame-1.png",
  "resist-frame-2.png",
  "grab-wall.png",
  "climb-wall-frame-1.png",
  "climb-wall-frame-2.png",
  "grab-ceiling.png",
  "climb-ceiling-frame-1.png",
  "climb-ceiling-frame-2.png",
  "sit.png",
  "sit-look-up.png",
  "sprawl-lying.png",
  "crawl-crouch.png",
  "sit-edge-legs-up.png",
  "sit-edge-legs-down.png",
  "sit-edge-dangle-frame-1.png",
  "sit-edge-dangle-frame-2.png",
  "spin-head-frame-1.png",
  "spin-head-frame-2.png",
  "spin-head-frame-3.png",
  "spin-head-frame-4.png",
  "spin-head-frame-5.png",
  "spin-head-frame-6.png",
  "icon.png",
].sort();

export const PREVIEW_ANIMATION_SETS = {
  walk: [
    "stand-neutral.png",
    "walk-step-left.png",
    "stand-neutral.png",
    "walk-step-right.png",
  ],
  jump: [
    "jump.png",
    "fall.png",
    "bounce-squish.png",
    "bounce-recover.png",
    "stand-neutral.png",
  ],
  wall: [
    "grab-wall.png",
    "climb-wall-frame-1.png",
    "climb-wall-frame-2.png",
    "grab-wall.png",
  ],
  ceiling: [
    "grab-ceiling.png",
    "climb-ceiling-frame-1.png",
    "climb-ceiling-frame-2.png",
    "grab-ceiling.png",
  ],
  idle: [
    "sit.png",
    "sit-look-up.png",
    "spin-head-frame-1.png",
    "spin-head-frame-4.png",
    "spin-head-frame-2.png",
    "spin-head-frame-5.png",
    "spin-head-frame-3.png",
    "spin-head-frame-6.png",
    "sit.png",
  ],
} as const;

export type PreviewAnimationKey = keyof typeof PREVIEW_ANIMATION_SETS;

export function normalizeSpriteFileName(value: string) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim()
    .toLowerCase() || "";
}

export function collectSpriteFileNames(paths: string[]) {
  return Array.from(
    new Set(
      paths
        .map((entry) => normalizeSpriteFileName(entry))
        .filter(Boolean),
    ),
  ).sort();
}

export function findMissingRequiredSprites(paths: string[]) {
  const available = new Set(collectSpriteFileNames(paths));
  return REQUIRED_SHIMEJI_SPRITES.filter((fileName) => !available.has(fileName));
}

export function animationReferenceSpriteUrl(fileName: string) {
  const safeName = encodeURIComponent(normalizeSpriteFileName(fileName));
  return `https://raw.githubusercontent.com/shimeji-ai/Shimeji-AI-Pets-avax/main/animation-reference/runtime-required/${safeName}`;
}
