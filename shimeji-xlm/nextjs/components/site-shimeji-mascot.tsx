"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";
import { buildSiteShimejiChatMessages } from "@/lib/site-shimeji-chat";
import { getSiteShimejiPersonalityDisplayLabel } from "@/lib/site-shimeji-personality-labels";
import {
  formatSiteShimejiProviderError,
  sendOllamaBrowserChat,
} from "@/lib/site-shimeji-browser-providers";
import {
  SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX,
  SITE_SHIMEJI_CHAT_FONT_SIZE_MAP,
  SITE_SHIMEJI_CHAT_MIN_HEIGHT_PX,
  SITE_SHIMEJI_CHAT_MIN_WIDTH_PX,
  SITE_SHIMEJI_CHAT_RESIZE_EDGE_PX,
  SITE_SHIMEJI_CHAT_THEMES,
  SITE_SHIMEJI_CHAT_WIDTH_MAP,
  pickRandomSiteShimejiChatTheme,
} from "@/lib/site-shimeji-chat-ui";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string; ctaHref?: string; ctaLabel?: string };
type VoiceStatusTone = "info" | "error";
type BubbleResizeCursor = "" | "w-resize" | "e-resize" | "n-resize" | "nw-resize" | "ne-resize";

type BrowserSpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getSpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const maybeCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return typeof maybeCtor === "function" ? maybeCtor : null;
}

function getSpeechLocale(language: string) {
  return language === "es" ? "es-ES" : "en-US";
}

const SPRITE_SIZE = 72;
const EDGE_MARGIN = 0;
const GRAVITY = 980;
const WALK_SPEED = 76;
const CLIMB_SPEED = 76;
const FALL_START_Y = -SPRITE_SIZE;
const SPARKLE_DURATION = 380;
const MOBILE_BREAKPOINT = 768;
const CHAT_GAP = 12;
const MASCOT_HINT_TEXT = "🐱 Click me";
const WALK_PAUSE_MIN_MS = 650;
const WALK_PAUSE_MAX_MS = 1800;
const WALK_SEGMENT_MIN_MS = 1400;
const WALK_SEGMENT_MAX_MS = 3400;
const WALK_PAUSE_REVERSE_CHANCE = 0.35;

type Edge = "bottom" | "right" | "top" | "left";
type MascotState = "falling" | "floor-walking" | "wall-climbing" | "ceiling-walking";
type WallSide = "left" | "right";

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  pos: { x: number; y: number };
};

type WanderPauseState = {
  nextPauseAt: number;
  pauseUntil: number;
  lastMovementState: MascotState | null;
};

type BubbleResizeState = {
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
  left: boolean;
  right: boolean;
  top: boolean;
};

function getBoundsFromWindow(spriteScale = 1) {
  // Use visualViewport for mobile to account for address bar
  const vw = (window as any).visualViewport;
  const winWidth = Math.floor(vw?.width || window.innerWidth);
  const winHeight = Math.floor(vw?.height || window.innerHeight);
  const scaledSpriteSize = SPRITE_SIZE * spriteScale;
  // Actor is visually scaled from its center, so bounds need to include the overhang.
  const scaleOffset = (scaledSpriteSize - SPRITE_SIZE) / 2;
  const minX = EDGE_MARGIN + scaleOffset;
  const minY = EDGE_MARGIN + scaleOffset;
  const maxX = Math.max(minX, winWidth - SPRITE_SIZE - EDGE_MARGIN - scaleOffset);
  const maxY = Math.max(minY, winHeight - SPRITE_SIZE - EDGE_MARGIN - scaleOffset);
  return { minX, maxX, minY, maxY };
}

function clampToMotionBounds(
  x: number,
  y: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
) {
  return { x: clamp(x, bounds.minX, bounds.maxX), y: clamp(y, FALL_START_Y, bounds.maxY) };
}

function getViewportSize() {
  const vv = (window as any).visualViewport;
  return {
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
  };
}

function getNearestEdge(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  x: number,
  y: number,
): Edge {
  const distances: Array<{ edge: Edge; value: number }> = [
    { edge: "bottom", value: Math.abs(y - bounds.maxY) },
    { edge: "right", value: Math.abs(x - bounds.maxX) },
    { edge: "top", value: Math.abs(y - bounds.minY) },
    { edge: "left", value: Math.abs(x - bounds.minX) },
  ];
  distances.sort((a, b) => a.value - b.value);
  return distances[0].edge;
}

function buildSpriteSrc(characterKey: string, fileName: string) {
  return `/api/site-shimeji/sprite/${encodeURIComponent(characterKey)}/${encodeURIComponent(fileName)}`;
}

export function SiteShimejiMascot() {
  const { isSpanish, language } = useLanguage();
  const {
    config,
    catalog,
    freeSiteMessagesRemaining,
    incrementFreeSiteMessagesUsed,
    canUseCurrentProvider,
    updateConfig,
    openConfig,
  } = useSiteShimeji();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const isSpanishRef = useRef(isSpanish);
  useEffect(() => {
    isSpanishRef.current = isSpanish;
  }, [isSpanish]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
    const el = messagesListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [hasMascotBeenClicked, setHasMascotBeenClicked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceStatusTone, setVoiceStatusTone] = useState<VoiceStatusTone>("info");
  const [speechInputSupported, setSpeechInputSupported] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const ttsRequestSeqRef = useRef(0);

  const currentPosRef = useRef({ x: 0, y: 0 });
  const movementStateRef = useRef<MascotState>("falling");
  const wallSideRef = useRef<WallSide>("right");
  const floorDirRef = useRef<1 | -1>(Math.random() < 0.5 ? -1 : 1);
  const ceilingDirRef = useRef<1 | -1>(1);
  const fallVelocityRef = useRef(0);
  const wanderPauseRef = useRef<WanderPauseState>({
    nextPauseAt: 0,
    pauseUntil: 0,
    lastMovementState: null,
  });
  const phaseRef = useRef<"auto" | "held">("auto");
  const dragStateRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const blockClickRef = useRef(false);
  const jumpTimeoutRef = useRef<number | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const bubbleRectRef = useRef({ left: 8, top: 8 });
  const bubbleResizeStateRef = useRef<BubbleResizeState | null>(null);
  const bubbleIsResizingRef = useRef(false);
  const spriteScaleRef = useRef(config.sizePercent / 100);
  const [bubbleCursor, setBubbleCursor] = useState<BubbleResizeCursor>("");
  useEffect(() => {
    spriteScaleRef.current = clamp(config.sizePercent / 100, 0.6, 1.8);
  }, [config.sizePercent]);

  useEffect(() => {
    setSpeechInputSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (!openRef.current) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (actorRef.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // External trigger: dispatch window event 'shimeji:open-chat' to open and greet
  useEffect(() => {
    function handleOpenChat() {
      if (!config.enabled) return;
      setOpen(true);
      setHasMascotBeenClicked(true);
      setMessages((prev) => {
        if (prev.length) return prev;
        const hello = isSpanishRef.current
          ? "¡Hola! Soy tu Shimeji. Estoy listo para chatear, ¿en qué puedo ayudarte?"
          : "Hi! I'm your Shimeji assistant. Ready to chat — what can I help you with?";
        return [{ role: "assistant", content: hello }];
      });
    }
    window.addEventListener("shimeji:open-chat", handleOpenChat);
    return () => window.removeEventListener("shimeji:open-chat", handleOpenChat);
  }, [config.enabled]);

  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current) {
        window.clearTimeout(jumpTimeoutRef.current);
      }
    };
  }, []);

  const frames = useMemo(
    () => ({
      stand: buildSpriteSrc(config.character, "stand-neutral.png"),
      walk: [
        buildSpriteSrc(config.character, "walk-step-left.png"),
        buildSpriteSrc(config.character, "stand-neutral.png"),
        buildSpriteSrc(config.character, "walk-step-right.png"),
        buildSpriteSrc(config.character, "stand-neutral.png"),
      ],
      wallClimb: [
        buildSpriteSrc(config.character, "grab-wall.png"),
        buildSpriteSrc(config.character, "climb-wall-frame-1.png"),
        buildSpriteSrc(config.character, "grab-wall.png"),
        buildSpriteSrc(config.character, "climb-wall-frame-2.png"),
      ],
      ceilingWalk: [
        buildSpriteSrc(config.character, "grab-ceiling.png"),
        buildSpriteSrc(config.character, "climb-ceiling-frame-1.png"),
        buildSpriteSrc(config.character, "grab-ceiling.png"),
        buildSpriteSrc(config.character, "climb-ceiling-frame-2.png"),
      ],
      usingComputer: [
        buildSpriteSrc(config.character, "sit-pc-edge-legs-down.png"),
        buildSpriteSrc(config.character, "sit-pc-edge-dangle-frame-1.png"),
        buildSpriteSrc(config.character, "sit-pc-edge-dangle-frame-2.png"),
      ],
    }),
    [config.character],
  );

  const triggerJumpBurst = () => {
    setIsJumping(true);
    if (jumpTimeoutRef.current) {
      window.clearTimeout(jumpTimeoutRef.current);
    }
    jumpTimeoutRef.current = window.setTimeout(() => {
      setIsJumping(false);
    }, SPARKLE_DURATION);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    actorRef.current?.setPointerCapture(event.pointerId);
    isDraggingRef.current = false;
    blockClickRef.current = false;
    const { x: currX, y: currY } = currentPosRef.current;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - currX,
      offsetY: event.clientY - currY,
      pos: { x: currX, y: currY },
    };
    wanderPauseRef.current.nextPauseAt = 0;
    wanderPauseRef.current.pauseUntil = 0;
    wanderPauseRef.current.lastMovementState = null;
    phaseRef.current = "held";
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const bounds = getBoundsFromWindow(spriteScaleRef.current);
      const next = clampToMotionBounds(event.clientX - drag.offsetX, event.clientY - drag.offsetY, bounds);
      drag.pos = next;
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        blockClickRef.current = true;
      }
      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      blockClickRef.current = wasDragging;
      dragStateRef.current = null;
      actorRef.current?.releasePointerCapture(drag.pointerId);
      const bounds = getBoundsFromWindow(spriteScaleRef.current);
      const clamped = clampToMotionBounds(drag.pos.x, drag.pos.y, bounds);
      currentPosRef.current = clamped;
      fallVelocityRef.current = 0;
      if (clamped.y >= bounds.maxY - 1) {
        currentPosRef.current = { x: clamped.x, y: bounds.maxY };
        movementStateRef.current = "floor-walking";
      } else if (clamped.y <= bounds.minY + 1) {
        currentPosRef.current = { x: clamped.x, y: bounds.minY };
        movementStateRef.current = "ceiling-walking";
      } else if (clamped.x <= bounds.minX + 1) {
        currentPosRef.current = { x: bounds.minX, y: clamped.y };
        movementStateRef.current = "wall-climbing";
        wallSideRef.current = "left";
      } else if (clamped.x >= bounds.maxX - 1) {
        currentPosRef.current = { x: bounds.maxX, y: clamped.y };
        movementStateRef.current = "wall-climbing";
        wallSideRef.current = "right";
      } else {
        movementStateRef.current = "falling";
      }
      phaseRef.current = "auto";
      wanderPauseRef.current.nextPauseAt = 0;
      wanderPauseRef.current.pauseUntil = 0;
      wanderPauseRef.current.lastMovementState = null;
      if (wasDragging) triggerJumpBurst();
      event.preventDefault();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  // Initialize position on mount
  useEffect(() => {
    const initPosition = () => {
      if (typeof window === "undefined") return;
      const bounds = getBoundsFromWindow(spriteScaleRef.current);
      const span = Math.max(0, bounds.maxX - bounds.minX);
      const startX = bounds.minX + Math.random() * span;
      const startY = FALL_START_Y;
      currentPosRef.current = { x: startX, y: startY };
      movementStateRef.current = "falling";
      fallVelocityRef.current = 0;
      floorDirRef.current = Math.random() < 0.5 ? -1 : 1;
      ceilingDirRef.current = floorDirRef.current;
      wanderPauseRef.current.nextPauseAt = 0;
      wanderPauseRef.current.pauseUntil = 0;
      wanderPauseRef.current.lastMovementState = null;
      isInitializedRef.current = true;
      
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate3d(${Math.round(startX)}px, ${Math.round(startY)}px, 0)`;
      }
    };
    
    // Initialize immediately and after a short delay to handle hydration
    initPosition();
    const timer = setTimeout(initPosition, 50);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastT = 0;
    let lastFrameT = 0;
    let frameIdx = 0;
    let lastAnimState: MascotState | "held" | "chat-using-computer" | "chat-idle" | null = null;

    const tick = (time: number) => {
      if (!wrapRef.current || !isInitializedRef.current) {
        raf = requestAnimationFrame(tick);
        lastT = time;
        return;
      }
      if (!lastT) {
        lastT = time;
      }
      const dt = Math.min(0.05, (time - lastT) / 1000);
      lastT = time;

      const bounds = getBoundsFromWindow(spriteScaleRef.current);
      const phase = phaseRef.current;
      let targetPos = currentPosRef.current;

      const updateBubblePosition = (mascotPos: { x: number; y: number }) => {
        if (!openRef.current || !bubbleRef.current || bubbleIsResizingRef.current) return;
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        const margin = 8;
        const gap = CHAT_GAP;
        const bubbleEl = bubbleRef.current;
        const bubbleWidth = Math.min(bubbleEl.offsetWidth || 340, viewportWidth - margin * 2);
        const bubbleHeight = bubbleEl.offsetHeight || 320;
        const isMobile = viewportWidth < MOBILE_BREAKPOINT;
        const nearestEdge = getNearestEdge(bounds, mascotPos.x, mascotPos.y);
        const centerX = mascotPos.x + SPRITE_SIZE / 2;
        const centerY = mascotPos.y + SPRITE_SIZE / 2;

        let left = centerX - bubbleWidth / 2;
        let top = mascotPos.y - bubbleHeight - gap;

        if (isMobile) {
          left = (viewportWidth - bubbleWidth) / 2;
          top = viewportHeight - bubbleHeight - margin;
        } else if (nearestEdge === "top") {
          top = mascotPos.y + SPRITE_SIZE + gap;
        } else if (nearestEdge === "left") {
          left = mascotPos.x + SPRITE_SIZE + gap;
          top = centerY - bubbleHeight / 2;
        } else if (nearestEdge === "right") {
          left = mascotPos.x - bubbleWidth - gap;
          top = centerY - bubbleHeight / 2;
        }

        left = clamp(left, margin, viewportWidth - bubbleWidth - margin);
        top = clamp(top, margin, viewportHeight - bubbleHeight - margin);

        const prev = bubbleRectRef.current;
        if (Math.abs(prev.left - left) > 0.5 || Math.abs(prev.top - top) > 0.5) {
          bubbleRectRef.current = { left, top };
          bubbleEl.style.left = `${Math.round(left)}px`;
          bubbleEl.style.top = `${Math.round(top)}px`;
        }
      };

      if (phase === "held" && dragStateRef.current) {
        const next = clampToMotionBounds(dragStateRef.current.pos.x, dragStateRef.current.pos.y, bounds);
        targetPos = next;
        imgRef.current?.setAttribute("src", frames.stand);
        lastAnimState = "held";
      } else if (openRef.current) {
        const openPos = { ...currentPosRef.current };
        const { width: viewportWidth, height: viewportHeight } = getViewportSize();
        if (viewportWidth < MOBILE_BREAKPOINT) {
          const bubbleHeight = bubbleRef.current?.offsetHeight || 320;
          const bubbleTop = viewportHeight - bubbleHeight - 8;
          openPos.x = clamp(viewportWidth / 2 - SPRITE_SIZE / 2, bounds.minX, bounds.maxX);
          openPos.y = clamp(bubbleTop - SPRITE_SIZE - CHAT_GAP, bounds.minY, bounds.maxY);
        }
        targetPos = openPos;
        if (movementStateRef.current === "floor-walking") {
          const animState = "chat-using-computer";
          const activeFrames = frames.usingComputer;
          if (lastAnimState !== animState) {
            frameIdx = 0;
            lastFrameT = time;
            imgRef.current?.setAttribute("src", activeFrames[frameIdx]);
          } else if (time - lastFrameT > 220) {
            lastFrameT = time;
            frameIdx = (frameIdx + 1) % activeFrames.length;
            imgRef.current?.setAttribute("src", activeFrames[frameIdx]);
          }
          lastAnimState = animState;
        } else {
          imgRef.current?.setAttribute("src", frames.stand);
          lastAnimState = "chat-idle";
        }
      } else {
        const state = movementStateRef.current;
        const next = { ...targetPos };
        const pauseState = wanderPauseRef.current;
        const canPauseWhileWalking = state === "floor-walking" || state === "ceiling-walking";
        if (pauseState.lastMovementState !== state) {
          pauseState.lastMovementState = state;
          pauseState.pauseUntil = 0;
          pauseState.nextPauseAt = canPauseWhileWalking
            ? time + WALK_SEGMENT_MIN_MS + Math.random() * (WALK_SEGMENT_MAX_MS - WALK_SEGMENT_MIN_MS)
            : 0;
        }
        if (
          canPauseWhileWalking &&
          pauseState.pauseUntil <= time &&
          pauseState.nextPauseAt > 0 &&
          time >= pauseState.nextPauseAt
        ) {
          pauseState.pauseUntil = time + WALK_PAUSE_MIN_MS + Math.random() * (WALK_PAUSE_MAX_MS - WALK_PAUSE_MIN_MS);
          pauseState.nextPauseAt =
            pauseState.pauseUntil + WALK_SEGMENT_MIN_MS + Math.random() * (WALK_SEGMENT_MAX_MS - WALK_SEGMENT_MIN_MS);
          if (Math.random() < WALK_PAUSE_REVERSE_CHANCE) {
            if (state === "floor-walking") {
              floorDirRef.current = floorDirRef.current === 1 ? -1 : 1;
            } else {
              ceilingDirRef.current = ceilingDirRef.current === 1 ? -1 : 1;
            }
          }
        }
        const isWalkPaused = canPauseWhileWalking && pauseState.pauseUntil > time;

        if (state === "falling") {
          fallVelocityRef.current += GRAVITY * dt;
          next.y += fallVelocityRef.current * dt;
          next.x = clamp(next.x, bounds.minX, bounds.maxX);
          if (next.y >= bounds.maxY) {
            next.y = bounds.maxY;
            fallVelocityRef.current = 0;
            movementStateRef.current = "floor-walking";
            floorDirRef.current = Math.random() < 0.5 ? -1 : 1;
          }
        } else if (state === "floor-walking") {
          next.y = bounds.maxY;
          if (!isWalkPaused) {
            next.x += floorDirRef.current * WALK_SPEED * dt;
          }
          if (next.x <= bounds.minX) {
            next.x = bounds.minX;
            wallSideRef.current = "left";
            movementStateRef.current = "wall-climbing";
          } else if (next.x >= bounds.maxX) {
            next.x = bounds.maxX;
            wallSideRef.current = "right";
            movementStateRef.current = "wall-climbing";
          }
        } else if (state === "wall-climbing") {
          next.x = wallSideRef.current === "left" ? bounds.minX : bounds.maxX;
          next.y -= CLIMB_SPEED * dt;
          if (next.y <= bounds.minY) {
            next.y = bounds.minY;
            movementStateRef.current = "ceiling-walking";
            ceilingDirRef.current = wallSideRef.current === "left" ? 1 : -1;
          }
        } else {
          next.y = bounds.minY;
          if (!isWalkPaused) {
            next.x += ceilingDirRef.current * WALK_SPEED * dt;
          }
          if (next.x <= bounds.minX) {
            next.x = bounds.minX;
            ceilingDirRef.current = 1;
          } else if (next.x >= bounds.maxX) {
            next.x = bounds.maxX;
            ceilingDirRef.current = -1;
          }
        }

        targetPos = clampToMotionBounds(next.x, next.y, bounds);

        const animState = movementStateRef.current;
        if (animState === "falling") {
          frameIdx = 0;
          imgRef.current?.setAttribute("src", frames.stand);
        } else {
          const isPausedLocomotion =
            (animState === "floor-walking" || animState === "ceiling-walking") &&
            wanderPauseRef.current.pauseUntil > time;
          const activeFrames =
            animState === "floor-walking"
              ? frames.walk
              : animState === "wall-climbing"
                ? frames.wallClimb
                : frames.ceilingWalk;
          if (isPausedLocomotion) {
            frameIdx = 0;
            lastFrameT = time;
            imgRef.current?.setAttribute("src", animState === "floor-walking" ? frames.stand : frames.ceilingWalk[0]);
          } else if (lastAnimState !== animState) {
            frameIdx = 0;
            lastFrameT = time;
            imgRef.current?.setAttribute("src", activeFrames[frameIdx]);
          } else if (time - lastFrameT > 170) {
            lastFrameT = time;
            frameIdx = (frameIdx + 1) % activeFrames.length;
            imgRef.current?.setAttribute("src", activeFrames[frameIdx]);
          }
        }
        lastAnimState = animState;
      }

      const renderX = clamp(Math.round(targetPos.x), Math.ceil(bounds.minX), Math.floor(bounds.maxX));
      const renderY = clamp(Math.round(targetPos.y), Math.ceil(FALL_START_Y), Math.floor(bounds.maxY));
      wrapRef.current.style.transform = `translate3d(${renderX}px, ${renderY}px, 0)`;
      currentPosRef.current = targetPos;
      updateBubblePosition(targetPos);

      const state = movementStateRef.current;
      const scaleX =
        state === "floor-walking"
          ? floorDirRef.current === 1
            ? -1
            : 1
          : state === "ceiling-walking"
            ? ceilingDirRef.current === 1
              ? -1
              : 1
            : state === "wall-climbing"
              ? wallSideRef.current === "left"
                ? 1
                : -1
              : wallSideRef.current === "left"
              ? 1
              : -1;
      imgRef.current?.style.setProperty("transform", `scaleX(${scaleX})`);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [frames.ceilingWalk, frames.stand, frames.usingComputer, frames.walk, frames.wallClimb]);

  useEffect(() => {
    if (!config.enabled) {
      setOpen(false);
    }
  }, [config.enabled]);

  const selectedCharacter = catalog?.characters.find((entry) => entry.key === config.character);
  const selectedPersonality = catalog?.personalities.find((entry) => entry.key === config.personality);
  const providerLabel =
    config.provider === "site"
      ? isSpanish
        ? "Créditos del sitio"
        : "Site credits"
      : config.provider === "openrouter"
        ? "OpenRouter"
        : config.provider === "ollama"
          ? "Ollama"
          : "OpenClaw";
  const siteCreditsExhausted = config.provider === "site" && (freeSiteMessagesRemaining ?? 0) <= 0;
  const canAutoFallbackToSiteCredits =
    config.provider === "openrouter" &&
    !config.openrouterApiKey.trim() &&
    (freeSiteMessagesRemaining ?? 0) > 0;
  const bubbleStyleClass =
    config.chatBubbleStyle === "dark"
      ? styles.chatStyleDark
      : config.chatBubbleStyle === "solid"
        ? styles.chatStyleSolid
        : styles.chatStyleGlass;
  const bubbleWidthPx = config.chatWidthPx ?? SITE_SHIMEJI_CHAT_WIDTH_MAP[config.chatWidth];
  const bubbleHeightPx = config.chatHeightPx ?? SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX;
  const bubbleFontSizePx = SITE_SHIMEJI_CHAT_FONT_SIZE_MAP[config.chatFontSize];
  const bubbleInlineStyle = {
    left: bubbleRectRef.current.left,
    top: bubbleRectRef.current.top,
    cursor: bubbleCursor || undefined,
    ["--chat-theme" as const]: config.chatThemeColor,
    ["--chat-bg" as const]: config.chatBgColor,
    ["--chat-width" as const]: `${bubbleWidthPx}px`,
    ["--chat-height" as const]: `${bubbleHeightPx}px`,
    ["--chat-font-size" as const]: `${bubbleFontSizePx}px`,
  } as CSSProperties;
  const browserVoiceEnabled =
    config.soundOutputProvider !== "off" && config.soundOutputAutoSpeak;

  function setVoiceInfoStatus(message: string) {
    setVoiceStatusTone("info");
    setVoiceStatus(message);
  }

  function cycleChatThemeQuick() {
    const currentIndex = SITE_SHIMEJI_CHAT_THEMES.findIndex(
      (theme) =>
        theme.theme.toLowerCase() === config.chatThemeColor.toLowerCase() &&
        theme.bg.toLowerCase() === config.chatBgColor.toLowerCase() &&
        theme.bubble === config.chatBubbleStyle,
    );
    const nextTheme =
      currentIndex >= 0
        ? SITE_SHIMEJI_CHAT_THEMES[(currentIndex + 1) % SITE_SHIMEJI_CHAT_THEMES.length]
        : pickRandomSiteShimejiChatTheme();
    updateConfig({
      chatThemePreset: nextTheme.id,
      chatThemeColor: nextTheme.theme,
      chatBgColor: nextTheme.bg,
      chatBubbleStyle: nextTheme.bubble,
    });
  }

  function setVoiceErrorStatus(message: string) {
    setVoiceStatusTone("error");
    setVoiceStatus(message);
  }

  function revokeAudioObjectUrl() {
    if (!audioObjectUrlRef.current) return;
    URL.revokeObjectURL(audioObjectUrlRef.current);
    audioObjectUrlRef.current = null;
  }

  function stopVoiceOutput() {
    ttsRequestSeqRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // no-op
      }
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // no-op
      }
      audioRef.current.src = "";
      audioRef.current = null;
    }
    revokeAudioObjectUrl();
    setIsSpeaking(false);
  }

  function stopVoiceInput() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort?.();
        } catch {
          // no-op
        }
      }
    }
    setIsListening(false);
  }

  async function speakReply(replyText: string) {
    const text = replyText.trim().slice(0, 1200);
    if (!text) return;
    if (!config.soundOutputAutoSpeak || config.soundOutputProvider === "off") return;

    stopVoiceOutput();
    const requestSeq = ttsRequestSeqRef.current;
    const volume = clamp(config.soundOutputVolumePercent / 100, 0, 1);

    if (config.soundOutputProvider === "browser") {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        typeof (window as any).SpeechSynthesisUtterance !== "function"
      ) {
        setVoiceErrorStatus(
          isSpanish
            ? "Tu navegador no soporta síntesis de voz."
            : "Your browser does not support speech synthesis.",
        );
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getSpeechLocale(language);
      utterance.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      const langPrefix = language === "es" ? "es" : "en";
      const selectedBrowserVoice = config.soundOutputBrowserVoiceName
        ? voices.find((voice) => String(voice.name || "") === config.soundOutputBrowserVoiceName)
        : null;
      const preferredVoice = selectedBrowserVoice ?? voices.find((voice) =>
        String(voice.lang || "")
          .toLowerCase()
          .startsWith(langPrefix),
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsSpeaking(true);
        setVoiceInfoStatus(isSpanish ? "Reproduciendo respuesta..." : "Playing response...");
      };
      utterance.onend = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsSpeaking(false);
        setVoiceErrorStatus(
          isSpanish ? "No se pudo reproducir la voz del navegador." : "Could not play browser voice.",
        );
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        setVoiceErrorStatus(
          isSpanish ? "No se pudo iniciar la voz del navegador." : "Could not start browser voice.",
        );
      }
      return;
    }

    if (!config.elevenlabsApiKey.trim()) {
      setVoiceErrorStatus(
        isSpanish
          ? "Falta la API key de ElevenLabs en la pestaña de Sonido."
          : "Missing ElevenLabs API key in the Sound tab.",
      );
      return;
    }

    setIsSpeaking(true);
    setVoiceInfoStatus(isSpanish ? "Generando audio con ElevenLabs..." : "Generating ElevenLabs audio...");

    try {
      const response = await fetch("/api/site-shimeji/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "elevenlabs",
          text,
          elevenlabsApiKey: config.elevenlabsApiKey,
          voiceId: config.elevenlabsVoiceId,
          modelId: config.elevenlabsModelId,
        }),
      });

      if (requestSeq !== ttsRequestSeqRef.current) return;

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const detail =
          typeof errorPayload?.error === "string"
            ? errorPayload.error
            : typeof errorPayload?.details === "string"
              ? errorPayload.details
              : `HTTP ${response.status}`;
        throw new Error(detail);
      }

      const audioBlob = await response.blob();
      if (requestSeq !== ttsRequestSeqRef.current) return;
      if (!audioBlob.size) {
        throw new Error("EMPTY_AUDIO");
      }

      revokeAudioObjectUrl();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioObjectUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = volume;
      audio.onended = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsSpeaking(false);
        revokeAudioObjectUrl();
      };
      audio.onerror = () => {
        if (requestSeq !== ttsRequestSeqRef.current) return;
        setIsSpeaking(false);
        setVoiceErrorStatus(
          isSpanish ? "No se pudo reproducir el audio de ElevenLabs." : "Could not play ElevenLabs audio.",
        );
      };

      await audio.play();
      if (requestSeq !== ttsRequestSeqRef.current) return;
      setVoiceInfoStatus(isSpanish ? "Reproduciendo respuesta..." : "Playing response...");
    } catch {
      if (requestSeq !== ttsRequestSeqRef.current) return;
      setIsSpeaking(false);
      setVoiceErrorStatus(
        isSpanish
          ? "Error al generar voz con ElevenLabs. Revisá la key, Voice ID o el modelo."
          : "Failed to generate ElevenLabs voice. Check the key, Voice ID, or model.",
      );
    }
  }

  useEffect(() => {
    if (!open) {
      stopVoiceInput();
      stopVoiceOutput();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopVoiceInput();
      stopVoiceOutput();
    };
  }, []);

  function getBubbleResizeHit(clientX: number, clientY: number) {
    const bubbleEl = bubbleRef.current;
    if (!bubbleEl) {
      return { canResize: false, cursor: "" as BubbleResizeCursor, left: false, right: false, top: false };
    }
    const { width: viewportWidth } = getViewportSize();
    if (viewportWidth < MOBILE_BREAKPOINT) {
      return { canResize: false, cursor: "" as BubbleResizeCursor, left: false, right: false, top: false };
    }
    const rect = bubbleEl.getBoundingClientRect();
    const nearLeft = clientX - rect.left <= SITE_SHIMEJI_CHAT_RESIZE_EDGE_PX;
    const nearRight = rect.right - clientX <= SITE_SHIMEJI_CHAT_RESIZE_EDGE_PX;
    const nearTop = clientY - rect.top <= SITE_SHIMEJI_CHAT_RESIZE_EDGE_PX;

    let cursor: BubbleResizeCursor = "";
    if (nearLeft && nearTop) {
      cursor = "nw-resize";
    } else if (nearRight && nearTop) {
      cursor = "ne-resize";
    } else if (nearLeft) {
      cursor = "w-resize";
    } else if (nearRight) {
      cursor = "e-resize";
    } else if (nearTop) {
      cursor = "n-resize";
    }

    return {
      canResize: Boolean(nearLeft || nearRight || nearTop),
      cursor,
      left: nearLeft,
      right: nearRight,
      top: nearTop,
    };
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = bubbleResizeStateRef.current;
      const bubbleEl = bubbleRef.current;
      if (!resizeState || !bubbleEl) return;

      const dx = event.clientX - resizeState.startX;
      const dy = event.clientY - resizeState.startY;
      const { width: viewportWidth, height: viewportHeight } = getViewportSize();

      let nextWidth = resizeState.startWidth;
      let nextHeight = resizeState.startHeight;
      let nextLeft = resizeState.startLeft;
      let nextTop = resizeState.startTop;

      if (resizeState.right) {
        nextWidth = resizeState.startWidth + dx;
      }
      if (resizeState.left) {
        nextWidth = resizeState.startWidth - dx;
        nextLeft = resizeState.startLeft + dx;
      }
      if (resizeState.top) {
        nextHeight = resizeState.startHeight - dy;
        nextTop = resizeState.startTop + dy;
      }

      nextWidth = Math.max(SITE_SHIMEJI_CHAT_MIN_WIDTH_PX, nextWidth);
      nextHeight = Math.max(SITE_SHIMEJI_CHAT_MIN_HEIGHT_PX, nextHeight);

      nextLeft = clamp(nextLeft, 0, Math.max(0, viewportWidth - nextWidth));
      nextTop = clamp(nextTop, 0, Math.max(0, viewportHeight - nextHeight));

      bubbleEl.style.setProperty("--chat-width", `${Math.round(nextWidth)}px`);
      bubbleEl.style.setProperty("--chat-height", `${Math.round(nextHeight)}px`);
      bubbleEl.style.left = `${Math.round(nextLeft)}px`;
      bubbleEl.style.top = `${Math.round(nextTop)}px`;
      bubbleRectRef.current = { left: nextLeft, top: nextTop };

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const stopResize = (event?: PointerEvent) => {
      const resizeState = bubbleResizeStateRef.current;
      if (!resizeState) return;
      bubbleResizeStateRef.current = null;
      bubbleIsResizingRef.current = false;
      setBubbleCursor("");
      try {
        bubbleRef.current?.releasePointerCapture?.(resizeState.pointerId);
      } catch {
        // no-op
      }
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (rect) {
        updateConfig({
          chatWidthPx: Math.round(rect.width),
          chatHeightPx: Math.round(rect.height),
        });
      }
      if (event?.cancelable) {
        event.preventDefault();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [updateConfig]);

  function ensureGreeting() {
    setMessages(prev => {
      if (prev.length) return prev;
      const hello = isSpanish
        ? "¡Hola! Soy tu Shimeji. Estoy listo para chatear, ¿sobre qué quieres hablar?"
        : "Hi! I'm your Shimeji. I'm ready to chat, what do you want to talk about?";
      return [{ role: "assistant", content: hello }];
    });
  }

  async function send(inputOverride?: string) {
    const text = (typeof inputOverride === "string" ? inputOverride : input).trim();
    const providerForRequest = canAutoFallbackToSiteCredits ? ("site" as const) : config.provider;
    if (!text || sending) return;

    if (!config.enabled) {
      return;
    }

    if (siteCreditsExhausted) {
      const lockMessage = isSpanish
        ? "Se terminaron los 4 mensajes gratis del sitio. Abrí la configuración del shimeji (engranaje) y configurá tus claves en Chat > Proveedor para seguir chateando."
        : "The 4 free website messages are used up. Open the shimeji settings (gear) and configure your own keys in Chat > Provider to keep chatting.";
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: lockMessage,
          ctaHref: "/help",
          ctaLabel: isSpanish ? "Ver ayuda" : "Open help",
        },
      ]);
      void speakReply(lockMessage);
      return;
    }

    if (!canUseCurrentProvider && !canAutoFallbackToSiteCredits) {
      const configMessage = isSpanish
        ? "Falta configuración para ese proveedor. Abrí la configuración del shimeji (engranaje) y completá los datos en Chat > Proveedor."
        : "That provider is not fully configured yet. Open the shimeji settings (gear) and complete the setup in Chat > Provider.";
      setMessages(prev => [...prev, { role: "assistant", content: configMessage }]);
      void speakReply(configMessage);
      return;
    }

    setInput("");
    setSending(true);

    setMessages(prev => [...prev, { role: "user", content: text }]);

    try {
      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      let reply = "";

      if (providerForRequest === "ollama" || providerForRequest === "openclaw") {
        const shouldApplyPersonality = providerForRequest !== "openclaw";
        const providerMessages = buildSiteShimejiChatMessages({
          message: text,
          history,
          language,
          characterLabel: selectedCharacter?.label,
          personalityLabel: shouldApplyPersonality ? selectedPersonality?.label : undefined,
          personalityPrompt: shouldApplyPersonality ? selectedPersonality?.prompt : undefined,
        });
        reply =
          providerForRequest === "ollama"
            ? await sendOllamaBrowserChat({
                messages: providerMessages,
                ollamaUrl: config.ollamaUrl,
                ollamaModel: config.ollamaModel,
              })
            : await (async () => {
                const relayResponse = await fetch("/api/site-shimeji/openclaw/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionToken: config.openclawPairedSessionToken,
                    messages: providerMessages,
                  }),
                });
                const relayRaw = await relayResponse.text();
                const relayJson = ((): {
                  reply?: string;
                  error?: string;
                  errorDetail?: string;
                  sessionExpiresAt?: string;
                } | null => {
                  if (!relayRaw) return null;
                  try {
                    return JSON.parse(relayRaw) as {
                      reply?: string;
                      error?: string;
                      errorDetail?: string;
                      sessionExpiresAt?: string;
                    };
                  } catch {
                    return null;
                  }
                })();
                const relayErrorCode =
                  typeof relayJson?.error === "string" && relayJson.error.trim()
                    ? relayJson.error.trim() === "OPENCLAW_RELAY_FAILED" &&
                      typeof relayJson?.errorDetail === "string" &&
                      relayJson.errorDetail.trim()
                      ? relayJson.errorDetail.trim().startsWith("OPENCLAW_")
                        ? relayJson.errorDetail.trim()
                        : `OPENCLAW_RELAY_DETAIL:${relayJson.errorDetail.trim().slice(0, 120)}`
                      : relayJson.error.trim()
                    : !relayResponse.ok
                      ? `OPENCLAW_RELAY_HTTP_${relayResponse.status}`
                      : "OPENCLAW_RELAY_FAILED";
                const parsedRelayJson = relayJson as
                  | {
                      reply?: string;
                      error?: string;
                      errorDetail?: string;
                      sessionExpiresAt?: string;
                    }
                  | null;
                if (
                  !relayResponse.ok ||
                  typeof parsedRelayJson?.reply !== "string" ||
                  !parsedRelayJson.reply.trim()
                ) {
                  throw new Error(relayErrorCode);
                }
                if (
                  typeof parsedRelayJson.sessionExpiresAt === "string" &&
                  parsedRelayJson.sessionExpiresAt
                ) {
                  updateConfig({ openclawPairedSessionExpiresAt: parsedRelayJson.sessionExpiresAt });
                }
                return parsedRelayJson.reply.trim();
              })();
      } else {
        const resp = await fetch("/api/shimeji-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
            lang: language,
            provider: providerForRequest,
            providerConfig:
              providerForRequest === "openrouter"
                ? {
                    openrouterApiKey: config.openrouterApiKey,
                    openrouterModel: config.openrouterModel,
                  }
                : undefined,
            character: config.character,
            personality: config.personality,
          }),
        });
        const json = await resp.json().catch(() => null);
        reply = json?.reply;
        if (!resp.ok || typeof reply !== "string" || !reply.trim()) {
          const errorCode = typeof json?.error === "string" ? json.error : "bad-response";
          throw new Error(errorCode);
        }
      }

      if (!reply.trim()) {
        throw new Error("EMPTY_RESPONSE");
      }
      const finalReply = reply.trim();
      setMessages(prev => [...prev, { role: "assistant", content: finalReply }]);
      void speakReply(finalReply);
      if (providerForRequest === "site") {
        incrementFreeSiteMessagesUsed();
      }
    } catch (error) {
      const rawErrorMessage = String((error as Error)?.message || "");
      if (
        providerForRequest === "openclaw" &&
        (rawErrorMessage.startsWith("OPENCLAW_PAIRING_EXPIRED") ||
          rawErrorMessage.startsWith("OPENCLAW_PAIRING_INVALID"))
      ) {
        updateConfig({
          openclawPairedSessionToken: "",
          openclawPairedSessionExpiresAt: "",
        });
      }
      const fallback = formatSiteShimejiProviderError(
        error,
        isSpanish,
        providerForRequest,
      );
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
      void speakReply(fallback);
    } finally {
      setSending(false);
    }
  }

  function toggleVoiceListening() {
    if (config.soundInputProvider === "off") return;

    if (isListening) {
      stopVoiceInput();
      setVoiceInfoStatus(isSpanish ? "Micrófono detenido." : "Microphone stopped.");
      return;
    }

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setVoiceErrorStatus(
        isSpanish
          ? "Tu navegador no soporta reconocimiento de voz (probá Chrome o Edge)."
          : "Your browser does not support speech recognition (try Chrome or Edge).",
      );
      return;
    }

    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = getSpeechLocale(language);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let submitted = false;

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex ?? 0; i < (event.results?.length ?? 0); i += 1) {
        const result = event.results[i];
        const transcript = String(result?.[0]?.transcript || "").trim();
        if (!transcript) continue;
        if (result?.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      if (interimTranscript) {
        setVoiceInfoStatus(
          isSpanish
            ? `Escuchando: ${interimTranscript}`
            : `Listening: ${interimTranscript}`,
        );
      }

      if (!finalTranscript) return;

      setInput(finalTranscript);
      setVoiceInfoStatus(
        config.soundInputAutoSend
          ? isSpanish
            ? "Transcripción lista. Enviando..."
            : "Transcript ready. Sending..."
          : isSpanish
            ? "Transcripción lista."
            : "Transcript ready.",
      );

      if (config.soundInputAutoSend && !submitted) {
        submitted = true;
        void send(finalTranscript);
        try {
          recognition.stop();
        } catch {
          // no-op
        }
      }
    };

    recognition.onerror = (event: any) => {
      const code = String(event?.error || "unknown");
      const message =
        code === "not-allowed" || code === "service-not-allowed"
          ? isSpanish
            ? "Permiso de micrófono denegado."
            : "Microphone permission denied."
          : code === "no-speech"
            ? isSpanish
              ? "No se detectó voz."
              : "No speech detected."
            : isSpanish
              ? "Error de reconocimiento de voz."
              : "Speech recognition error.";
      setVoiceErrorStatus(message);
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setIsListening(false);
      if (!finalTranscript && !voiceStatus) {
        setVoiceInfoStatus(isSpanish ? "Micrófono detenido." : "Microphone stopped.");
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      setVoiceInfoStatus(isSpanish ? "Escuchando..." : "Listening...");
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceErrorStatus(
        isSpanish ? "No se pudo iniciar el micrófono." : "Could not start the microphone.",
      );
    }
  }

  function handleBubblePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (bubbleIsResizingRef.current) return;
    const hit = getBubbleResizeHit(event.clientX, event.clientY);
    setBubbleCursor(hit.cursor);
  }

  function handleBubblePointerLeave() {
    if (bubbleIsResizingRef.current) return;
    setBubbleCursor("");
  }

  function handleBubblePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, button, textarea, select, a")) return;

    const hit = getBubbleResizeHit(event.clientX, event.clientY);
    if (!hit.canResize || !bubbleRef.current) return;

    const rect = bubbleRef.current.getBoundingClientRect();
    bubbleResizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: rect.left,
      startTop: rect.top,
      left: hit.left,
      right: hit.right,
      top: hit.top,
    };
    bubbleIsResizingRef.current = true;
    setBubbleCursor(hit.cursor);
    try {
      bubbleRef.current.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
    event.stopPropagation();
    event.preventDefault();
  }

  const showPressMeHint = config.enabled && !hasMascotBeenClicked && !open;
  const inputLocked = sending || !config.enabled || siteCreditsExhausted;
  const placeholderText = !config.enabled
    ? isSpanish
      ? "El Shimeji web está desactivado en la configuración."
      : "Website shimeji is disabled in settings."
    : siteCreditsExhausted
      ? isSpanish
        ? "Sin créditos del sitio. Usá el engranaje y configurá tus claves en Chat > Proveedor."
        : "Site credits are exhausted. Use the gear and configure your keys in Chat > Provider."
      : isSpanish
        ? "Preguntame sobre Shimeji AI Pets..."
        : "Ask about Shimeji AI Pets...";
  const showMicButton = config.soundInputProvider !== "off";
  const canUseMicButton = !inputLocked && config.soundInputProvider !== "off";

  if (!config.enabled) {
    return null;
  }

  return (
    <>
      <div className={styles.wrap} ref={wrapRef} aria-hidden={false}>
        <div
          ref={actorRef}
          className={styles.actor}
          style={{
            transform: `scale(${config.sizePercent / 100})`,
            transformOrigin: "center center",
          }}
          onClick={() => {
            if (blockClickRef.current) {
              blockClickRef.current = false;
              return;
            }
            setHasMascotBeenClicked(true);
            setOpen(v => {
              const next = !v;
              if (next) ensureGreeting();
              return next;
            });
          }}
          onPointerDown={handlePointerDown}
          role="button"
          tabIndex={0}
          title={isSpanish ? "Hablá con Shimeji" : "Talk to Shimeji"}
        >
          {showPressMeHint && (
            <div className={styles.pressHint}>
              {isSpanish ? "🐱 Clickeame" : MASCOT_HINT_TEXT}
            </div>
          )}
          <img className={styles.sprite} src={frames.stand} alt="" ref={imgRef} draggable={false} />
          {isJumping && (
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-1/4 left-0 text-xl animate-ping">✦</span>
              <span className="absolute top-1/3 right-0 text-lg animate-ping animation-delay-100">✦</span>
              <span className="absolute bottom-1/3 left-1/4 text-sm animate-ping animation-delay-200">✦</span>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div
          ref={bubbleRef}
          className={`${styles.bubble} ${styles.bubbleFixed} ${bubbleStyleClass}`}
          style={bubbleInlineStyle}
          onClick={e => e.stopPropagation()}
          onPointerMove={handleBubblePointerMove}
          onPointerLeave={handleBubblePointerLeave}
          onPointerDown={handleBubblePointerDown}
        >
          <div className={styles.bubbleHeader}>
            <div className={styles.titleWrap}>
              <div className={styles.title}>
                {selectedCharacter?.label || "Shimeji"} ·{" "}
                {getSiteShimejiPersonalityDisplayLabel(selectedPersonality, isSpanish) || "Cozy"}
              </div>
              <div className={styles.metaText}>{providerLabel}</div>
            </div>
            <div className={styles.headerBtns}>
              <button
                className={`${styles.headerIconBtn} ${browserVoiceEnabled ? styles.headerIconBtnActive : ""}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (config.soundOutputProvider === "off") {
                    openConfig();
                    return;
                  }
                  updateConfig({ soundOutputAutoSpeak: !config.soundOutputAutoSpeak });
                }}
                title={
                  config.soundOutputProvider === "off"
                    ? isSpanish
                      ? "Configurar voz"
                      : "Configure voice"
                    : browserVoiceEnabled
                      ? isSpanish
                        ? "Voz activada"
                        : "Voice on"
                      : isSpanish
                        ? "Voz desactivada"
                        : "Voice off"
                }
                aria-label={isSpanish ? "Opciones de voz" : "Voice options"}
              >
                {browserVoiceEnabled ? "🔊" : "🔇"}
              </button>
              <button
                className={styles.headerIconBtn}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleChatThemeQuick();
                }}
                title={isSpanish ? "Cambiar tema del chat" : "Change chat theme"}
                aria-label={isSpanish ? "Cambiar tema del chat" : "Change chat theme"}
              >
                🎨
              </button>
              <button
                className={styles.headerIconBtn}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openConfig();
                }}
                title={isSpanish ? "Abrir configuración del shimeji" : "Open shimeji settings"}
                aria-label={isSpanish ? "Abrir configuración" : "Open settings"}
              >
                ⚙
              </button>
              <button
                className={styles.closeBtn}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.bubbleBody}>
          <div className={styles.messages} ref={messagesListRef}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgAssistant}`}
                >
                  {m.content}
                  {m.ctaHref && (
                    <>
                      <br />
                      <a className={styles.msgLink} href={m.ctaHref}>
                        {m.ctaLabel ?? m.ctaHref}
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.inputRow}>
              {showMicButton && (
                <button
                  className={`${styles.iconBtn} ${isListening ? styles.iconBtnActive : ""}`}
                  type="button"
                  onClick={toggleVoiceListening}
                  disabled={!canUseMicButton}
                  aria-label={
                    isListening
                      ? isSpanish
                        ? "Detener micrófono"
                        : "Stop microphone"
                      : isSpanish
                        ? "Hablar por micrófono"
                        : "Speak with microphone"
                  }
                  title={
                    !speechInputSupported
                      ? isSpanish
                        ? "Tu navegador no soporta reconocimiento de voz"
                        : "Your browser does not support speech recognition"
                      : isListening
                        ? isSpanish
                          ? "Detener"
                          : "Stop"
                        : isSpanish
                          ? "Hablar"
                          : "Talk"
                  }
                >
                  {isListening ? "■" : "🎤"}
                </button>
              )}
              <input
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") void send();
                }}
                placeholder={placeholderText}
                disabled={inputLocked}
              />
              {isSpeaking && (
                <button
                  className={styles.iconBtn}
                  type="button"
                  onClick={stopVoiceOutput}
                  aria-label={isSpanish ? "Detener audio" : "Stop audio"}
                  title={isSpanish ? "Detener audio" : "Stop audio"}
                >
                  ⏹
                </button>
              )}
              <button
                className={styles.sendBtn}
                type="button"
                onClick={() => {
                  void send();
                }}
                disabled={inputLocked || !input.trim()}
                aria-label={isSpanish ? "Enviar mensaje" : "Send message"}
                title={isSpanish ? "Enviar mensaje" : "Send message"}
              >
                {sending ? (
                  "..."
                ) : (
                  <svg
                    className={styles.sendIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M21.5 3.5L10 15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21.5 3.5L14.5 21L10 15L3 10.5L21.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
            {voiceStatus && (
              <div
                className={`${styles.voiceStatus} ${
                  voiceStatusTone === "error" ? styles.voiceStatusError : ""
                }`}
              >
                {voiceStatus}
              </div>
            )}
          </div>
          <div className={styles.resizeGripLeft} aria-hidden="true" />
          <div className={styles.resizeGripRight} aria-hidden="true" />
          <div className={styles.resizeGripTop} aria-hidden="true" />
          <div className={styles.resizeCorner} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
