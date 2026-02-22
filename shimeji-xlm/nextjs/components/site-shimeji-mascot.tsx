"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";
import { buildSiteShimejiChatMessages } from "@/lib/site-shimeji-chat";
import {
  formatSiteShimejiProviderError,
  sendOllamaBrowserChat,
  sendOpenClawBrowserChat,
} from "@/lib/site-shimeji-browser-providers";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string; ctaHref?: string; ctaLabel?: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
const MASCOT_HINT_TEXT = "🐱 Press me";

type Edge = "bottom" | "right" | "top" | "left";
type MascotState = "falling" | "floor-walking" | "wall-climbing" | "ceiling-walking";
type WallSide = "left" | "right";

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  pos: { x: number; y: number };
};

function getBoundsFromWindow() {
  const minX = EDGE_MARGIN;
  const minY = EDGE_MARGIN;
  // Use visualViewport for mobile to account for address bar
  const vw = (window as any).visualViewport;
  const winWidth = vw?.width || window.innerWidth;
  const winHeight = vw?.height || window.innerHeight;
  const maxX = Math.max(minX, winWidth - SPRITE_SIZE - EDGE_MARGIN);
  const maxY = Math.max(minY, winHeight - SPRITE_SIZE - EDGE_MARGIN);
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

  const currentPosRef = useRef({ x: 0, y: 0 });
  const movementStateRef = useRef<MascotState>("falling");
  const wallSideRef = useRef<WallSide>("right");
  const floorDirRef = useRef<1 | -1>(Math.random() < 0.5 ? -1 : 1);
  const ceilingDirRef = useRef<1 | -1>(1);
  const fallVelocityRef = useRef(0);
  const phaseRef = useRef<"auto" | "held">("auto");
  const dragStateRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const blockClickRef = useRef(false);
  const jumpTimeoutRef = useRef<number | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const bubbleRectRef = useRef({ left: 8, top: 8 });

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
    phaseRef.current = "held";
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const bounds = getBoundsFromWindow();
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
      const bounds = getBoundsFromWindow();
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
      const bounds = getBoundsFromWindow();
      const span = Math.max(0, bounds.maxX - bounds.minX);
      const startX = bounds.minX + Math.random() * span;
      const startY = FALL_START_Y;
      currentPosRef.current = { x: startX, y: startY };
      movementStateRef.current = "falling";
      fallVelocityRef.current = 0;
      floorDirRef.current = Math.random() < 0.5 ? -1 : 1;
      ceilingDirRef.current = floorDirRef.current;
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

      const bounds = getBoundsFromWindow();
      const phase = phaseRef.current;
      let targetPos = currentPosRef.current;

      const updateBubblePosition = (mascotPos: { x: number; y: number }) => {
        if (!openRef.current || !bubbleRef.current) return;
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
          next.x += floorDirRef.current * WALK_SPEED * dt;
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
          next.x += ceilingDirRef.current * WALK_SPEED * dt;
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
          const activeFrames =
            animState === "floor-walking"
              ? frames.walk
              : animState === "wall-climbing"
                ? frames.wallClimb
                : frames.ceilingWalk;
          if (lastAnimState !== animState) {
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

      wrapRef.current.style.transform = `translate3d(${Math.round(targetPos.x)}px, ${Math.round(
        targetPos.y,
      )}px, 0)`;
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

  function ensureGreeting() {
    setMessages(prev => {
      if (prev.length) return prev;
      const hello = isSpanish
        ? "¡Hola! Soy tu Shimeji. Estoy listo para chatear, ¿sobre qué quieres hablar?"
        : "Hi! I'm your Shimeji. I'm ready to chat, what do you want to talk about?";
      return [{ role: "assistant", content: hello }];
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    if (!config.enabled) {
      return;
    }

    if (siteCreditsExhausted) {
      const lockMessage = isSpanish
        ? "Se terminaron los créditos gratis del sitio. Configurá un proveedor (OpenRouter, Ollama u OpenClaw) en la sección de proveedor de la página principal para seguir chateando."
        : "Website free credits are exhausted. Set up a provider (OpenRouter, Ollama, or OpenClaw) in the provider section on the homepage to keep chatting.";
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: lockMessage,
          ctaHref: "/help",
          ctaLabel: isSpanish ? "Ver ayuda" : "Open help",
        },
      ]);
      return;
    }

    if (!canUseCurrentProvider) {
      const configMessage = isSpanish
        ? "Falta configuración para ese proveedor. Completá los datos en la sección de proveedor de la página principal."
        : "That provider is not fully configured yet. Complete the setup in the provider section on the homepage.";
      setMessages(prev => [...prev, { role: "assistant", content: configMessage }]);
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

      if (config.provider === "ollama" || config.provider === "openclaw") {
        const providerMessages = buildSiteShimejiChatMessages({
          message: text,
          history,
          language,
          characterLabel: selectedCharacter?.label,
          personalityLabel: selectedPersonality?.label,
          personalityPrompt: selectedPersonality?.prompt,
        });
        reply =
          config.provider === "ollama"
            ? await sendOllamaBrowserChat({
                messages: providerMessages,
                ollamaUrl: config.ollamaUrl,
                ollamaModel: config.ollamaModel,
              })
            : await sendOpenClawBrowserChat({
                messages: providerMessages,
                gatewayUrl: config.openclawGatewayUrl,
                gatewayToken: config.openclawGatewayToken,
                agentName: config.openclawAgentName,
              });
      } else {
        const resp = await fetch("/api/shimeji-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
            lang: language,
            provider: config.provider,
            providerConfig:
              config.provider === "openrouter"
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
      setMessages(prev => [...prev, { role: "assistant", content: reply.trim() }]);
      if (config.provider === "site") {
        incrementFreeSiteMessagesUsed();
      }
    } catch (error) {
      const fallback = formatSiteShimejiProviderError(
        error,
        isSpanish,
        config.provider,
      );
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setSending(false);
    }
  }

  const showPressMeHint = config.enabled && !hasMascotBeenClicked && !open;
  const inputLocked = sending || !config.enabled || siteCreditsExhausted;
  const placeholderText = !config.enabled
    ? isSpanish
      ? "El Shimeji web está desactivado en la configuración."
      : "Website shimeji is disabled in settings."
    : siteCreditsExhausted
      ? isSpanish
        ? "Sin créditos del sitio. Usa el engranaje para configurar tu proveedor."
        : "Site credits are exhausted. Use the gear to configure your provider."
      : isSpanish
        ? "Preguntame sobre Shimeji AI Pets..."
        : "Ask about Shimeji AI Pets...";

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
              {isSpanish ? "🐱 Tócame" : MASCOT_HINT_TEXT}
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
          className={`${styles.bubble} ${styles.bubbleFixed}`}
          style={{ left: bubbleRectRef.current.left, top: bubbleRectRef.current.top }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.bubbleHeader}>
            <div>
              <div className={styles.title}>
                {selectedCharacter?.label || "Shimeji"} · {selectedPersonality?.label || "Cozy"}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">{providerLabel}</div>
            </div>
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
              <input
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") send();
                }}
                placeholder={placeholderText}
                disabled={inputLocked}
              />
              <button
                className={styles.sendBtn}
                type="button"
                onClick={send}
                disabled={inputLocked || !input.trim()}
              >
                {isSpanish ? (sending ? "..." : "Enviar") : sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
